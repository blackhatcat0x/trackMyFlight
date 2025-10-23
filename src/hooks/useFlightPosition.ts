// hooks/useFlightPosition.ts
'use client';

import { FlightPosition } from '@/types/flight';
import { useCallback, useEffect, useRef, useState } from 'react';

const UPDATE_INTERVAL = 60000; // 60 seconds
const SIMULATION_THRESHOLD_ALTITUDE = 10000; // Start simulation below 10,000 ft
const DESCENT_RATE_FT_PER_MIN = 1800; // Typical approach descent rate

const getCallsignFromFlightNumber = (flightNumber: string): string => {
  console.log('🔍 [useFlightPosition] Converting flight number:', flightNumber);
  
  const clean = flightNumber.replace(/\s+/g, '').toUpperCase();
  console.log('🔍 [useFlightPosition] Cleaned:', clean);
  
  if (/^[A-Z]{3}\d+[A-Z]?$/.test(clean)) {
    console.log('✅ [useFlightPosition] Already valid callsign format:', clean);
    return clean;
  }
  
  const iataToIcao: Record<string, string> = {
    'U2': 'EZY', 'BA': 'BAW', 'FR': 'RYR', 'EZ': 'EZS', 'EJU': 'EZY',
  };
  
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

// Calculate distance between two coordinates in km
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Calculate bearing between two points
const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
           Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
  const bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360;
};

interface UseFlightPositionOptions {
  flightNumber: string;
  initialPosition: FlightPosition | null;
  destinationAirport?: { latitude: number; longitude: number } | null;
  scheduledArrival?: Date | null;
  isTracking?: boolean;
}

interface UseFlightPositionReturn {
  currentPosition: FlightPosition | null;
  interpolatedPosition: FlightPosition | null;
  lastUpdateTime: Date | null;
  isTracking: boolean;
  isSimulated: boolean;
  setIsTracking: (tracking: boolean) => void;
}

export const useFlightPosition = ({
  flightNumber,
  initialPosition,
  destinationAirport,
  scheduledArrival,
  isTracking: externalIsTracking = true,
}: UseFlightPositionOptions): UseFlightPositionReturn => {
  const [currentPosition, setCurrentPosition] = useState<FlightPosition | null>(initialPosition);
  const [interpolatedPosition, setInterpolatedPosition] = useState<FlightPosition | null>(initialPosition);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [isTracking, setIsTracking] = useState(externalIsTracking);
  const [isSimulated, setIsSimulated] = useState(false);
  
  const lastKnownPositionRef = useRef<FlightPosition | null>(initialPosition);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isAnimatingRef = useRef<boolean>(false);
  const simulationStartTimeRef = useRef<number | null>(null);
  const simulationStartPositionRef = useRef<FlightPosition | null>(null);
  const noDataCountRef = useRef<number>(0);

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
          noDataCountRef.current = 0; // Reset counter
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
              noDataCountRef.current = 0; // Reset counter
              return position;
            }
          }
        }
      }

      console.log(`⚠️ [useFlightPosition] No live data available for ${callsign} or ${flightNumber}`);
      noDataCountRef.current++;
      return null;
    } catch (error) {
      console.error('❌ [useFlightPosition] Failed to fetch live position:', error);
      noDataCountRef.current++;
      return null;
    }
  }, [flightNumber]);

  // Check if we should start simulating approach
  const shouldSimulateApproach = useCallback((): boolean => {
    if (!lastKnownPositionRef.current || !destinationAirport) return false;
    
    const position = lastKnownPositionRef.current;
    
    // Conditions for starting simulation:
    // 1. No live data for 2+ consecutive updates
    // 2. Last known altitude < 10,000 ft
    // 3. Within reasonable distance of destination (~100km)
    
    if (noDataCountRef.current < 2) return false;
    if (position.altitude > SIMULATION_THRESHOLD_ALTITUDE) return false;
    
    const distanceToDestination = calculateDistance(
      position.latitude,
      position.longitude,
      destinationAirport.latitude,
      destinationAirport.longitude
    );
    
    if (distanceToDestination > 100) return false; // More than 100km away
    
    console.log('🎭 [useFlightPosition] Starting simulated approach:', {
      altitude: position.altitude,
      distanceKm: distanceToDestination.toFixed(1),
      noDataCount: noDataCountRef.current
    });
    
    return true;
  }, [destinationAirport]);

  // Calculate simulated position during approach
  const calculateSimulatedPosition = useCallback((
    startPosition: FlightPosition,
    startTime: number
  ): FlightPosition => {
    if (!destinationAirport) return startPosition;
    
    const now = Date.now();
    const elapsedMinutes = (now - startTime) / (1000 * 60);
    
    // Calculate how much we've descended
    const altitudeDescended = DESCENT_RATE_FT_PER_MIN * elapsedMinutes;
    const currentAltitude = Math.max(0, startPosition.altitude - altitudeDescended);
    
    // Calculate progress toward destination (0 to 1)
    const distanceToDestination = calculateDistance(
      startPosition.latitude,
      startPosition.longitude,
      destinationAirport.latitude,
      destinationAirport.longitude
    );
    
    // Calculate time to destination based on speed
    const speedKmPerMin = (startPosition.speed * 1.852) / 60; // knots to km/min
    const estimatedMinutesToLanding = distanceToDestination / Math.max(speedKmPerMin, 1);
    
    // Calculate progress (how far along the path we are)
    const progress = Math.min(1, elapsedMinutes / estimatedMinutesToLanding);
    
    // Interpolate position
    const lat = startPosition.latitude + (destinationAirport.latitude - startPosition.latitude) * progress;
    const lon = startPosition.longitude + (destinationAirport.longitude - startPosition.longitude) * progress;
    
    // Calculate heading toward destination
    const heading = calculateBearing(lat, lon, destinationAirport.latitude, destinationAirport.longitude);
    
    // Gradually reduce speed during approach
    const speedReduction = Math.max(0.5, 1 - (progress * 0.5)); // Reduce to 50% of original
    const currentSpeed = startPosition.speed * speedReduction;
    
    return {
      latitude: lat,
      longitude: lon,
      altitude: currentAltitude,
      speed: currentSpeed,
      heading: heading,
      timestamp: new Date()
    };
  }, [destinationAirport]);

  // Interpolate position for smooth animation
  const interpolatePosition = useCallback((from: FlightPosition): FlightPosition => {
    // If simulating, use calculated position instead
    if (isSimulated && simulationStartTimeRef.current && simulationStartPositionRef.current) {
      return calculateSimulatedPosition(simulationStartPositionRef.current, simulationStartTimeRef.current);
    }
    
    // Normal interpolation for live data
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
  }, [isSimulated, calculateSimulatedPosition]);

  // Animation loop
  const animate = useCallback(() => {
    if (!lastKnownPositionRef.current || !isTracking) {
      if (isTracking) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
      return;
    }

    // Check if we should start simulation
    if (!isSimulated && shouldSimulateApproach()) {
      setIsSimulated(true);
      simulationStartTimeRef.current = Date.now();
      simulationStartPositionRef.current = lastKnownPositionRef.current;
      console.log('🎭 [useFlightPosition] Simulation mode activated');
    }

    const now = Date.now();
    
    // Always interpolate/simulate
    const interpolated = interpolatePosition(lastKnownPositionRef.current);
    setInterpolatedPosition(interpolated);
    
    // Check if we've "landed" (altitude = 0)
    if (isSimulated && interpolated.altitude <= 0) {
      console.log('🛬 [useFlightPosition] Simulated landing complete');
      // Stop at destination
      setInterpolatedPosition({
        ...interpolated,
        altitude: 0,
        speed: 0
      });
      return; // Stop animation
    }

    // Continue animation loop
    if (isTracking) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }
  }, [isTracking, interpolatePosition, shouldSimulateApproach, isSimulated]);

  // Setup periodic updates
  useEffect(() => {
    console.log('🔵 [useFlightPosition] Setup effect triggered', {
      isTracking,
      hasFlightNumber: !!flightNumber,
      hasInitialPosition: !!initialPosition
    });

    if (!isTracking) {
      console.log('⏸️ [useFlightPosition] Tracking paused');
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
        console.log('✅ [useFlightPosition] Got real position update');
        
        // Reset simulation if we get live data again
        if (isSimulated) {
          console.log('📡 [useFlightPosition] Live data restored, exiting simulation');
          setIsSimulated(false);
          simulationStartTimeRef.current = null;
          simulationStartPositionRef.current = null;
        }
        
        lastKnownPositionRef.current = newPosition;
        setCurrentPosition(newPosition);
        setInterpolatedPosition(newPosition);
        setLastUpdateTime(new Date());
      }
    };

    // Initial update
    if (!isAnimatingRef.current) {
      updatePosition();
    }
    
    // Set up periodic updates
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
    }
    updateIntervalRef.current = setInterval(updatePosition, UPDATE_INTERVAL);
    
    // Start animation loop
    if (!isAnimatingRef.current && !animationFrameRef.current) {
      isAnimatingRef.current = true;
      animationFrameRef.current = requestAnimationFrame(animate);
    }

    return () => {
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
  }, [isTracking, fetchLivePosition, animate, isSimulated]);

  return {
    currentPosition,
    interpolatedPosition,
    lastUpdateTime,
    isTracking,
    isSimulated,
    setIsTracking,
  };
};