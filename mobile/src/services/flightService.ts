import { Airport, Flight, FlightPosition, FlightSearchResult } from '@/types/flight';
import axios from 'axios';

// API Configuration - Multiple Real-time Sources
const FLIGHT_API_SOURCES = [
  {
    name: 'ADSBExchange',
    baseUrl: 'https://api.adsbexchange.com/api/aircraft',
    priority: 1,
    timeout: 15000,
    headers: { 'User-Agent': 'TrackMyFlight-App/1.0' },
    endpoints: {
      all: '/json',
      location: '/json', // Uses lat/lon/dist params
    }
  },
  {
    name: 'AirplanesLive',
    baseUrl: 'https://api.airplanes.live/v2',
    priority: 2,
    timeout: 15000,
    headers: {},
    endpoints: {
      all: '/point/',
      location: '/point/', // Uses lat/lon/radius
    }
  }
];

const AVIATIONSTACK_API_BASE = 'http://api.aviationstack.com/v1';
const OPEN_METEO_API_BASE = 'https://api.open-meteo.com/v1';

// Create axios instances
const aviationStackApi = axios.create({
  baseURL: AVIATIONSTACK_API_BASE,
  timeout: 10000,
});

const openMeteoApi = axios.create({
  baseURL: OPEN_METEO_API_BASE,
  timeout: 10000,
});

// Real-time updates management
let wsConnection: WebSocket | null = null;
const flightSubscriptions = new Map<string, (position: FlightPosition) => void>();
let currentApiSource = 0; // Track which API source we're using
let apiSourcePerformance = new Map<string, { success: number; failures: number; lastUsed: number }>();

/**
 * Initialize API performance tracking
 */
const initializeApiPerformance = () => {
  FLIGHT_API_SOURCES.forEach(source => {
    apiSourcePerformance.set(source.name, { success: 0, failures: 0, lastUsed: 0 });
  });
};

/**
 * Get the best API source based on performance and availability
 */
const getBestApiSource = () => {
  const now = Date.now();
  const performance = Array.from(apiSourcePerformance.entries());
  
  // Sort by success rate and recency
  performance.sort((a, b) => {
    const aRate = a[1].success / (a[1].success + a[1].failures || 1);
    const bRate = b[1].success / (b[1].success + b[1].failures || 1);
    
    // Prefer sources with better success rates
    if (Math.abs(aRate - bRate) > 0.1) {
      return bRate - aRate;
    }
    
    // If rates are similar, prefer the one used less recently
    return a[1].lastUsed - b[1].lastUsed;
  });
  
  return performance[0]?.[0] || FLIGHT_API_SOURCES[0].name;
};

/**
 * Track API performance
 */
const trackApiPerformance = (sourceName: string, success: boolean) => {
  const perf = apiSourcePerformance.get(sourceName);
  if (perf) {
    if (success) {
      perf.success++;
    } else {
      perf.failures++;
    }
    perf.lastUsed = Date.now();
  }
};

/**
 * Try all flight API sources until one works
 */
const tryFlightApiSources = async (endpoint: string, params?: any): Promise<any> => {
  const bestSource = getBestApiSource();
  const sources = [...FLIGHT_API_SOURCES].sort(s => s.name === bestSource ? -1 : 1);
  
  for (const source of sources) {
    try {
      console.log(`Trying ${source.name} for ${endpoint}...`);
      
      let url = `${source.baseUrl}${endpoint}`;
      
      // Handle different API formats
      if (source.name === 'AirplanesLive' && params?.lat && params?.lon) {
        // Airplanes.live uses different URL format
        const radius = params?.dist || 50;
        url = `${source.baseUrl}/point/${params.lat}/${params.lon}/${radius}`;
        delete params.lat;
        delete params.lon;
        delete params.dist;
      }
      
      const response = await axios.get(url, {
        timeout: source.timeout,
        headers: source.headers,
        params: source.name === 'ADSBExchange' ? params : undefined,
      });
      
      trackApiPerformance(source.name, true);
      console.log(`✅ ${source.name} successful`);
      
      // Transform response to consistent format
      return transformApiResponse(source.name, response.data);
      
    } catch (error) {
      console.warn(`❌ ${source.name} failed:`, error.message);
      trackApiPerformance(source.name, false);
      continue;
    }
  }
  
  throw new Error('All flight API sources failed');
};

/**
 * Transform different API responses to consistent format
 */
const transformApiResponse = (sourceName: string, data: any): any => {
  if (sourceName === 'AirplanesLive') {
    // Airplanes.live format: { ac: [...] } similar to ADSBExchange
    return {
      ac: data.ac || data.aircraft || []
    };
  }
  
  // ADSBExchange format is already what we expect
  return data;
};

/**
 * Fetch nearby flights using multi-source approach
 */
export const fetchNearbyFlights = async (
  latitude: number,
  longitude: number,
  radiusKm: number = 50
): Promise<Flight[]> => {
  try {
    console.log(`Fetching flights near ${latitude}, ${longitude} within ${radiusKm}km`);
    
    // Try all API sources until one works
    const response = await tryFlightApiSources('/json', {
      lat: latitude,
      lon: longitude,
      dist: radiusKm,
    });

    if (response && response.ac) {
      const aircraft = response.ac;
      console.log(`Found ${aircraft.length} aircraft`);
      
      // Enhance with AviationStack data
      const enhancedFlights = await Promise.all(
        aircraft
          .filter((ac: any) => ac.lat && ac.lon && ac.flight)
          .map(async (ac: any) => {
            const baseFlight = transformFlightData(ac, latitude, longitude);
            if (!baseFlight) return null;

            try {
              const enhancedData = await enhanceFlightWithAviationStack(baseFlight.flightNumber);
              return { ...baseFlight, ...enhancedData };
            } catch (error) {
              console.warn(`Failed to enhance ${baseFlight.flightNumber}:`, error);
              return baseFlight;
            }
          })
      );
      
      return enhancedFlights.filter((flight: Flight | null) => flight !== null) as Flight[];
    }
  } catch (error) {
    console.error('All flight APIs failed:', error);
  }

  return getMockNearbyFlights(latitude, longitude);
};

/**
 * Search flights using AviationStack + real-time data
 */
export const searchFlights = async (
  query: string,
  page: number = 1,
  pageSize: number = 20
): Promise<FlightSearchResult> => {
  try {
    // Search scheduled flights using AviationStack
    const aviationResponse = await aviationStackApi.get('/flights', {
      params: {
        access_key: process.env.EXPO_PUBLIC_AVIATIONSTACK_API_KEY,
        search: query,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      },
    });

    if (aviationResponse.data && aviationResponse.data.data) {
      const scheduledFlights = aviationResponse.data.data;
      
      // Enhance with real-time data
      const enhancedFlights = await Promise.all(
        scheduledFlights.map(async (flightData: any) => {
          const baseFlight = transformAviationStackData(flightData);
          
          try {
            const liveData = await getLiveFlightData(baseFlight.flightNumber);
            return { ...baseFlight, currentPosition: liveData };
          } catch (error) {
            return baseFlight;
          }
        })
      );
      
      return {
        flights: enhancedFlights,
        total: aviationResponse.data.pagination?.total || scheduledFlights.length,
        page,
        pageSize,
      };
    }
  } catch (error) {
    console.error('AviationStack search failed:', error);
  }

  // Fallback to real-time search
  try {
    const response = await tryFlightApiSources('/json');
    
    if (response && response.ac) {
      const queryUpper = query.toUpperCase();
      const aircraft = response.ac;
      
      const matchingAircraft = aircraft.filter((ac: any) => 
        ac.flight && ac.flight.toUpperCase().includes(queryUpper)
      );
      
      const flights = matchingAircraft
        .slice((page - 1) * pageSize, page * pageSize)
        .map((ac: any) => transformFlightData(ac))
        .filter((flight: Flight) => flight !== null) as Flight[];
      
      return {
        flights,
        total: matchingAircraft.length,
        page,
        pageSize,
      };
    }
  } catch (error) {
    console.error('Real-time search failed:', error);
  }

  return { flights: [], total: 0, page, pageSize };
};

/**
 * Get detailed flight information
 */
export const getFlightDetails = async (flightId: string): Promise<Flight | null> => {
  try {
    // Try AviationStack first for complete data
    const aviationResponse = await aviationStackApi.get('/flights', {
      params: {
        access_key: process.env.EXPO_PUBLIC_AVIATIONSTACK_API_KEY,
        flight_iata: flightId,
      },
    });

    if (aviationResponse.data && aviationResponse.data.data && aviationResponse.data.data.length > 0) {
      const flightData = aviationResponse.data.data[0];
      const baseFlight = transformAviationStackData(flightData);
      
      try {
        const liveData = await getLiveFlightData(flightId);
        return { ...baseFlight, currentPosition: liveData };
      } catch (error) {
        return baseFlight;
      }
    }
  } catch (error) {
    console.warn('AviationStack details failed, trying real-time sources:', error);
  }

  // Fallback to real-time sources
  try {
    const response = await tryFlightApiSources('/json');
    
    if (response && response.ac) {
      const aircraft = response.ac.find((ac: any) => 
        ac.hex === flightId || 
        (ac.flight && ac.flight.replace(/\s/g, '') === flightId.replace(/\s/g, ''))
      );
      
      if (aircraft) {
        return transformFlightData(aircraft);
      }
    }
  } catch (error) {
    console.error('Flight details failed:', error);
  }

  return null;
};

/**
 * Get airport information
 */
export const getAirportInfo = async (airportCode: string): Promise<Airport | null> => {
  try {
    const response = await aviationStackApi.get('/airports', {
      params: {
        access_key: process.env.EXPO_PUBLIC_AVIATIONSTACK_API_KEY,
        iata_code: airportCode,
      },
    });

    if (response.data && response.data.data && response.data.data.length > 0) {
      const airport = response.data.data[0];
      return {
        code: airport.iata_code || airport.icao_code || 'UNKNOWN',
        name: airport.airport_name || 'Unknown Airport',
        city: airport.city_name || 'Unknown',
        country: airport.country_name || 'Unknown',
        latitude: parseFloat(airport.latitude) || 0,
        longitude: parseFloat(airport.longitude) || 0,
        timezone: airport.timezone || 'UTC',
      };
    }
  } catch (error) {
    console.error('Airport info failed:', error);
  }

  // Fallback to basic airport database
  const airportDatabase: Record<string, Airport> = {
    'JFK': {
      code: 'JFK',
      name: 'John F. Kennedy International Airport',
      city: 'New York',
      country: 'USA',
      latitude: 40.6413,
      longitude: -73.7781,
      timezone: 'America/New_York',
    },
    'LAX': {
      code: 'LAX',
      name: 'Los Angeles International Airport',
      city: 'Los Angeles',
      country: 'USA',
      latitude: 33.9425,
      longitude: -118.4081,
      timezone: 'America/Los_Angeles',
    },
    'ORD': {
      code: 'ORD',
      name: "O'Hare International Airport",
      city: 'Chicago',
      country: 'USA',
      latitude: 41.9742,
      longitude: -87.9073,
      timezone: 'America/Chicago',
    },
    'LHR': {
      code: 'LHR',
      name: 'London Heathrow Airport',
      city: 'London',
      country: 'UK',
      latitude: 51.4700,
      longitude: -0.4543,
      timezone: 'Europe/London',
    },
  };

  return airportDatabase[airportCode.toUpperCase()] || null;
};

/**
 * Get weather data
 */
export const getWeatherData = async (
  latitude: number,
  longitude: number
): Promise<any> => {
  try {
    const response = await openMeteoApi.get('/forecast', {
      params: {
        latitude,
        longitude,
        current_weather: true,
        hourly: 'temperature_2m,relativehumidity_2m,windspeed_10m,winddirection_10m,weathercode',
        daily: 'weathercode,temperature_2m_max,temperature_2m_min,windspeed_10m_max',
        timezone: 'auto',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Weather data failed:', error);
    return null;
  }
};

/**
 * Subscribe to real-time flight updates
 */
export const subscribeToFlightUpdates = (
  flightId: string,
  callback: (position: FlightPosition) => void
) => {
  flightSubscriptions.set(flightId, callback);
  
  if (!wsConnection) {
    initializeRealTimeUpdates();
  }
  
  return () => {
    flightSubscriptions.delete(flightId);
  };
};

/**
 * Initialize real-time updates with multi-source polling
 */
const initializeRealTimeUpdates = () => {
  console.log('Initializing multi-source real-time updates');
  
  setInterval(async () => {
    try {
      const response = await tryFlightApiSources('/json');
      
      if (response && response.ac) {
        const aircraft = response.ac;
        
        flightSubscriptions.forEach((callback, flightId) => {
          const aircraftData = aircraft.find((ac: any) => 
            ac.hex === flightId || 
            (ac.flight && ac.flight.replace(/\s/g, '') === flightId.replace(/\s/g, ''))
          );
          
          if (aircraftData && aircraftData.lat && aircraftData.lon) {
            const position: FlightPosition = {
              latitude: aircraftData.lat,
              longitude: aircraftData.lon,
              altitude: aircraftData.alt_baro || aircraftData.alt_geom || 0,
              speed: aircraftData.gs || 0,
              heading: aircraftData.track || 0,
              timestamp: new Date(),
            };
            callback(position);
          }
        });
      }
    } catch (error) {
      console.error('Real-time update failed:', error);
    }
  }, 30000);
};

/**
 * Get live flight data from any available source
 */
const getLiveFlightData = async (flightNumber: string): Promise<FlightPosition | undefined> => {
  try {
    const response = await tryFlightApiSources('/json');
    
    if (response && response.ac) {
      const aircraft = response.ac.find((ac: any) => 
        ac.flight && ac.flight.replace(/\s/g, '') === flightNumber.replace(/\s/g, '')
      );
      
      if (aircraft && aircraft.lat && aircraft.lon) {
        return {
          latitude: aircraft.lat,
          longitude: aircraft.lon,
          altitude: aircraft.alt_baro || aircraft.alt_geom || 0,
          speed: aircraft.gs || 0,
          heading: aircraft.track || 0,
          timestamp: new Date(),
        };
      }
    }
  } catch (error) {
    console.warn(`Failed to get live data for ${flightNumber}:`, error);
  }
  
  return undefined;
};

/**
 * Enhance flight data with AviationStack information
 */
const enhanceFlightWithAviationStack = async (flightNumber: string): Promise<Partial<Flight>> => {
  try {
    const response = await aviationStackApi.get('/flights', {
      params: {
        access_key: process.env.EXPO_PUBLIC_AVIATIONSTACK_API_KEY,
        flight_iata: flightNumber.trim(),
        limit: 1,
      },
    });

    if (response.data && response.data.data && response.data.data.length > 0) {
      const flightData = response.data.data[0];
      return {
        origin: {
          code: flightData.departure?.iata || 'UNKNOWN',
          name: flightData.departure?.airport || 'Unknown',
          city: flightData.departure?.city || 'Unknown',
          country: flightData.departure?.country || 'Unknown',
          latitude: parseFloat(flightData.departure?.latitude) || 0,
          longitude: parseFloat(flightData.departure?.longitude) || 0,
          timezone: flightData.departure?.timezone || 'UTC',
        },
        destination: {
          code: flightData.arrival?.iata || 'UNKNOWN',
          name: flightData.arrival?.airport || 'Unknown',
          city: flightData.arrival?.city || 'Unknown',
          country: flightData.arrival?.country || 'Unknown',
          latitude: parseFloat(flightData.arrival?.latitude) || 0,
          longitude: parseFloat(flightData.arrival?.longitude) || 0,
          timezone: flightData.arrival?.timezone || 'UTC',
        },
        status: {
          scheduled: {
            departure: new Date(flightData.departure?.scheduled || Date.now()),
            arrival: new Date(flightData.arrival?.scheduled || Date.now() + 3600000),
          },
          estimated: flightData.departure?.estimated ? {
            departure: new Date(flightData.departure.estimated),
            arrival: new Date(flightData.arrival?.estimated),
          } : undefined,
          status: mapFlightStatus(flightData.flight_status || 'scheduled'),
        },
        airline: {
          code: flightData.airline?.iata || 'UNKNOWN',
          name: flightData.airline?.name || 'Unknown Airline',
        },
        aircraft: flightData.aircraft ? {
          type: flightData.aircraft.iata || flightData.aircraft.icao || 'UNKNOWN',
          registration: flightData.aircraft.registration || 'UNKNOWN',
          model: flightData.aircraft.model || 'Unknown',
        } : undefined,
      };
    }
  } catch (error) {
    console.warn(`Failed to enhance ${flightNumber} with AviationStack data:`, error);
  }
  
  return {};
};

/**
 * Transform flight data from any source
 */
const transformFlightData = (apiData: any, searchLat?: number, searchLon?: number): Flight | null => {
  try {
    const flightNumber = apiData.flight ? apiData.flight.trim() : 'UNKNOWN';
    const id = `${apiData.hex || 'unknown'}_${flightNumber}`;
    const airlineCode = flightNumber.length >= 2 ? flightNumber.substring(0, 2) : 'UNKNOWN';
    
    return {
      id,
      flightNumber,
      callsign: flightNumber,
      airline: {
        code: airlineCode,
        name: getAirlineName(airlineCode),
      },
      origin: {
        code: 'UNKNOWN',
        name: 'Unknown',
        city: 'Unknown',
        country: 'Unknown',
        latitude: 0,
        longitude: 0,
        timezone: 'UTC',
      },
      destination: {
        code: 'UNKNOWN',
        name: 'Unknown',
        city: 'Unknown',
        country: 'Unknown',
        latitude: 0,
        longitude: 0,
        timezone: 'UTC',
      },
      aircraft: {
        type: getAircraftType(apiData.type),
        registration: apiData.r || apiData.registration || 'UNKNOWN',
        model: getAircraftModel(apiData.type),
      },
      status: {
        scheduled: {
          departure: new Date(),
          arrival: new Date(Date.now() + 3600000),
        },
        status: getFlightStatus(apiData.alt_baro, apiData.gs),
      },
      currentPosition: apiData.lat && apiData.lon ? {
        latitude: apiData.lat,
        longitude: apiData.lon,
        altitude: apiData.alt_baro || apiData.alt_geom || 0,
        speed: apiData.gs || 0,
        heading: apiData.track || 0,
        timestamp: new Date(),
      } : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } catch (error) {
    console.error('Error transforming flight data:', error);
    return null;
  }
};

/**
 * Transform AviationStack data
 */
const transformAviationStackData = (apiData: any): Flight => {
  return {
    id: apiData.flight?.iata || apiData.flight?.icao || generateFlightId(),
    flightNumber: apiData.flight?.iata || apiData.flight?.number || 'UNKNOWN',
    callsign: apiData.flight?.callsign,
    airline: {
      code: apiData.airline?.iata || apiData.airline?.icao || 'UNKNOWN',
      name: apiData.airline?.name || 'Unknown Airline',
    },
    origin: {
      code: apiData.departure?.iata || apiData.departure?.icao || 'UNKNOWN',
      name: apiData.departure?.airport || 'Unknown Airport',
      city: apiData.departure?.city || 'Unknown',
      country: apiData.departure?.country || 'Unknown',
      latitude: parseFloat(apiData.departure?.latitude) || 0,
      longitude: parseFloat(apiData.departure?.longitude) || 0,
      timezone: apiData.departure?.timezone || 'UTC',
    },
    destination: {
      code: apiData.arrival?.iata || apiData.arrival?.icao || 'UNKNOWN',
      name: apiData.arrival?.airport || 'Unknown Airport',
      city: apiData.arrival?.city || 'Unknown',
      country: apiData.arrival?.country || 'Unknown',
      latitude: parseFloat(apiData.arrival?.latitude) || 0,
      longitude: parseFloat(apiData.arrival?.longitude) || 0,
      timezone: apiData.arrival?.timezone || 'UTC',
    },
    aircraft: apiData.aircraft ? {
      type: apiData.aircraft.iata || apiData.aircraft.icao || 'UNKNOWN',
      registration: apiData.aircraft.registration || 'UNKNOWN',
      model: apiData.aircraft.model || 'Unknown',
    } : undefined,
    status: {
      scheduled: {
        departure: new Date(apiData.departure?.scheduled || Date.now()),
        arrival: new Date(apiData.arrival?.scheduled || Date.now() + 3600000),
      },
      estimated: apiData.departure?.estimated ? {
        departure: new Date(apiData.departure.estimated),
        arrival: new Date(apiData.arrival?.estimated),
      } : undefined,
      status: mapFlightStatus(apiData.flight_status || 'scheduled'),
    },
    currentPosition: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

// Helper functions (unchanged from previous implementation)
const getAirlineName = (code: string): string => {
  const airlines: Record<string, string> = {
    'AA': 'American Airlines', 'UA': 'United Airlines', 'DL': 'Delta Air Lines',
    'SW': 'Southwest Airlines', 'BA': 'British Airways', 'LH': 'Lufthansa',
    'AF': 'Air France', 'EK': 'Emirates', 'QR': 'Qatar Airways',
    'SQ': 'Singapore Airlines', 'JL': 'Japan Airlines', 'QF': 'Qantas',
    'AC': 'Air Canada', 'WS': 'WestJet', 'B6': 'JetBlue',
    'NK': 'Spirit Airlines', 'F9': 'Frontier Airlines',
  };
  return airlines[code] || 'Unknown Airline';
};

const getAircraftType = (type: string): string => {
  if (!type) return 'UNKNOWN';
  const aircraftTypes: Record<string, string> = {
    'L2J': 'Jet', 'L1P': 'Piston', 'L2T': 'Turboprop', 'L4J': 'Jet',
    'H2T': 'Helicopter', 'H1P': 'Helicopter', 'H2J': 'Helicopter',
  };
  return aircraftTypes[type] || type;
};

const getAircraftModel = (type: string): string => {
  if (!type) return 'Unknown';
  const models: Record<string, string> = {
    'L2J': 'Commercial Jet', 'L1P': 'Piston Aircraft', 'L2T': 'Turboprop Aircraft',
    'L4J': 'Large Jet', 'H2T': 'Turbine Helicopter', 'H1P': 'Piston Helicopter',
    'H2J': 'Jet Helicopter',
  };
  return models[type] || 'Unknown Aircraft';
};

const getFlightStatus = (altitude?: number, speed?: number): Flight['status']['status'] => {
  if (!altitude || altitude < 100) return 'scheduled';
  if (altitude > 5000 && speed > 100) return 'departed';
  if (altitude < 5000 && speed > 50) return 'arrived';
  return 'scheduled';
};

const mapFlightStatus = (apiStatus: string): Flight['status']['status'] => {
  const statusMap: Record<string, Flight['status']['status']> = {
    'scheduled': 'scheduled', 'delayed': 'delayed', 'cancelled': 'cancelled',
    'departed': 'departed', 'arrived': 'arrived', 'diverted': 'diverted',
    'active': 'departed', 'landed': 'arrived', 'en-route': 'departed',
  };
  return statusMap[apiStatus.toLowerCase()] || 'scheduled';
};

const generateFlightId = (): string => {
  return `flight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const getMockNearbyFlights = (latitude: number, longitude: number): Flight[] => {
  return [
    {
      id: 'mock_multi_1',
      flightNumber: 'AA123',
      airline: { code: 'AA', name: 'American Airlines' },
      origin: {
        code: 'JFK', name: 'John F. Kennedy International', city: 'New York',
        country: 'USA', latitude: 40.6413, longitude: -73.7781, timezone: 'America/New_York',
      },
      destination: {
        code: 'LAX', name: 'Los Angeles International', city: 'Los Angeles',
        country: 'USA', latitude: 33.9425, longitude: -118.4081, timezone: 'America/Los_Angeles',
      },
      status: {
        scheduled: { departure: new Date(), arrival: new Date(Date.now() + 3600000 * 6) },
        status: 'departed' as const,
      },
      currentPosition: {
        latitude: latitude + (Math.random() - 0.5) * 0.1,
        longitude: longitude + (Math.random() - 0.5) * 0.1,
        altitude: 35000, speed: 450, heading: Math.random() * 360, timestamp: new Date(),
      },
      createdAt: new Date(), updatedAt: new Date(),
    },
  ];
};

// Initialize performance tracking
initializeApiPerformance();