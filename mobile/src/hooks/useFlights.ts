import { fetchNearbyFlights, subscribeToFlightUpdates } from '@/services/flightService';
import { useFlightStore } from '@/store/flightStore';
import { Flight, FlightPosition } from '@/types/flight';
import { useCallback, useEffect, useState } from 'react';
import { useLocation } from './useLocation';

interface UseFlightsReturn {
  flights: Flight[];
  loading: boolean;
  error: string | null;
  refreshFlights: () => Promise<void>;
  subscribeToFlight: (flightId: string) => (() => void) | undefined;
}

export const useFlights = (radiusKm: number = 50): UseFlightsReturn => {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { location } = useLocation();
  const { trackedFlights } = useFlightStore();

  const loadFlights = useCallback(async () => {
    if (!location) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const nearbyFlights = await fetchNearbyFlights(
        location.latitude,
        location.longitude,
        radiusKm
      );
      
      setFlights(nearbyFlights);
    } catch (err) {
      setError('Failed to load flights');
      console.error('Flights loading error:', err);
    } finally {
      setLoading(false);
    }
  }, [location, radiusKm]);

  const refreshFlights = useCallback(async () => {
    await loadFlights();
  }, [loadFlights]);

  const subscribeToFlight = useCallback((flightId: string) => {
    return subscribeToFlightUpdates(flightId, (position: FlightPosition) => {
      setFlights(prev => 
        prev.map(flight => 
          flight.id === flightId 
            ? { ...flight, currentPosition: position }
            : flight
        )
      );
    });
  }, []);

  useEffect(() => {
    if (location) {
      loadFlights();
    }
  }, [location, loadFlights]);

  // Auto-refresh tracked flights
  useEffect(() => {
    const interval = setInterval(() => {
      if (trackedFlights.length > 0) {
        refreshFlights();
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [trackedFlights.length, refreshFlights]);

  return {
    flights,
    loading,
    error,
    refreshFlights,
    subscribeToFlight,
  };
};