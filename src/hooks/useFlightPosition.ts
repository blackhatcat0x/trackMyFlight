// hooks/useFlightPosition.ts
'use client';

import { FlightPosition } from '@/types/flight';
import { useCallback, useEffect, useRef, useState } from 'react';

const UPDATE_INTERVAL = 60000; // 60 seconds

const getCallsignFromFlightNumber = (flightNumber: string): string => {
  console.log('🔍 [useFlightPosition] Converting flight number:', flightNumber);
  
  const clean = flightNumber.replace(/\s+/g, '').toUpperCase();
  console.log('🔍 [useFlightPosition] Cleaned:', clean);
  
  // If it already looks like a callsign (3 letters + numbers), return as-is
  if (/^[A-Z]{3}\d+[A-Z]?$/.test(clean)) {
    console.log('✅ [useFlightPosition] Already valid callsign format:', clean);
    return clean;
  }
  
  const iataToIcao: Record<string, string> = {
    'U2': 'EZY', 'BA': 'BAW', 'FR': 'RYR', 'EZ': 'EZS', 'EJU': 'EZY',
  };
  
  // Try to match 2-letter IATA code + flight number
  const iataMatch = clean.match(/^([A-Z]{2})(\d+[A-Z]?)$/);
  if (iataMatch) {
    const [, iata, number] = iataMatch;
    const icao = iataToIcao[iata] || iata;
    const result = `${icao}${number}`;
    console.log(`✅ [useFlightPosition] Converted ${iata} to ${icao}, final: ${result}`);
    return result;
  }
  
  console.log('⚠️ [useFlightPosition] No conversion needed, returning:', clean);
  return clean;
};

interface UseFlightPositionOptions {
  flightNumber: string;
  initialPosition: FlightPosition | null;
  isTracking?: boolean;
}

interface UseFlightPositionReturn {
  currentPosition: FlightPosition | null;
  interpolatedPosition: FlightPosition | null;
  lastUpdateTime: Date | null;
  isTracking: boolean;
  setIsTracking: (tracking: boolean) => void;
}

export const useFlightPosition = ({
  flightNumber,
  initialPosition,
  isTracking: externalIsTracking = true,
}: UseFlightPositionOptions): UseFlightPositionReturn => {
  const [currentPosition, setCurrentPosition] = useState<FlightPosition | null>(initialPosition);
  const [interpolatedPosition, setInterpolatedPosition] = useState<FlightPosition | null>(initialPosition);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [isTracking, setIsTracking] = useState(externalIsTracking);
  
  const lastKnownPositionRef = useRef<FlightPosition | null>(initialPosition);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isAnimatingRef = useRef<boolean>(false);

  // Fetch live position update
  const fetchLivePosition = useCallback(async (): Promise<FlightPosition | null> => {
    if (!flightNumber) {
      console.log('⚠️ [useFlightPosition] No flight number provided');
      return null;
    }

    const callsign = getCallsignFromFlightNumber(flightNumber);
    console.log(`📡 [useFlightPosition] Fetching live update for ${callsign}...`);

    try {
      const response = await fetch(
        `https://api.airplanes.live/v2/callsign/${encodeURIComponent(callsign)}`,
        { headers: { 'Accept': 'application/json' } }
      );

      if (!response.ok) {
        console.error(`❌ [useFlightPosition] API error: ${response.status}`);
        return null;
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
          
          console.log(`✅ [useFlightPosition] Live position updated:`, position);
          return position;
        }
      }

      // If converted callsign didn't work, try the original flight number
      if (callsign !== flightNumber) {
        console.log(`⚠️ [useFlightPosition] No data for ${callsign}, trying original: ${flightNumber}`);
        
        const response2 = await fetch(
          `https://api.airplanes.live/v2/callsign/${encodeURIComponent(flightNumber)}`,
          { headers: { 'Accept': 'application/json' } }
        );

        if (response2.ok) {
          const data2 = await response2.json();
          
          if (data2.ac && Array.isArray(data2.ac) && data2.ac.length > 0) {
            const aircraftData = data2.ac[0];
            
            if (aircraftData.lat && aircraftData.lon) {
              const position: FlightPosition = {
                latitude: aircraftData.lat,
                longitude: aircraftData.lon,
                altitude: aircraftData.alt_baro || aircraftData.alt_geom || 0,
                speed: aircraftData.gs || 0,
                heading: aircraftData.track || 0,
                timestamp: new Date(),
              };
              
              console.log(`✅ [useFlightPosition] Got data with original callsign!`, position);
              return position;
            }
          }
        }
      }

      console.log(`⚠️ [useFlightPosition] No live data available for ${callsign} or ${flightNumber}`);
      return null;
    } catch (error) {
      console.error('❌ [useFlightPosition] Failed to fetch live position:', error);
      return null;
    }
  }, [flightNumber]);

  // Interpolate position for smooth animation
  const interpolatePosition = useCallback((from: FlightPosition): FlightPosition => {
    const speedKnots = from.speed;
    const speedKmPerMs = (speedKnots * 1.852) / (1000 * 3600);
    const timeSinceUpdate = Date.now() - from.timestamp.getTime();
    const distanceTraveled = speedKmPerMs * timeSinceUpdate;
    
    const earthRadius = 6371;
    const headingRad = (from.heading * Math.PI) / 180;
    const latRad = (from.latitude * Math.PI) / 180;
    
    const newLatRad = Math.asin(
      Math.sin(latRad) * Math.cos(distanceTraveled / earthRadius) +
      Math.cos(latRad) * Math.sin(distanceTraveled / earthRadius) * Math.cos(headingRad)
    );
    
    const lonRad = (from.longitude * Math.PI) / 180;
    const newLonRad = lonRad + Math.atan2(
      Math.sin(headingRad) * Math.sin(distanceTraveled / earthRadius) * Math.cos(latRad),
      Math.cos(distanceTraveled / earthRadius) - Math.sin(latRad) * Math.sin(newLatRad)
    );
    
    return {
      latitude: (newLatRad * 180) / Math.PI,
      longitude: (newLonRad * 180) / Math.PI,
      altitude: from.altitude,
      speed: from.speed,
      heading: from.heading,
      timestamp: new Date(),
    };
  }, []);

  // Animation loop - continuous smooth movement at 60fps
  const animate = useCallback(() => {
    if (!lastKnownPositionRef.current || !isTracking) {
      if (isTracking) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
      return;
    }

    const now = Date.now();
    
    // Continue animating as long as we have speed data
    if (lastKnownPositionRef.current.speed > 10) {
      // Calculate new interpolated position
      const interpolated = interpolatePosition(lastKnownPositionRef.current);
      setInterpolatedPosition(interpolated);
      
      // Log to verify we're calculating positions (every ~5 seconds)
      if (now % 5000 < 16) {
        console.log('🎬 [useFlightPosition] Interpolating:', {
          lat: interpolated.latitude.toFixed(4),
          lon: interpolated.longitude.toFixed(4),
          heading: Math.round(interpolated.heading),
          speed: Math.round(interpolated.speed),
          timeSinceUpdate: Math.round((now - lastKnownPositionRef.current.timestamp.getTime()) / 1000) + 's'
        });
      }
    } else {
      console.log('⚠️ [useFlightPosition] Speed too low for interpolation:', lastKnownPositionRef.current.speed);
    }

    // Continue animation loop
    if (isTracking) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }
  }, [isTracking, interpolatePosition]);

  // Setup periodic updates
  useEffect(() => {
    console.log('🔵 [useFlightPosition] Setup effect triggered', {
      isTracking,
      hasFlightNumber: !!flightNumber,
      hasInitialPosition: !!initialPosition
    });

    if (!isTracking) {
      console.log('⏸️ [useFlightPosition] Tracking paused, stopping animation');
      // Stop animation when paused
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      isAnimatingRef.current = false;
      return;
    }

    const updatePosition = async () => {
      console.log('📡 [useFlightPosition] Fetching position update...');
      const newPosition = await fetchLivePosition();
      if (newPosition) {
        console.log('✅ [useFlightPosition] Got real position update from API:', {
          lat: newPosition.latitude.toFixed(4),
          lon: newPosition.longitude.toFixed(4),
          alt: Math.round(newPosition.altitude),
          speed: Math.round(newPosition.speed),
          heading: Math.round(newPosition.heading)
        });
        
        // Update our reference position
        lastKnownPositionRef.current = newPosition;
        setCurrentPosition(newPosition);
        setInterpolatedPosition(newPosition);
        setLastUpdateTime(new Date());
      } else {
        console.warn('⚠️ [useFlightPosition] No position data returned from API');
      }
    };

    // Initial update
    if (!isAnimatingRef.current) {
      console.log('🚀 [useFlightPosition] Starting initial position fetch...');
      updatePosition();
    }
    
    // Set up periodic API updates every 60 seconds
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
    }
    console.log('⏰ [useFlightPosition] Setting up 60s interval for position updates');
    updateIntervalRef.current = setInterval(updatePosition, UPDATE_INTERVAL);
    
    // Start continuous animation loop if not already running
    if (!isAnimatingRef.current && !animationFrameRef.current) {
      console.log('🎬 [useFlightPosition] Starting animation loop...');
      isAnimatingRef.current = true;
      animationFrameRef.current = requestAnimationFrame(animate);
    }

    return () => {
      console.log('🧹 [useFlightPosition] Cleaning up...');
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      isAnimatingRef.current = false;
    };
  }, [isTracking, fetchLivePosition, animate]);

  return {
    currentPosition,
    interpolatedPosition,
    lastUpdateTime,
    isTracking,
    setIsTracking,
  };
};