import { subscribeToFlightUpdates } from '@/services/flightService';
import { useFlightStore } from '@/store/flightStore';
import { Flight, FlightPosition } from '@/types/flight';
import { useCallback, useEffect, useRef, useState } from 'react';

interface TrackingState {
  isActive: boolean;
  lastUpdate: Date | null;
  error: string | null;
  updateCount: number;
}

interface UseRealTimeFlightTrackingOptions {
  autoStart?: boolean;
  updateInterval?: number;
  enableNotifications?: boolean;
  onPositionChange?: (position: FlightPosition) => void;
  onTrackingStart?: () => void;
  onTrackingStop?: () => void;
  onError?: (error: string) => void;
}

interface UseRealTimeFlightTrackingReturn {
  currentPosition: FlightPosition | null;
  trackingState: TrackingState;
  isTracking: boolean;
  startTracking: () => void;
  stopTracking: () => void;
  toggleTracking: () => void;
  flightHistory: FlightPosition[];
  clearHistory: () => void;
}

const DEFAULT_OPTIONS: Required<UseRealTimeFlightTrackingOptions> = {
  autoStart: true,
  updateInterval: 30000, // 30 seconds
  enableNotifications: true,
  onPositionChange: () => {},
  onTrackingStart: () => {},
  onTrackingStop: () => {},
  onError: () => {},
};

const MAX_HISTORY_LENGTH = 100;

export const useRealTimeFlightTracking = (
  flight: Flight,
  options: UseRealTimeFlightTrackingOptions = {}
): UseRealTimeFlightTrackingReturn => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // State management
  const [currentPosition, setCurrentPosition] = useState<FlightPosition | null>(
    flight.currentPosition || null
  );
  const [trackingState, setTrackingState] = useState<TrackingState>({
    isActive: false,
    lastUpdate: null,
    error: null,
    updateCount: 0,
  });
  const [flightHistory, setFlightHistory] = useState<FlightPosition[]>([]);
  
  // Refs for cleanup and state management
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const trackingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  
  // Store integration
  const { updateTrackedFlight } = useFlightStore();

  // Cleanup function
  const cleanup = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    
    if (trackingTimeoutRef.current) {
      clearTimeout(trackingTimeoutRef.current);
      trackingTimeoutRef.current = null;
    }
  }, []);

  // Handle position updates
  const handlePositionUpdate = useCallback((position: FlightPosition) => {
    if (!isMountedRef.current) return;

    try {
      setCurrentPosition(position);
      
      // Update tracking state
      setTrackingState(prev => ({
        ...prev,
        isActive: true,
        lastUpdate: new Date(),
        error: null,
        updateCount: prev.updateCount + 1,
      }));

      // Update flight history
      setFlightHistory(prev => {
        const newHistory = [...prev, position];
        return newHistory.slice(-MAX_HISTORY_LENGTH);
      });

      // Update store with new position
      updateTrackedFlight(flight.id, {
        currentPosition: position,
        updatedAt: new Date(),
      });

      // Call custom callback
      opts.onPositionChange(position);

      // Send notification if enabled and significant change
      if (opts.enableNotifications) {
        checkForSignificantChanges(position);
      }

    } catch (error) {
      console.error('Error handling position update:', error);
      setTrackingState(prev => ({
        ...prev,
        error: 'Failed to update position',
      }));
      opts.onError('Failed to update position');
    }
  }, [flight.id, updateTrackedFlight, opts]);

  // Check for significant changes that warrant notifications
  const checkForSignificantChanges = (newPosition: FlightPosition) => {
    if (!currentPosition) return;

    const timeDiff = newPosition.timestamp.getTime() - currentPosition.timestamp.getTime();
    const distanceDiff = calculateDistance(
      currentPosition.latitude,
      currentPosition.longitude,
      newPosition.latitude,
      newPosition.longitude
    );

    // Notify if significant altitude change (>1000m)
    if (Math.abs(newPosition.altitude - currentPosition.altitude) > 3280) {
      sendAltitudeNotification(newPosition.altitude);
    }

    // Notify if significant speed change (>50 km/h)
    const speedDiff = Math.abs(newPosition.speed - currentPosition.speed) * 1.852;
    if (speedDiff > 50) {
      sendSpeedNotification(newPosition.speed);
    }
  };

  // Calculate distance between two coordinates
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Notification functions (placeholder - would integrate with actual notification service)
  const sendAltitudeNotification = (altitude: number) => {
    console.log(`Altitude change notification: ${Math.round(altitude * 0.3048)}m`);
  };

  const sendSpeedNotification = (speed: number) => {
    console.log(`Speed change notification: ${Math.round(speed * 1.852)} km/h`);
  };

  // Start tracking
  const startTracking = useCallback(() => {
    if (!isMountedRef.current || trackingState.isActive) return;

    try {
      cleanup();

      setTrackingState({
        isActive: true,
        lastUpdate: null,
        error: null,
        updateCount: 0,
      });

      // Subscribe to real-time updates
      unsubscribeRef.current = subscribeToFlightUpdates(flight.id, handlePositionUpdate);

      // Set up fallback polling
      trackingTimeoutRef.current = setInterval(() => {
        if (isMountedRef.current && trackingState.isActive) {
          // Fallback mechanism if WebSocket fails
          console.log('Fallback polling for flight updates');
        }
      }, opts.updateInterval);

      opts.onTrackingStart();

    } catch (error) {
      console.error('Error starting tracking:', error);
      setTrackingState(prev => ({
        ...prev,
        error: 'Failed to start tracking',
      }));
      opts.onError('Failed to start tracking');
    }
  }, [flight.id, handlePositionUpdate, cleanup, opts, trackingState.isActive, opts.updateInterval]);

  // Stop tracking
  const stopTracking = useCallback(() => {
    if (!isMountedRef.current || !trackingState.isActive) return;

    try {
      cleanup();

      setTrackingState(prev => ({
        ...prev,
        isActive: false,
      }));

      opts.onTrackingStop();

    } catch (error) {
      console.error('Error stopping tracking:', error);
      opts.onError('Failed to stop tracking');
    }
  }, [cleanup, opts, trackingState.isActive]);

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
    if (opts.autoStart && flight.currentPosition) {
      startTracking();
    }

    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, [flight.id, opts.autoStart, flight.currentPosition, startTracking, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  return {
    currentPosition,
    trackingState,
    isTracking: trackingState.isActive,
    startTracking,
    stopTracking,
    toggleTracking,
    flightHistory,
    clearHistory,
  };
};
