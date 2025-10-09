export interface Flight {
  id: string;
  callsign: string;
  aircraft: {
    registration: string;
    model: string;
    icao24: string;
  };
  origin: Airport;
  destination: Airport;
  departure: {
    scheduled: string;
    actual?: string;
    estimated?: string;
    delay?: number;
  };
  arrival: {
    scheduled: string;
    actual?: string;
    estimated?: string;
    delay?: number;
  };
  status: FlightStatus;
  position: {
    latitude: number;
    longitude: number;
    altitude: number;
    heading: number;
    speed: number;
    timestamp: string;
  };
  route: {
    distance: number;
    estimatedDuration: number;
    waypoints?: Waypoint[];
  };
  airline: {
    name: string;
    icao: string;
    iata: string;
  };
}

export interface Airport {
  id: string;
  name: string;
  city: string;
  country: string;
  iata: string;
  icao: string;
  position: {
    latitude: number;
    longitude: number;
    elevation: number;
  };
  timezone: string;
}

export interface Waypoint {
  latitude: number;
  longitude: number;
  name?: string;
  estimatedTime?: string;
}

export enum FlightStatus {
  SCHEDULED = 'scheduled',
  DELAYED = 'delayed',
  DEPARTED = 'departed',
  IN_FLIGHT = 'in_flight',
  LANDED = 'landed',
  CANCELLED = 'cancelled',
  DIVERTED = 'diverted'
}

export interface SearchFilters {
  status?: FlightStatus[];
  airline?: string;
  aircraft?: string;
  origin?: string;
  destination?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface ApiResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  success: boolean;
  message?: string;
}

export interface FlightSearchResult {
  flights: Flight[];
  total: number;
  hasMore: boolean;
  page: number;
}

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface UserPreferences {
  units: 'metric' | 'imperial';
  timezone: string;
  notifications: {
    departure: boolean;
    arrival: boolean;
    delay: boolean;
    cancellation: boolean;
  };
  mapSettings: {
    showRoutes: boolean;
    showAirports: boolean;
    showWeather: boolean;
  };
}

export interface ErrorState {
  message: string;
  code?: string;
  details?: any;
}

export interface LoadingState {
  isLoading: boolean;
  message?: string;
}