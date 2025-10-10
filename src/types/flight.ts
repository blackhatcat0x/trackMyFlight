export interface FlightPosition {
  latitude: number;
  longitude: number;
  altitude: number; // feet
  speed: number; // knots
  heading: number; // degrees
  timestamp: Date;
}

export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface Airline {
  code: string;
  name: string;
  logo?: string;
}

export interface Aircraft {
  type: string;
  registration: string;
  model: string;
  age?: number;
}

export interface FlightStatus {
  scheduled: {
    departure: Date;
    arrival: Date;
  };
  estimated?: {
    departure: Date;
    arrival: Date;
  };
  actual?: {
    departure: Date;
    arrival: Date;
  };
  gates?: {
    departure: string;
    arrival: string;
  };
  terminals?: {
    departure: string;
    arrival: string;
  };
  baggageClaim?: string;
  status: 'scheduled' | 'delayed' | 'cancelled' | 'departed' | 'arrived' | 'diverted';
  delayMinutes?: number;
}

export interface Flight {
  id: string;
  flightNumber: string;
  callsign?: string;
  airline: Airline;
  origin: Airport;
  destination: Airport;
  aircraft?: Aircraft;
  status: FlightStatus;
  currentPosition?: FlightPosition;
  route?: {
    points: [number, number][];
    distance: number; // nautical miles
    estimatedDuration: number; // minutes
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface FlightAlert {
  id: string;
  flightId: string;
  userId?: string;
  type: 'departure' | 'arrival' | 'gate_change' | 'delay' | 'cancellation' | 'diversion';
  enabled: boolean;
  threshold?: {
    delayMinutes?: number;
    distanceFromDestination?: number; // km
  };
  createdAt: Date;
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  visibility: number;
  conditions: string;
  pressure: number;
  icon: string;
}

export interface FlightSearchResult {
  flights: Flight[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ShareableFlightLink {
  id: string;
  flightId: string;
  shareCode: string;
  expiresAt: Date;
  createdAt: Date;
}
