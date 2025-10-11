// src/hooks/useAirplanesLiveTracking.ts
'use client';

import { Flight, FlightPosition } from '@/types/flight';
import { useCallback, useEffect, useRef, useState } from 'react';

interface AirplanesLiveTrackingState {
  isActive: boolean;
  lastUpdate: Date | null;
  error: string | null;
  updateCount: number;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
}

interface UseAirplanesLiveTrackingOptions {
  autoStart?: boolean;
  updateInterval?: number;
  onPositionChange?: (position: FlightPosition) => void;
  onTrackingStart?: () => void;
  onTrackingStop?: () => void;
  onError?: (error: string) => void;
  onConnectionChange?: (status: AirplanesLiveTrackingState['connectionStatus']) => void;
}

interface UseAirplanesLiveTrackingReturn {
  currentPosition: FlightPosition | null;
  trackingState: AirplanesLiveTrackingState;
  isTracking: boolean;
  startTracking: () => void;
  stopTracking: () => void;
  toggleTracking: () => void;
  flightHistory: FlightPosition[];
  clearHistory: () => void;
  connectionStatus: AirplanesLiveTrackingState['connectionStatus'];
}

const DEFAULT_OPTIONS: Required<UseAirplanesLiveTrackingOptions> = {
  autoStart: false, // Disabled by default - user must click to start
  updateInterval: 15000, // 15 seconds to reduce API load
  onPositionChange: () => {},
  onTrackingStart: () => {},
  onTrackingStop: () => {},
  onError: () => {},
  onConnectionChange: () => {},
};

const MAX_HISTORY_LENGTH = 100;

// Transform Airplanes.live data to FlightPosition
const transformAirplanesLiveData = (data: any): FlightPosition | null => {
  if (!data || !data.lat || !data.lon) return null;

  return {
    latitude: data.lat,
    longitude: data.lon,
    altitude: data.alt_baro || data.alt_geom || 0,
    speed: data.gs || 0, // ground speed in knots
    heading: data.track || 0,
    timestamp: new Date(),
  };
};

// Extract callsign from flight number for Airplanes.live API
const getCallsignFromFlightNumber = (flightNumber: string): string => {
  // Remove spaces and convert to uppercase
  const clean = flightNumber.replace(/\s+/g, '').toUpperCase();
  
  // If it's already in ICAO format (3 letters + numbers), use as is
  if (/^[A-Z]{3}\d+[A-Z]?$/.test(clean)) {
    return clean;
  }
  
  // Convert IATA to ICAO for common airlines
  const iataToIcao: Record<string, string> = {
    'U2': 'EZY', // easyJet
    'BA': 'BAW', // British Airways
    'FR': 'RYR', // Ryanair
    'EZ': 'EZS', // easyJet Switzerland
  };
  
  // Check if it's IATA format (2 letters + numbers)
  const iataMatch = clean.match(/^([A-Z]{2})(\d+[A-Z]?)$/);
  if (iataMatch) {
    const [, iata, number] = iataMatch;
    const icao = iataToIcao[iata] || iata;
    return `${icao}${number}`;
  }
  
  // Return as-is if no pattern matches
  return clean;
};

export const useAirplanesLiveTracking = (
  flight: Flight | null,
  options: UseAirplanesLiveTrackingOptions = {}
): UseAirplanesLiveTrackingReturn => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // State management
  const [currentPosition, setCurrentPosition] = useState<FlightPosition | null>(
    flight?.currentPosition || null
  );
  const [trackingState, setTrackingState] = useState<AirplanesLiveTrackingState>({
    isActive: false,
    lastUpdate: null,
    error: null,
    updateCount: 0,
    connectionStatus: 'disconnected',
  });
  const [flightHistory, setFlightHistory] = useState<FlightPosition[]>([]);
  
  // Refs for cleanup and state management
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastKnownPositionRef = useRef<FlightPosition | null>(null);
  const interpolatedPositionRef = useRef<FlightPosition | null>(null);
  const isRequestInProgressRef = useRef(false);
  const lastRequestTimeRef = useRef(0);
  const consecutiveErrorsRef = useRef(0);

  // Fetch live position from multiple APIs with fallback
  const fetchLivePosition = useCallback(async (): Promise<FlightPosition | null> => {
    if (!flight?.flightNumber) return null;

    // Prevent multiple concurrent requests
    if (isRequestInProgressRef.current) {
      console.log('Request already in progress, skipping...');
      return null;
    }

    // Rate limiting: don't make requests too frequently
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTimeRef.current;
    const minRequestInterval = 5000; // 5 seconds minimum between requests

    if (timeSinceLastRequest < minRequestInterval) {
      console.log(`Rate limiting: waiting ${minRequestInterval - timeSinceLastRequest}ms before next request`);
      return null;
    }

    // Check if we have too many consecutive errors
    if (consecutiveErrorsRef.current >= 3) {
      const backoffTime = Math.min(30000, consecutiveErrorsRef.current * 5000); // Max 30 seconds backoff
      console.log(`Too many consecutive errors (${consecutiveErrorsRef.current}), backing off for ${backoffTime}ms`);
      
      // Reset error count after backoff
      setTimeout(() => {
        consecutiveErrorsRef.current = 0;
      }, backoffTime);
      
      return null;
    }

    // Set request flags
    isRequestInProgressRef.current = true;
    lastRequestTimeRef.current = now;

    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    const callsign = getCallsignFromFlightNumber(flight.flightNumber);
    console.log(`Fetching live position for ${callsign} from multiple sources...`);

    try {
      // Try Airplanes.live first
      try {
        const position = await fetchFromAirplanesLive(callsign);
        if (position) {
          consecutiveErrorsRef.current = 0; // Reset error count on success
          return position;
        }
      } catch (error) {
        console.log(`Airplanes.live failed:`, error instanceof Error ? error.message : error);
      }

      // Try ADS-B Exchange
      try {
        const position = await fetchFromADSBExchange(callsign);
        if (position) {
          consecutiveErrorsRef.current = 0; // Reset error count on success
          return position;
        }
      } catch (error) {
        console.log(`ADS-B Exchange failed:`, error instanceof Error ? error.message : error);
      }

      // Try OpenSky
      try {
        const position = await fetchFromOpenSky(callsign);
        if (position) {
          consecutiveErrorsRef.current = 0; // Reset error count on success
          return position;
        }
      } catch (error) {
        console.log(`OpenSky failed:`, error instanceof Error ? error.message : error);
      }

      console.log(`No live data found for ${callsign} from any source`);
      consecutiveErrorsRef.current++;
      return null;
    } finally {
      isRequestInProgressRef.current = false;
    }
  }, [flight?.flightNumber]);

  // Fetch from Airplanes.live API
  const fetchFromAirplanesLive = useCallback(async (callsign: string): Promise<FlightPosition | null> => {
    const url = `https://api.airplanes.live/v2/callsign/${encodeURIComponent(callsign)}`;

    console.log(`Trying Airplanes.live for ${callsign}...`);

    const response = await fetch(url, {
      signal: abortControllerRef.current?.signal,
      headers: {
        'User-Agent': 'TrackMyFlight-App/1.0',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`Flight ${callsign} not found in Airplanes.live`);
        return null;
      }
      if (response.status === 429) {
        throw new Error('Rate limited by Airplanes.live API');
      }
      throw new Error(`Airplanes.live API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.ac && Array.isArray(data.ac) && data.ac.length > 0) {
      const aircraftData = data.ac[0];
      const position = transformAirplanesLiveData(aircraftData);
      
      if (position) {
        console.log(`✓ Received live position from Airplanes.live for ${callsign}:`, {
          lat: position.latitude,
          lon: position.longitude,
          alt: position.altitude,
          speed: position.speed,
          heading: position.heading,
        });
        return position;
      }
    }

    console.log(`No position data from Airplanes.live for ${callsign}`);
    return null;
  }, []);

  // Fetch from ADS-B Exchange directly
  const fetchFromADSBExchange = useCallback(async (callsign: string): Promise<FlightPosition | null> => {
    console.log(`Trying ADS-B Exchange for ${callsign}...`);

    try {
      const response = await fetch(`https://api.adsbexchange.com/v2/callsign/${encodeURIComponent(callsign)}`, {
        signal: abortControllerRef.current?.signal,
        headers: {
          'User-Agent': 'TrackMyFlight-App/1.0',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`ADS-B Exchange error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.ac && Array.isArray(data.ac) && data.ac.length > 0) {
        const aircraftData = data.ac[0];
        
        if (aircraftData.lat && aircraftData.lon) {
          const position: FlightPosition = {
            latitude: aircraftData.lat,
            longitude: aircraftData.lon,
            altitude: aircraftData.alt_baro || aircraftData.alt_geom || 0,
            speed: aircraftData.gs || 0,
            heading: aircraftData.track || 0,
            timestamp: new Date(),
          };
          
          console.log(`✓ Received live position from ADS-B Exchange for ${callsign}:`, {
            lat: position.latitude,
            lon: position.longitude,
            alt: position.altitude,
            speed: position.speed,
            heading: position.heading,
          });
          
          return position;
        }
      }

      console.log(`No position data from ADS-B Exchange for ${callsign}`);
      return null;
    } catch (error) {
      console.log(`✗ ADS-B Exchange failed for ${callsign}:`, error instanceof Error ? error.message : error);
      return null;
    }
  }, []);

  // Fetch from OpenSky directly
  const fetchFromOpenSky = useCallback(async (callsign: string): Promise<FlightPosition | null> => {
    console.log(`Trying OpenSky for ${callsign}...`);

    try {
      const response = await fetch(`https://opensky-network.org/api/states/all?callsign=${encodeURIComponent(callsign)}`, {
        signal: abortControllerRef.current?.signal,
        headers: {
          'User-Agent': 'TrackMyFlight-App/1.0',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`OpenSky error: ${response.status}`);
      }

      const data = await response.json();
      const states = Array.isArray(data.states) ? data.states : [];
      
      if (states.length > 0) {
        const state = states[0];
        
        if (state[5] && state[6]) { // longitude and latitude
          const position: FlightPosition = {
            latitude: state[6],
            longitude: state[5],
            altitude: state[7] || 0,
            speed: state[9] ? state[9] * 1.94384 : 0, // m/s to knots
            heading: state[10] || 0,
            timestamp: new Date(),
          };
          
          console.log(`✓ Received live position from OpenSky for ${callsign}:`, {
            lat: position.latitude,
            lon: position.longitude,
            alt: position.altitude,
            speed: position.speed,
            heading: position.heading,
          });
          
          return position;
        }
      }

      console.log(`No position data from OpenSky for ${callsign}`);
      return null;
    } catch (error) {
      console.log(`✗ OpenSky failed for ${callsign}:`, error instanceof Error ? error.message : error);
      return null;
    }
  }, []);

  // Interpolate position between two points
  const interpolatePosition = useCallback((from: FlightPosition, to: FlightPosition, progress: number): FlightPosition => {
    // Calculate distance and bearing between points
    const R = 6371; // Earth's radius in km
    const lat1Rad = (from.latitude * Math.PI) / 180;
    const lat2Rad = (to.latitude * Math.PI) / 180;
    const deltaLatRad = ((to.latitude - from.latitude) * Math.PI) / 180;
    const deltaLonRad = ((to.longitude - from.longitude) * Math.PI) / 180;

    const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(deltaLonRad / 2) * Math.sin(deltaLonRad / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km

    // Simple linear interpolation for demonstration
    // In production, you'd use proper great circle interpolation
    const interpolatedLat = from.latitude + (to.latitude - from.latitude) * progress;
    const interpolatedLon = from.longitude + (to.longitude - from.longitude) * progress;
    const interpolatedAlt = from.altitude + (to.altitude - from.altitude) * progress;
    const interpolatedSpeed = from.speed + (to.speed - from.speed) * progress;
    const interpolatedHeading = from.heading + (to.heading - from.heading) * progress;

    // Handle heading wraparound (0-360 degrees)
    let heading = interpolatedHeading;
    if (heading < 0) heading += 360;
    if (heading > 360) heading -= 360;

    return {
      latitude: interpolatedLat,
      longitude: interpolatedLon,
      altitude: interpolatedAlt,
      speed: interpolatedSpeed,
      heading: heading,
      timestamp: new Date(),
    };
  }, []);

  // Animation loop for smooth position updates
  const animatePosition = useCallback(() => {
    if (!lastKnownPositionRef.current || !trackingState.isActive) {
      return;
    }

    const now = Date.now();
    const timeSinceLastUpdate = now - lastKnownPositionRef.current.timestamp.getTime();
    const maxInterpolationTime = opts.updateInterval * 2; // Don't interpolate for more than 2 intervals

    if (timeSinceLastUpdate < maxInterpolationTime && lastKnownPositionRef.current.speed > 0) {
      // Calculate how far the plane should have traveled based on its speed
      const speedKnots = lastKnownPositionRef.current.speed;
      const speedKmPerMs = (speedKnots * 1.852) / (1000 * 3600); // Convert knots to km/ms
      const distanceTraveled = speedKmPerMs * timeSinceLastUpdate;
      
      // Estimate progress along the route (simplified)
      const progress = Math.min(timeSinceLastUpdate / opts.updateInterval, 1);
      
      // Create a simulated next position based on heading and speed
      const earthRadius = 6371; // km
      const distanceKm = distanceTraveled;
      const headingRad = (lastKnownPositionRef.current.heading * Math.PI) / 180;
      const latRad = (lastKnownPositionRef.current.latitude * Math.PI) / 180;
      
      const newLatRad = Math.asin(
        Math.sin(latRad) * Math.cos(distanceKm / earthRadius) +
        Math.cos(latRad) * Math.sin(distanceKm / earthRadius) * Math.cos(headingRad)
      );
      
      const newLonRad = latRad + Math.atan2(
        Math.sin(headingRad) * Math.sin(distanceKm / earthRadius) * Math.cos(latRad),
        Math.cos(distanceKm / earthRadius) - Math.sin(latRad) * Math.sin(newLatRad)
      );
      
      const interpolatedPosition: FlightPosition = {
        latitude: (newLatRad * 180) / Math.PI,
        longitude: (newLonRad * 180) / Math.PI,
        altitude: lastKnownPositionRef.current.altitude,
        speed: lastKnownPositionRef.current.speed,
        heading: lastKnownPositionRef.current.heading,
        timestamp: new Date(),
      };

      interpolatedPositionRef.current = interpolatedPosition;
      setCurrentPosition(interpolatedPosition);
      opts.onPositionChange(interpolatedPosition);
    }

    // Continue animation loop
    if (trackingState.isActive) {
      animationFrameRef.current = requestAnimationFrame(animatePosition);
    }
  }, [trackingState.isActive, opts.updateInterval, opts.onPositionChange]);

  // Handle position updates
  const handlePositionUpdate = useCallback((position: FlightPosition) => {
    if (!isMountedRef.current) return;

    try {
      lastKnownPositionRef.current = position;
      interpolatedPositionRef.current = position;
      setCurrentPosition(position);
      
      // Update tracking state
      setTrackingState(prev => ({
        ...prev,
        isActive: true,
        lastUpdate: new Date(),
        error: null,
        updateCount: prev.updateCount + 1,
        connectionStatus: 'connected',
      }));

      // Update flight history
      setFlightHistory(prev => {
        const newHistory = [...prev, position];
        return newHistory.slice(-MAX_HISTORY_LENGTH);
      });

      // Call custom callback
      opts.onPositionChange(position);

    } catch (error) {
      console.error('Error handling position update:', error);
      setTrackingState(prev => ({
        ...prev,
        error: 'Failed to update position',
        connectionStatus: 'error',
      }));
      opts.onError('Failed to update position');
    }
  }, [opts]);

  // Start polling for position updates
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    setTrackingState(prev => ({
      ...prev,
      connectionStatus: 'connecting',
      error: null,
    }));

    opts.onConnectionChange('connecting');

    // Initial fetch
    const fetchAndUpdate = async () => {
      try {
        const position = await fetchLivePosition();
        if (position && isMountedRef.current) {
          handlePositionUpdate(position);
          setTrackingState(prev => ({
            ...prev,
            connectionStatus: 'connected',
          }));
          opts.onConnectionChange('connected');
        } else if (isMountedRef.current) {
          setTrackingState(prev => ({
            ...prev,
            connectionStatus: 'error',
            error: 'No position data available',
          }));
          opts.onConnectionChange('error');
        }
      } catch (error: any) {
        if (isMountedRef.current) {
          console.error('Initial position fetch failed:', error);
          setTrackingState(prev => ({
            ...prev,
            connectionStatus: 'error',
            error: error.message || 'Failed to fetch position',
          }));
          opts.onConnectionChange('error');
          opts.onError(error.message || 'Failed to fetch position');
        }
      }
    };

    fetchAndUpdate();

    // Set up regular polling
    pollingIntervalRef.current = setInterval(async () => {
      if (!isMountedRef.current) return;

      try {
        const position = await fetchLivePosition();
        if (position) {
          handlePositionUpdate(position);
        }
      } catch (error: any) {
        if (error.message?.includes('Rate limited')) {
          console.log('Rate limited, backing off...');
          // Clear current interval and set a longer one
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
          }
          pollingIntervalRef.current = setInterval(() => {
            fetchAndUpdate();
          }, opts.updateInterval * 3); // Triple the interval
        } else {
          console.error('Polling failed:', error);
        }
      }
    }, opts.updateInterval);

    opts.onTrackingStart();
  }, [fetchLivePosition, handlePositionUpdate, opts]);

  // Start tracking
  const startTracking = useCallback(() => {
    if (!isMountedRef.current || trackingState.isActive || !flight?.flightNumber) return;

    setTrackingState(prev => ({
      ...prev,
      isActive: true,
    }));

    startPolling();
    
    // Start animation loop for smooth position updates
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(animatePosition);
  }, [trackingState.isActive, flight?.flightNumber]);

  // Stop tracking
  const stopTracking = useCallback(() => {
    if (!isMountedRef.current || !trackingState.isActive) return;

    // Clear polling interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    // Abort any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Stop animation loop
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setTrackingState(prev => ({
      ...prev,
      isActive: false,
      connectionStatus: 'disconnected',
    }));

    opts.onTrackingStop();
  }, [trackingState.isActive, opts]);

  // Toggle tracking
  const toggleTracking = useCallback(() => {
    if (trackingState.isActive) {
      stopTracking();
    } else {
      startTracking();
    }
  }, [trackingState.isActive, startTracking, stopTracking]);

  // Clear history
  const clearHistory = useCallback(() => {
    setFlightHistory([]);
  }, []);

  // Auto-start tracking
  useEffect(() => {
    if (opts.autoStart && flight?.flightNumber) {
      // Add a small delay to prevent immediate requests
      const timer = setTimeout(() => {
        if (isMountedRef.current) {
          startTracking();
        }
      }, 1000);

      return () => clearTimeout(timer);
    }

    return () => {
      isMountedRef.current = false;
      stopTracking();
    };
  }, [flight?.flightNumber, opts.autoStart, startTracking, stopTracking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      stopTracking();
    };
  }, [stopTracking]);

  return {
    currentPosition,
    trackingState,
    isTracking: trackingState.isActive,
    startTracking,
    stopTracking,
    toggleTracking,
    flightHistory,
    clearHistory,
    connectionStatus: trackingState.connectionStatus,
  };
};
