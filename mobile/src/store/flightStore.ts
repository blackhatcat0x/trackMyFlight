import { Flight, FlightAlert } from '@/types/flight';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FlightStore {
  // Tracked flights
  trackedFlights: Flight[];
  addTrackedFlight: (flight: Flight) => void;
  removeTrackedFlight: (flightId: string) => void;
  updateTrackedFlight: (flightId: string, updates: Partial<Flight>) => void;
  
  // Flight alerts
  alerts: FlightAlert[];
  addAlert: (alert: FlightAlert) => void;
  removeAlert: (alertId: string) => void;
  updateAlert: (alertId: string, updates: Partial<FlightAlert>) => void;
  
  // User preferences
  preferences: {
    mapStyle: 'light' | 'dark' | 'satellite';
    showWeather: boolean;
    notifications: boolean;
    autoTrackNearby: boolean;
    searchRadius: number; // km
    units: 'metric' | 'imperial';
  };
  updatePreferences: (updates: Partial<FlightStore['preferences']>) => void;
  
  // Search history
  searchHistory: string[];
  addToSearchHistory: (query: string) => void;
  clearSearchHistory: () => void;
  
  // Recent flights
  recentFlights: Flight[];
  addRecentFlight: (flight: Flight) => void;
  clearRecentFlights: () => void;
}

export const useFlightStore = create<FlightStore>()(
  persist(
    (set, get) => ({
      // Tracked flights
      trackedFlights: [],
      addTrackedFlight: (flight) =>
        set((state) => ({
          trackedFlights: state.trackedFlights.some((f) => f.id === flight.id)
            ? state.trackedFlights
            : [...state.trackedFlights, flight],
        })),
      removeTrackedFlight: (flightId) =>
        set((state) => ({
          trackedFlights: state.trackedFlights.filter((f) => f.id !== flightId),
        })),
      updateTrackedFlight: (flightId, updates) =>
        set((state) => ({
          trackedFlights: state.trackedFlights.map((f) =>
            f.id === flightId ? { ...f, ...updates } : f
          ),
        })),

      // Flight alerts
      alerts: [],
      addAlert: (alert) =>
        set((state) => ({
          alerts: state.alerts.some((a) => a.id === alert.id)
            ? state.alerts
            : [...state.alerts, alert],
        })),
      removeAlert: (alertId) =>
        set((state) => ({
          alerts: state.alerts.filter((a) => a.id !== alertId),
        })),
      updateAlert: (alertId, updates) =>
        set((state) => ({
          alerts: state.alerts.map((a) =>
            a.id === alertId ? { ...a, ...updates } : a
          ),
        })),

      // User preferences
      preferences: {
        mapStyle: 'light',
        showWeather: false,
        notifications: true,
        autoTrackNearby: false,
        searchRadius: 50,
        units: 'metric',
      },
      updatePreferences: (updates) =>
        set((state) => ({
          preferences: { ...state.preferences, ...updates },
        })),

      // Search history
      searchHistory: [],
      addToSearchHistory: (query) =>
        set((state) => {
          const filtered = state.searchHistory.filter((item) => item !== query);
          return {
            searchHistory: [query, ...filtered].slice(0, 10), // Keep last 10
          };
        }),
      clearSearchHistory: () => set({ searchHistory: [] }),

      // Recent flights
      recentFlights: [],
      addRecentFlight: (flight) =>
        set((state) => {
          const filtered = state.recentFlights.filter((f) => f.id !== flight.id);
          return {
            recentFlights: [flight, ...filtered].slice(0, 20), // Keep last 20
          };
        }),
      clearRecentFlights: () => set({ recentFlights: [] }),
    }),
    {
      name: 'flight-store',
      partialize: (state) => ({
        trackedFlights: state.trackedFlights,
        alerts: state.alerts,
        preferences: state.preferences,
        searchHistory: state.searchHistory,
        recentFlights: state.recentFlights,
      }),
    }
  )
);