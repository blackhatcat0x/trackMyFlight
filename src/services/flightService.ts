import { Airport, Flight, FlightSearchResult, FlightStatus, SearchFilters } from '@/types';
import axios, { AxiosError, AxiosInstance } from 'axios';

class FlightService {
  private aviationStackClient: AxiosInstance;
  private adsbClient: AxiosInstance;
  private openSkyClient: AxiosInstance;
  
  constructor() {
    // Aviation Stack API Client
    this.aviationStackClient = axios.create({
      baseURL: 'http://api.aviationstack.com/v1',
      timeout: 10000,
      params: {
        access_key: process.env.EXPO_PUBLIC_AVIATION_STACK_API_KEY
      }
    });

    // ADSB Exchange API Client
    this.adsbClient = axios.create({
      baseURL: 'https://api.adsbexchange.com',
      timeout: 15000,
      headers: {
        'api-auth': process.env.EXPO_PUBLIC_ADSB_API_KEY
      }
    });

    // OpenSky Network API Client
    this.openSkyClient = axios.create({
      baseURL: 'https://opensky-network.org/api',
      timeout: 12000
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    const setupClient = (client: AxiosInstance, serviceName: string) => {
      client.interceptors.request.use(
        (config) => {
          console.log(`[${serviceName}] Request:`, config.url);
          return config;
        },
        (error) => {
          console.error(`[${serviceName}] Request Error:`, error);
          return Promise.reject(error);
        }
      );

      client.interceptors.response.use(
        (response) => {
          console.log(`[${serviceName}] Response:`, response.status);
          return response;
        },
        (error) => {
          console.error(`[${serviceName}] Response Error:`, error.message);
          return Promise.reject(this.handleError(error, serviceName));
        }
      );
    };

    setupClient(this.aviationStackClient, 'AviationStack');
    setupClient(this.adsbClient, 'ADSB');
    setupClient(this.openSkyClient, 'OpenSky');
  }

  private handleError(error: AxiosError, serviceName: string): Error {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || 'Unknown error';
      
      switch (status) {
        case 401:
          return new Error(`${serviceName}: Authentication failed - Invalid API key`);
        case 429:
          return new Error(`${serviceName}: Rate limit exceeded - Please try again later`);
        case 500:
          return new Error(`${serviceName}: Server error - Service temporarily unavailable`);
        default:
          return new Error(`${serviceName}: ${message}`);
      }
    } else if (error.request) {
      return new Error(`${serviceName}: Network error - Unable to connect to service`);
    } else {
      return new Error(`${serviceName}: ${error.message}`);
    }
  }

  async searchFlights(query: string, filters?: SearchFilters): Promise<FlightSearchResult> {
    try {
      // Try Aviation Stack first
      const aviationResult = await this.searchAviationStack(query, filters);
      if (aviationResult.flights.length > 0) {
        return aviationResult;
      }

      // Fallback to ADSB Exchange
      const adsbResult = await this.searchADSB(query, filters);
      if (adsbResult.flights.length > 0) {
        return adsbResult;
      }

      // Final fallback to OpenSky
      return await this.searchOpenSky(query, filters);
    } catch (error) {
      console.error('All flight search services failed:', error);
      throw new Error('Unable to search flights at this time. Please try again later.');
    }
  }

  private async searchAviationStack(query: string, filters?: SearchFilters): Promise<FlightSearchResult> {
    try {
      const params: any = {};
      
      if (this.isFlightNumber(query)) {
        params.flight_iata = query.toUpperCase();
      } else if (this.isIataCode(query)) {
        params.dep_iata = query.toUpperCase();
      }

      if (filters) {
        if (filters.airline) params.airline_name = filters.airline;
        if (filters.status) params.flight_status = filters.status.join(',');
      }

      const response = await this.aviationStackClient.get('/flights', { params });
      
      const flights = response.data.data?.map(this.transformAviationStackFlight) || [];
      
      return {
        flights,
        total: response.data.pagination?.total || flights.length,
        hasMore: flights.length > 0,
        page: response.data.pagination?.offset || 1
      };
    } catch (error) {
      console.error('Aviation Stack search failed:', error);
      return { flights: [], total: 0, hasMore: false, page: 1 };
    }
  }

  private async searchADSB(query: string, filters?: SearchFilters): Promise<FlightSearchResult> {
    try {
      const params: any = {};
      
      if (this.isFlightNumber(query)) {
        params.callsign = query.toUpperCase();
      }

      const response = await this.adsbClient.get('/v2/aircraft/flight', { params });
      
      const flights = response.data.ac?.map(this.transformADSBFlight) || [];
      
      return {
        flights,
        total: flights.length,
        hasMore: false,
        page: 1
      };
    } catch (error) {
      console.error('ADSB search failed:', error);
      return { flights: [], total: 0, hasMore: false, page: 1 };
    }
  }

  private async searchOpenSky(query: string, filters?: SearchFilters): Promise<FlightSearchResult> {
    try {
      const response = await this.openSkyClient.get('/states/all');
      
      const states = response.data.states || [];
      const flights = states
        .filter((state: any[]) => {
          const callsign = state[1];
          return callsign && callsign.toLowerCase().includes(query.toLowerCase());
        })
        .map(this.transformOpenSkyFlight);

      return {
        flights,
        total: flights.length,
        hasMore: false,
        page: 1
      };
    } catch (error) {
      console.error('OpenSky search failed:', error);
      return { flights: [], total: 0, hasMore: false, page: 1 };
    }
  }

  async getFlightDetails(flightId: string): Promise<Flight | null> {
    try {
      // Try Aviation Stack first
      const aviationDetails = await this.getAviationStackFlightDetails(flightId);
      if (aviationDetails) return aviationDetails;

      // Fallback to ADSB
      const adsbDetails = await this.getADSBFlightDetails(flightId);
      if (adsbDetails) return adsbDetails;

      return null;
    } catch (error) {
      console.error('Failed to get flight details:', error);
      return null;
    }
  }

  private async getAviationStackFlightDetails(flightId: string): Promise<Flight | null> {
    try {
      const response = await this.aviationStackClient.get('/flights', {
        params: { flight_iata: flightId }
      });
      
      const flightData = response.data.data?.[0];
      return flightData ? this.transformAviationStackFlight(flightData) : null;
    } catch (error) {
      console.error('Aviation Stack details failed:', error);
      return null;
    }
  }

  private async getADSBFlightDetails(flightId: string): Promise<Flight | null> {
    try {
      const response = await this.adsbClient.get(`/v2/aircraft/flight/${flightId}`);
      const flightData = response.data.ac?.[0];
      return flightData ? this.transformADSBFlight(flightData) : null;
    } catch (error) {
      console.error('ADSB details failed:', error);
      return null;
    }
  }

  async getFlightsByRegion(bounds: { north: number; south: number; east: number; west: number }): Promise<Flight[]> {
    try {
      const response = await this.openSkyClient.get('/states/all', {
        params: {
          lamin: bounds.south,
          lamax: bounds.north,
          lomin: bounds.west,
          lomax: bounds.east
        }
      });

      return response.data.states?.map(this.transformOpenSkyFlight) || [];
    } catch (error) {
      console.error('Failed to get flights by region:', error);
      return [];
    }
  }

  async searchAirports(query: string): Promise<Airport[]> {
    try {
      const response = await this.aviationStackClient.get('/airports', {
        params: { search: query }
      });

      return response.data.data?.map(this.transformAviationStackAirport) || [];
    } catch (error) {
      console.error('Failed to search airports:', error);
      return [];
    }
  }

  private transformAviationStackFlight(data: any): Flight {
    return {
      id: data.flight?.iata || data.flight?.icao || Math.random().toString(),
      callsign: data.flight?.iata || data.flight?.icao || 'UNKNOWN',
      aircraft: {
        registration: data.aircraft?.registration || 'UNKNOWN',
        model: data.aircraft?.model || 'Unknown',
        icao24: data.aircraft?.icao24 || 'UNKNOWN'
      },
      origin: this.transformAviationStackAirport(data.departure),
      destination: this.transformAviationStackAirport(data.arrival),
      departure: {
        scheduled: data.departure?.scheduled || '',
        actual: data.departure?.actual,
        estimated: data.departure?.estimated,
        delay: data.departure?.delay
      },
      arrival: {
        scheduled: data.arrival?.scheduled || '',
        actual: data.arrival?.actual,
        estimated: data.arrival?.estimated,
        delay: data.arrival?.delay
      },
      status: this.mapFlightStatus(data.flight_status),
      position: {
        latitude: parseFloat(data.live?.latitude || '0'),
        longitude: parseFloat(data.live?.longitude || '0'),
        altitude: parseInt(data.live?.altitude || '0'),
        heading: parseInt(data.live?.direction || '0'),
        speed: parseInt(data.live?.speed_horizontal || '0'),
        timestamp: data.live?.updated || new Date().toISOString()
      },
      route: {
        distance: 0,
        estimatedDuration: 0
      },
      airline: {
        name: data.airline?.name || 'Unknown',
        icao: data.airline?.icao || 'UNKNOWN',
        iata: data.airline?.iata || 'UNKNOWN'
      }
    };
  }

  private transformADSBFlight(data: any): Flight {
    return {
      id: data.hex || Math.random().toString(),
      callsign: data.call || 'UNKNOWN',
      aircraft: {
        registration: data.r || 'UNKNOWN',
        model: data.t || 'Unknown',
        icao24: data.hex || 'UNKNOWN'
      },
      origin: { id: '', name: '', city: '', country: '', iata: '', icao: '', position: { latitude: 0, longitude: 0, elevation: 0 }, timezone: '' },
      destination: { id: '', name: '', city: '', country: '', iata: '', icao: '', position: { latitude: 0, longitude: 0, elevation: 0 }, timezone: '' },
      departure: { scheduled: '' },
      arrival: { scheduled: '' },
      status: FlightStatus.IN_FLIGHT,
      position: {
        latitude: data.lat || 0,
        longitude: data.lon || 0,
        altitude: data.alt_baro || 0,
        heading: data.track || 0,
        speed: data.gs || 0,
        timestamp: new Date().toISOString()
      },
      route: { distance: 0, estimatedDuration: 0 },
      airline: { name: 'Unknown', icao: 'UNKNOWN', iata: 'UNKNOWN' }
    };
  }

  private transformOpenSkyFlight(state: any[]): Flight {
    const [
      icao24, callsign, originCountry, timePosition, lastContact, 
      longitude, latitude, geoAltitude, onGround, velocity, 
      heading, verticalRate, sensors, baroAltitude, squawk, 
      spi, positionSource
    ] = state;

    return {
      id: icao24,
      callsign: callsign || 'UNKNOWN',
      aircraft: {
        registration: 'UNKNOWN',
        model: 'Unknown',
        icao24: icao24
      },
      origin: { id: '', name: '', city: '', country: '', iata: '', icao: '', position: { latitude: 0, longitude: 0, elevation: 0 }, timezone: '' },
      destination: { id: '', name: '', city: '', country: '', iata: '', icao: '', position: { latitude: 0, longitude: 0, elevation: 0 }, timezone: '' },
      departure: { scheduled: '' },
      arrival: { scheduled: '' },
      status: FlightStatus.IN_FLIGHT,
      position: {
        latitude: latitude || 0,
        longitude: longitude || 0,
        altitude: baroAltitude || 0,
        heading: heading || 0,
        speed: velocity || 0,
        timestamp: new Date().toISOString()
      },
      route: { distance: 0, estimatedDuration: 0 },
      airline: { name: originCountry || 'Unknown', icao: 'UNKNOWN', iata: 'UNKNOWN' }
    };
  }

  private transformAviationStackAirport(data: any): Airport {
    return {
      id: data.id || Math.random().toString(),
      name: data.airport_name || 'Unknown',
      city: data.city || 'Unknown',
      country: data.country_name || 'Unknown',
      iata: data.iata || '',
      icao: data.icao || '',
      position: {
        latitude: parseFloat(data.latitude || '0'),
        longitude: parseFloat(data.longitude || '0'),
        elevation: parseInt(data.altitude || '0')
      },
      timezone: data.timezone || 'UTC'
    };
  }

  private mapFlightStatus(status: string): FlightStatus {
    switch (status?.toLowerCase()) {
      case 'scheduled': return FlightStatus.SCHEDULED;
      case 'delayed': return FlightStatus.DELAYED;
      case 'active': return FlightStatus.IN_FLIGHT;
      case 'landed': return FlightStatus.LANDED;
      case 'cancelled': return FlightStatus.CANCELLED;
      default: return FlightStatus.SCHEDULED;
    }
  }

  private isFlightNumber(query: string): boolean {
    return /^[A-Z]{2,3}\d{1,4}$/i.test(query);
  }

  private isIataCode(query: string): boolean {
    return /^[A-Z]{3}$/i.test(query);
  }
}

export const flightService = new FlightService();