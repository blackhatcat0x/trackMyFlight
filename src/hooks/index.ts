import { flightService } from '@/services/flightService';
import { useFlightStore } from '@/store';
import { FlightSearchResult, MapRegion, SearchFilters } from '@/types';
import { useCallback, useEffect, useRef, useState } from 'react';

export const useFlightSearch = () => {
  const {
    searchQuery,
    searchFilters,
    setSearchResults,
    setLoading,
    setError,
    clearError
  } = useFlightStore();

  const [hasSearched, setHasSearched] = useState(false);

  const searchFlights = useCallback(async (query?: string, filters?: SearchFilters) => {
    const searchQueryToUse = query || searchQuery;
    const filtersToUse = filters || searchFilters;

    if (!searchQueryToUse.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setLoading({ isLoading: true, message: 'Searching flights...' });
    clearError();

    try {
      const result: FlightSearchResult = await flightService.searchFlights(
        searchQueryToUse,
        filtersToUse
      );
      
      setSearchResults(result.flights);
      setHasSearched(true);
    } catch (error) {
      setError({
        message: error instanceof Error ? error.message : 'Failed to search flights',
        code: 'SEARCH_ERROR'
      });
      setSearchResults([]);
    } finally {
      setLoading({ isLoading: false });
    }
  }, [searchQuery, searchFilters, setSearchResults, setLoading, setError, clearError]);

  const clearSearch = useCallback(() => {
    setSearchResults([]);
    setHasSearched(false);
    clearError();
  }, [setSearchResults, clearError]);

  return {
    searchFlights,
    clearSearch,
    hasSearched
  };
};

export const useFlightDetails = (flightId?: string) => {
  const {
    selectedFlight,
    setSelectedFlight,
    setLoading,
    setError,
    clearError
  } = useFlightStore();

  const [isLoading, setIsLoading] = useState(false);

  const loadFlightDetails = useCallback(async (id: string) => {
    setIsLoading(true);
    setLoading({ isLoading: true, message: 'Loading flight details...' });
    clearError();

    try {
      const flight = await flightService.getFlightDetails(id);
      setSelectedFlight(flight);
      
      if (!flight) {
        setError({
          message: 'Flight not found',
          code: 'FLIGHT_NOT_FOUND'
        });
      }
    } catch (error) {
      setError({
        message: error instanceof Error ? error.message : 'Failed to load flight details',
        code: 'FLIGHT_DETAILS_ERROR'
      });
      setSelectedFlight(null);
    } finally {
      setIsLoading(false);
      setLoading({ isLoading: false });
    }
  }, [setSelectedFlight, setLoading, setError, clearError]);

  useEffect(() => {
    if (flightId) {
      loadFlightDetails(flightId);
    }
  }, [flightId, loadFlightDetails]);

  const clearFlightDetails = useCallback(() => {
    setSelectedFlight(null);
    clearError();
  }, [setSelectedFlight, clearError]);

  return {
    flight: selectedFlight,
    isLoading,
    loadFlightDetails,
    clearFlightDetails
  };
};

export const useNearbyFlights = (region?: MapRegion) => {
  const {
    nearbyFlights,
    setNearbyFlights,
    setLoading,
    setError,
    clearError
  } = useFlightStore();

  const [isLoading, setIsLoading] = useState(false);
  const lastRegionRef = useRef<MapRegion | null>(null);

  const loadNearbyFlights = useCallback(async (mapRegion: MapRegion) => {
    // Avoid unnecessary requests if region hasn't changed significantly
    if (lastRegionRef.current && 
        Math.abs(lastRegionRef.current.latitude - mapRegion.latitude) < 0.01 &&
        Math.abs(lastRegionRef.current.longitude - mapRegion.longitude) < 0.01) {
      return;
    }

    setIsLoading(true);
    setLoading({ isLoading: true, message: 'Loading nearby flights...' });
    clearError();

    try {
      const bounds = {
        north: mapRegion.latitude + mapRegion.latitudeDelta / 2,
        south: mapRegion.latitude - mapRegion.latitudeDelta / 2,
        east: mapRegion.longitude + mapRegion.longitudeDelta / 2,
        west: mapRegion.longitude - mapRegion.longitudeDelta / 2
      };

      const flights = await flightService.getFlightsByRegion(bounds);
      setNearbyFlights(flights);
      lastRegionRef.current = mapRegion;
    } catch (error) {
      setError({
        message: error instanceof Error ? error.message : 'Failed to load nearby flights',
        code: 'NEARBY_FLIGHTS_ERROR'
      });
      setNearbyFlights([]);
    } finally {
      setIsLoading(false);
      setLoading({ isLoading: false });
    }
  }, [setNearbyFlights, setLoading, setError, clearError]);

  useEffect(() => {
    if (region) {
      loadNearbyFlights(region);
    }
  }, [region, loadNearbyFlights]);

  const refreshNearbyFlights = useCallback(() => {
    if (lastRegionRef.current) {
      loadNearbyFlights(lastRegionRef.current);
    }
  }, [loadNearbyFlights]);

  return {
    flights: nearbyFlights,
    isLoading,
    refreshNearbyFlights
  };
};

export const useFavorites = () => {
  const {
    favorites,
    flights,
    addToFavorites,
    removeFromFavorites
  } = useFlightStore();

  const favoriteFlights = flights.filter(flight => favorites.includes(flight.id));

  const isFavorite = useCallback((flightId: string) => {
    return favorites.includes(flightId);
  }, [favorites]);

  const toggleFavorite = useCallback((flightId: string) => {
    if (isFavorite(flightId)) {
      removeFromFavorites(flightId);
    } else {
      addToFavorites(flightId);
    }
  }, [isFavorite, addToFavorites, removeFromFavorites]);

  return {
    favorites,
    favoriteFlights,
    isFavorite,
    addToFavorites,
    removeFromFavorites,
    toggleFavorite
  };
};

export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export const useLocalStorage = <T>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error loading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue] as const;
};

export const useGeolocation = () => {
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const getCurrentLocation = useCallback(() => {
    setIsLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setIsLoading(false);
      },
      (error) => {
        setError(error.message);
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  }, []);

  useEffect(() => {
    getCurrentLocation();
  }, [getCurrentLocation]);

  return {
    location,
    error,
    isLoading,
    getCurrentLocation
  };
};

export const useInterval = (callback: () => void, delay: number | null) => {
  const savedCallback = useRef<() => void>();

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    function tick() {
      savedCallback.current?.();
    }
    if (delay !== null) {
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
};