import { ErrorState, Flight, FlightStatus, LoadingState, MapRegion, SearchFilters, UserPreferences } from '@/types';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface FlightStore {
  // Flight data
  flights: Flight[];
  selectedFlight: Flight | null;
  searchResults: Flight[];
  favorites: string[];
  
  // Map data
  mapRegion: MapRegion;
  nearbyFlights: Flight[];
  
  // UI state
  loading: LoadingState;
  error: ErrorState | null;
  
  // Search state
  searchQuery: string;
  searchFilters: SearchFilters;
  
  // User preferences
  preferences: UserPreferences;
  
  // Actions
  setFlights: (flights: Flight[]) => void;
  setSelectedFlight: (flight: Flight | null) => void;
  setSearchResults: (results: Flight[]) => void;
  addToFavorites: (flightId: string) => void;
  removeFromFavorites: (flightId: string) => void;
  setMapRegion: (region: MapRegion) => void;
  setNearbyFlights: (flights: Flight[]) => void;
  setLoading: (loading: LoadingState) => void;
  setError: (error: ErrorState | null) => void;
  setSearchQuery: (query: string) => void;
  setSearchFilters: (filters: SearchFilters) => void;
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  clearError: () => void;
  reset: () => void;
}

const defaultPreferences: UserPreferences = {
  units: 'metric',
  timezone: 'UTC',
  notifications: {
    departure: true,
    arrival: true,
    delay: true,
    cancellation: true
  },
  mapSettings: {
    showRoutes: true,
    showAirports: true,
    showWeather: false
  }
};

const defaultMapRegion: MapRegion = {
  latitude: 40.7128,
  longitude: -74.0060,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421
};

export const useFlightStore = create<FlightStore>()(
  persist(
    (set, get) => ({
      // Initial state
      flights: [],
      selectedFlight: null,
      searchResults: [],
      favorites: [],
      mapRegion: defaultMapRegion,
      nearbyFlights: [],
      loading: { isLoading: false },
      error: null,
      searchQuery: '',
      searchFilters: {},
      preferences: defaultPreferences,

      // Actions
      setFlights: (flights) => set({ flights }),
      
      setSelectedFlight: (flight) => set({ selectedFlight: flight }),
      
      setSearchResults: (results) => set({ searchResults: results }),
      
      addToFavorites: (flightId) => set((state) => ({
        favorites: [...new Set([...state.favorites, flightId])]
      })),
      
      removeFromFavorites: (flightId) => set((state) => ({
        favorites: state.favorites.filter(id => id !== flightId)
      })),
      
      setMapRegion: (region) => set({ mapRegion: region }),
      
      setNearbyFlights: (flights) => set({ nearbyFlights: flights }),
      
      setLoading: (loading) => set({ loading }),
      
      setError: (error) => set({ error }),
      
      setSearchQuery: (query) => set({ searchQuery: query }),
      
      setSearchFilters: (filters) => set({ searchFilters: filters }),
      
      updatePreferences: (newPreferences) => set((state) => ({
        preferences: { ...state.preferences, ...newPreferences }
      })),
      
      clearError: () => set({ error: null }),
      
      reset: () => set({
        flights: [],
        selectedFlight: null,
        searchResults: [],
        nearbyFlights: [],
        loading: { isLoading: false },
        error: null,
        searchQuery: '',
        searchFilters: {}
      })
    }),
    {
      name: 'flight-store-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        favorites: state.favorites,
        preferences: state.preferences,
        mapRegion: state.mapRegion
      })
    }
  )
);

// Selectors for commonly used state combinations
export const useFlightSelectors = {
  // Get favorite flights
  useFavoriteFlights: () => {
    const flights = useFlightStore((state) => state.flights);
    const favorites = useFlightStore((state) => state.favorites);
    return flights.filter(flight => favorites.includes(flight.id));
  },

  // Get active flights (in air)
  useActiveFlights: () => {
    const flights = useFlightStore((state) => state.flights);
    return flights.filter(flight => 
      flight.status === FlightStatus.IN_FLIGHT || 
      flight.status === FlightStatus.DEPARTED
    );
  },

  // Get flights by status
  useFlightsByStatus: (status: FlightStatus) => {
    const flights = useFlightStore((state) => state.flights);
    return flights.filter(flight => flight.status === status);
  },

  // Get loading state
  useIsLoading: () => {
    return useFlightStore((state) => state.loading.isLoading);
  },

  // Get error state
  useError: () => {
    return useFlightStore((state) => state.error);
  },

  // Get search state
  useSearchState: () => {
    return useFlightStore((state) => ({
      query: state.searchQuery,
      results: state.searchResults,
      filters: state.searchFilters,
      isLoading: state.loading.isLoading
    }));
  }
};