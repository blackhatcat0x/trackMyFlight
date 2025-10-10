'use client';

import { Flight, FlightPosition } from '@/types/flight';
import { useCallback, useEffect, useRef, useState } from 'react';

interface TrackingState {
  isActive: boolean;
  lastUpdate: Date | null;
  error: string | null;
  updateCount: number;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
}

interface UseRealTimeFlightTrackingOptions {
  autoStart?: boolean;
  updateInterval?: number;
  enableNotifications?: boolean;
  onPositionChange?: (position: FlightPosition) => void;
  onTrackingStart?: () => void;
  onTrackingStop?: () => void;
  onError?: (error: string) => void;
  onConnectionChange?: (status: TrackingState['connectionStatus']) => void;
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
  connectionStatus: TrackingState['connectionStatus'];
}

const DEFAULT_OPTIONS: Required<UseRealTimeFlightTrackingOptions> = {
  autoStart: true,
  updateInterval: 30000, // 30 seconds
  enableNotifications: true,
  onPositionChange: () => {},
  onTrackingStart: () => {},
  onTrackingStop: () => {},
  onError: () => {},
  onConnectionChange: () => {},
};

const MAX_HISTORY_LENGTH = 100;

export const useRealTimeFlightTracking = (
  flight: Flight | null,
  options: UseRealTimeFlightTrackingOptions = {}
): UseRealTimeFlightTrackingReturn => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // State management
  const [currentPosition, setCurrentPosition] = useState<FlightPosition | null>(
    flight?.currentPosition || null
  );
  const [trackingState, setTrackingState] = useState<TrackingState>({
    isActive: false,
    lastUpdate: null,
    error: null,
    updateCount: 0,
    connectionStatus: 'disconnected',
  });
  const [flightHistory, setFlightHistory] = useState<FlightPosition[]>([]);
  
  // Refs for cleanup and state management
  const socketRef = useRef<any>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // Initialize WebSocket connection
  const initializeSocket = useCallback(async () => {
    if (socketRef.current?.connected) {
      return;
    }

    setTrackingState(prev => ({
      ...prev,
      connectionStatus: 'connecting',
      error: null,
    }));

    try {
      // Dynamically import socket.io-client to avoid SSR issues
      const { io } = await import('socket.io-client');
      
      // Connect to WebSocket server
      const socket = io(process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001', {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: false, // We'll handle reconnection manually
        path: '/socket.io'
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('Connected to flight tracking WebSocket');
        reconnectAttemptsRef.current = 0;
        
        setIsTracking(true);
        setTrackingState(prev => ({
          ...prev,
          isActive: true,
          connectionStatus: 'connected',
          error: null,
        }));

        opts.onConnectionChange('connected');
        opts.onTrackingStart();

        // Subscribe to flight updates
        if (flight?.id) {
          socket.emit('subscribe_flight', { flightId: flight.id });
        }
      });

      socket.on('disconnect', () => {
        console.log('Disconnected from flight tracking WebSocket');
        setTrackingState(prev => ({
          ...prev,
          connectionStatus: 'disconnected',
        }));
        opts.onConnectionChange('disconnected');
      });

      socket.on('flight_position_update', (data: { flightId: string; position: FlightPosition }) => {
        if (data.flightId === flight?.id && isMountedRef.current) {
          handlePositionUpdate(data.position);
        }
      });

      socket.on('error', (error: any) => {
        console.error('WebSocket error:', error);
        setTrackingState(prev => ({
          ...prev,
          connectionStatus: 'error',
          error: error.message || 'Connection error',
        }));
        opts.onConnectionChange('error');
        opts.onError(error.message || 'Connection error');
      });

    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
      setTrackingState(prev => ({
        ...prev,
        connectionStatus: 'error',
        error: (error as Error).message,
      }));
      opts.onConnectionChange('error');
      opts.onError((error as Error).message);
    }
  }, [flight?.id, opts]);

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
  }, [opts]);

  // Check for significant changes that warrant notifications
  const checkForSignificantChanges = (newPosition: FlightPosition) => {
    if (!currentPosition) return;

    const timeDiff = newPosition.timestamp.getTime() - currentPosition.timestamp.getTime();
    
    // Only check if at least 1 minute has passed
    if (timeDiff < 60000) return;

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

  // Fallback polling for when WebSocket is not available
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingIntervalRef.current = setInterval(async () => {
      if (!isMountedRef.current || trackingState.connectionStatus === 'connected') {
        return;
      }

      try {
        // Fetch latest flight data
        if (flight?.flightNumber) {
          const response = await fetch(`/api/flights?search=${flight.flightNumber}&page=1&pageSize=1`);
          if (response.ok) {
            const result = await response.json();
            const updatedFlight = result.flights?.[0];
            
            if (updatedFlight?.currentPosition) {
              handlePositionUpdate(updatedFlight.currentPosition);
            }
          }
        }
      } catch (error) {
        console.error('Polling failed:', error);
      }
    }, opts.updateInterval);
  }, [flight?.flightNumber, handlePositionUpdate, opts.updateInterval, trackingState.connectionStatus]);

  // Start tracking
  const startTracking = useCallback(() => {
    if (!isMountedRef.current || trackingState.isActive) return;

    try {
      initializeSocket();
      startPolling();
    } catch (error) {
      console.error('Error starting tracking:', error);
      setTrackingState(prev => ({
        ...prev,
        error: 'Failed to start tracking',
      }));
      opts.onError('Failed to start tracking');
    }
  }, [trackingState.isActive, initializeSocket, startPolling, opts]);

  // Stop tracking
  const stopTracking = useCallback(() => {
    if (!isMountedRef.current || !trackingState.isActive) return;

    try {
      // Clean up WebSocket
      if (socketRef.current) {
        if (flight?.id) {
          socketRef.current.emit('unsubscribe_flight', { flightId: flight.id });
        }
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      // Clean up polling
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }

      setTrackingState(prev => ({
        ...prev,
        isActive: false,
        connectionStatus: 'disconnected',
      }));

      opts.onTrackingStop();

    } catch (error) {
      console.error('Error stopping tracking:', error);
      opts.onError('Failed to stop tracking');
    }
  }, [flight?.id, trackingState.isActive, opts]);

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

  // Helper function to set tracking state
  const setIsTracking = useCallback((active: boolean) => {
    setTrackingState(prev => ({
      ...prev,
      isActive: active,
    }));
  }, []);

  // Auto-start tracking
  useEffect(() => {
    if (opts.autoStart && flight?.currentPosition) {
      startTracking();
    }

    return () => {
      isMountedRef.current = false;
      stopTracking();
    };
  }, [flight?.id, opts.autoStart, flight?.currentPosition, startTracking, stopTracking]);

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
