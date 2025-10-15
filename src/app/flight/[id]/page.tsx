//flight/[id]/page.tsx
'use client'

import { FlightTracker } from '@/components/FlightTracker'
import { Flight } from '@/types/flight'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

interface ExtendedFlight extends Flight {
  live?: {
    source?: string | null
    callsign?: string | null
    lat?: number | null
    lon?: number | null
    altitudeFt?: number | null
    groundSpeedKt?: number | null
    trackDeg?: number | null
  }
}

const extractFlightNumber = (flightId: string): string => {
  if (flightId.startsWith('live_')) {
    const parts = flightId.split('_')
    return parts[1] || flightId
  }
  const parts = flightId.split('_')
  return parts[0] || flightId
}

// Helper function to convert times to user's local timezone
// Helper function to convert times to user's local timezone
const convertToLocalTime = (time: string, timezone: string, date?: string): string => {
  try {
    console.log(`🔄 Converting time: ${time} ${timezone} (date: ${date})`);
    
    // Parse the time (e.g., "20:45")
    const [hours, minutes] = time.split(':').map(Number);
    
    // Timezone offset mapping (hours from UTC)
    const timezoneOffsets: Record<string, number> = {
      'GMT': 0, 'BST': 1, 'UTC': 0,
      'WEST': 1, 'WET': 0, // Western European Summer/Winter Time
      'CEST': 2, 'CET': 1, // Central European Summer/Standard Time
      'EEST': 3, 'EET': 2, // Eastern European Summer/Standard Time
      'PST': -8, 'PDT': -7, // Pacific
      'MST': -7, 'MDT': -6, // Mountain
      'CST': -6, 'CDT': -5, // Central
      'EST': -5, 'EDT': -4, // Eastern
    };
    
    const tzOffset = timezoneOffsets[timezone] ?? 0;
    console.log(`🌍 Timezone ${timezone} offset: UTC+${tzOffset}`);
    
    // Parse the date
    let year, month, day;
    if (date) {
      const [dayStr, monthStr, yearStr] = date.split(' ');
      const monthMap: Record<string, number> = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
      };
      year = parseInt(yearStr);
      month = monthMap[monthStr] ?? new Date().getMonth();
      day = parseInt(dayStr);
    } else {
      const today = new Date();
      year = today.getFullYear();
      month = today.getMonth();
      day = today.getDate();
    }
    
    // Create UTC date by using Date.UTC (this creates a timestamp in UTC)
    // Subtract the timezone offset to get the actual UTC time
    const utcTimestamp = Date.UTC(year, month, day, hours, minutes) - (tzOffset * 60 * 60 * 1000);
    const utcDate = new Date(utcTimestamp);
    
    console.log(`🌐 UTC time: ${utcDate.toISOString()}`);
    
    // Now convert to local timezone (browser does this automatically)
    const localTime = utcDate.toLocaleTimeString(undefined, { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    
    console.log(`✅ Final local time: ${localTime}`);
    return localTime;
  } catch (e) {
    console.error('Time conversion error:', e);
    return time; // Return original if conversion fails
  }
}

// Get user's timezone abbreviation
const getUserTimezone = (): string => {
  try {
    const formatter = new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' });
    const parts = formatter.formatToParts(new Date());
    const timeZonePart = parts.find(part => part.type === 'timeZoneName');
    return timeZonePart?.value ?? 'Local';
  } catch (e) {
    return 'Local';
  }
}

// Calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

// Calculate estimated arrival and delay
const calculateFlightStatus = (
  currentPosition: any,
  destination: any,
  scheduledArrival?: { time: string; timezone: string; date?: string }
) => {
  if (!currentPosition || !destination || !scheduledArrival) {
    return null;
  }
  
  // Calculate remaining distance
  const distanceKm = calculateDistance(
    currentPosition.latitude,
    currentPosition.longitude,
    destination.latitude,
    destination.longitude
  );
  
  // Convert speed from knots to km/h
  const speedKmh = currentPosition.speed * 1.852;
  
  if (speedKmh < 50) {
    // Aircraft is on ground or moving very slowly
    return { status: 'landed', distanceKm, estimatedMinutesRemaining: 0, delayMinutes: 0 };
  }
  
  // Calculate estimated time remaining (in hours)
  const hoursRemaining = distanceKm / speedKmh;
  const minutesRemaining = Math.round(hoursRemaining * 60);
  
  // Parse scheduled arrival time
  try {
    const [hours, minutes] = scheduledArrival.time.split(':').map(Number);
    const dateStr = scheduledArrival.date || new Date().toLocaleDateString('en-GB');
    const [day, monthStr, year] = dateStr.split(' ');
    const monthMap: Record<string, number> = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    const monthNum = monthMap[monthStr] ?? new Date().getMonth();
    const scheduledTime = new Date(parseInt(year), monthNum, parseInt(day), hours, minutes);
    
    // Calculate estimated arrival
    const estimatedArrival = new Date(Date.now() + minutesRemaining * 60 * 1000);
    
    // Calculate delay in minutes
    const delayMinutes = Math.round((estimatedArrival.getTime() - scheduledTime.getTime()) / (60 * 1000));
    
    return {
      status: delayMinutes > 15 ? 'delayed' : delayMinutes < -15 ? 'early' : 'on-time',
      distanceKm: Math.round(distanceKm),
      estimatedMinutesRemaining: minutesRemaining,
      delayMinutes,
      estimatedArrival: estimatedArrival.toLocaleTimeString(undefined, { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      })
    };
  } catch (e) {
    return { status: 'unknown', distanceKm: Math.round(distanceKm), estimatedMinutesRemaining: minutesRemaining };
  }
}

const transformFlightData = (apiData: any): ExtendedFlight => {
  // Debug logging
  console.log('🔍 Raw API Data:', apiData);
  console.log('📅 Date field:', apiData.date);
  console.log('🛫 Departure field:', apiData.departure);
  console.log('🛬 Arrival field:', apiData.arrival);
  console.log('📦 Enriched Data:', apiData.enrichedData);
  
  const now = new Date();
  
  const originCode = apiData.origin?.code || apiData.departure?.iata || 'UNK';
  const destCode = apiData.destination?.code || apiData.arrival?.iata || 'UNK';
  
  const baseFlight: Flight = {
    id: apiData.id,
    flightNumber: apiData.flightNumber,
    callsign: apiData.live?.callsign || apiData.callsign || undefined,
    airline: {
      code: apiData.airline?.code || 'UNK',
      name: apiData.airline?.name || 'Unknown Airline',
    },
    origin: {
      code: originCode,
      name: apiData.origin?.airport || apiData.origin?.name || apiData.departure?.airport || 'Unknown Airport',
      city: apiData.origin?.city || 'Unknown City',
      country: apiData.origin?.country || 'Unknown Country',
      latitude: apiData.origin?.latitude || 0,
      longitude: apiData.origin?.longitude || 0,
      timezone: apiData.origin?.timezone || 'UTC',
    },
    destination: {
      code: destCode,
      name: apiData.destination?.airport || apiData.destination?.name || apiData.arrival?.airport || 'Unknown Airport',
      city: apiData.destination?.city || 'Unknown City',
      country: apiData.destination?.country || 'Unknown Country',
      latitude: apiData.destination?.latitude || 0,
      longitude: apiData.destination?.longitude || 0,
      timezone: apiData.destination?.timezone || 'UTC',
    },
    aircraft: apiData.aircraft ? {
      type: apiData.aircraft.model || apiData.aircraft.type || 'Unknown',
      registration: apiData.aircraft.registration || 'Unknown',
      model: apiData.aircraft.model || 'Unknown',
    } : undefined,
    status: {
      scheduled: apiData.origin?.scheduledTime && apiData.destination?.scheduledTime ? {
        departure: new Date(apiData.origin.scheduledTime),
        arrival: new Date(apiData.destination.scheduledTime),
      } : undefined,
      estimated: apiData.origin?.actualTime && apiData.destination?.actualTime ? {
        departure: new Date(apiData.origin.actualTime),
        arrival: new Date(apiData.destination.actualTime),
      } : undefined,
      status: apiData.status || 'departed',
    },
    currentPosition: apiData.live && apiData.live.lat && apiData.live.lon ? {
      latitude: apiData.live.lat,
      longitude: apiData.live.lon,
      altitude: apiData.live.altitudeFt || 0,
      speed: apiData.live.groundSpeedKt || 0,
      heading: apiData.live.trackDeg || 0,
      timestamp: new Date(),
    } : undefined,
    route: {
      points: [
        [apiData.origin?.longitude || 0, apiData.origin?.latitude || 0],
        [apiData.destination?.longitude || 0, apiData.destination?.latitude || 0]
      ],
      distance: 0,
      estimatedDuration: 0,
    },
    createdAt: apiData.createdAt ? new Date(apiData.createdAt) : now,
    updatedAt: apiData.updatedAt ? new Date(apiData.updatedAt) : now,
  };

  // Create extended flight with additional fields from API
  const extendedFlight: any = {
    ...baseFlight,
    live: apiData.live,
  };

  // Pass through departure/arrival times if they exist directly
  if (apiData.departure) {
    extendedFlight.departure = apiData.departure;
    console.log('✅ Added departure to extended flight:', extendedFlight.departure);
  } 
  // Otherwise try to get from enrichedData
  else if (apiData.enrichedData?.departure) {
    extendedFlight.departure = apiData.enrichedData.departure;
    console.log('✅ Added departure from enrichedData:', extendedFlight.departure);
  } else {
    console.log('❌ No departure data in API response');
  }
  
  if (apiData.arrival) {
    extendedFlight.arrival = apiData.arrival;
    console.log('✅ Added arrival to extended flight:', extendedFlight.arrival);
  }
  // Otherwise try to get from enrichedData
  else if (apiData.enrichedData?.arrival) {
    extendedFlight.arrival = apiData.enrichedData.arrival;
    console.log('✅ Added arrival from enrichedData:', extendedFlight.arrival);
  } else {
    console.log('❌ No arrival data in API response');
  }
  
  if (apiData.date) {
    extendedFlight.date = apiData.date;
    console.log('✅ Added date to extended flight:', extendedFlight.date);
  }
  // Otherwise try to get from enrichedData
  else if (apiData.enrichedData?.date) {
    extendedFlight.date = apiData.enrichedData.date;
    console.log('✅ Added date from enrichedData:', extendedFlight.date);
  } else {
    console.log('❌ No date in API response');
  }

  console.log('🎯 Final extended flight object:', extendedFlight);

  return extendedFlight;
}

// Global cache to prevent duplicate requests
const flightCache = new Map<string, { data: ExtendedFlight; timestamp: number }>();
const pendingRequests = new Map<string, Promise<ExtendedFlight | null>>();
const CACHE_DURATION = 30000; // 30 seconds

export default function FlightDetailPage({ params }: { params: { id: string } }) {
  const [flight, setFlight] = useState<ExtendedFlight | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userTimezone, setUserTimezone] = useState<string>('Local')
  const [aircraftPhoto, setAircraftPhoto] = useState<any>(null)
  const [loadingPhoto, setLoadingPhoto] = useState(false)
  const router = useRouter()
  
  const hasMountedRef = useRef(false);

  // Get user's timezone on mount
  useEffect(() => {
    setUserTimezone(getUserTimezone());
  }, []);

  useEffect(() => {
    // Prevent double execution in React StrictMode
    if (hasMountedRef.current) {
      console.log('⭐️ Already mounted, skipping');
      return;
    }
    hasMountedRef.current = true;

    const fetchFlightDetails = async () => {
      const flightNumber = extractFlightNumber(params.id);
      const cacheKey = flightNumber;

      // Try sessionStorage first
      try {
        const stored = sessionStorage.getItem(`flight_${params.id}`)
        if (stored) {
          console.log('📦 Using sessionStorage data');
          const storedFlight = JSON.parse(stored);
          const transformed = transformFlightData(storedFlight);
          setFlight(transformed);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn('Failed to load from sessionStorage:', e);
      }

      // Check if request is already in progress
      if (pendingRequests.has(cacheKey)) {
        console.log('⏳ Request already in progress, waiting...');
        try {
          const result = await pendingRequests.get(cacheKey);
          if (result) {
            setFlight(result);
          } else {
            setError('Flight not found');
          }
        } catch (err) {
          setError('Failed to load flight');
        } finally {
          setLoading(false);
        }
        return;
      }

      console.log('🔄 Fetching flight details...');
      
      // Create the request promise
      const requestPromise = (async (): Promise<ExtendedFlight | null> => {
        try {
          setLoading(true);
          setError(null);
          
          const response = await fetch(`/api/flights?query=${encodeURIComponent(flightNumber)}&type=flight`);
          
          if (!response.ok) {
            if (response.status === 429) {
              throw new Error('Too many requests. Please wait a moment.');
            }
            if (response.status === 503) {
              throw new Error('Service temporarily unavailable. Please try again.');
            }
            throw new Error(`HTTP ${response.status}`);
          }
          
          const result = await response.json();
          const flights = result.flights || [];
          
          if (flights.length === 0) {
            throw new Error('Flight not found');
          }
          
          const flightData = flights[0];
          const transformed = transformFlightData(flightData);
          
          if (!transformed || !transformed.flightNumber) {
            throw new Error('Invalid flight data');
          }

          // Cache the result
          flightCache.set(cacheKey, {
            data: transformed,
            timestamp: Date.now()
          });

          console.log('✅ Flight loaded successfully');
          return transformed;
          
        } catch (err) {
          console.error('❌ Fetch error:', err);
          throw err;
        }
      })();

      // Store the pending request
      pendingRequests.set(cacheKey, requestPromise);

      try {
        const result = await requestPromise;
        setFlight(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load flight');
      } finally {
        setLoading(false);
        pendingRequests.delete(cacheKey);
      }
    };

    fetchFlightDetails();

    // Cleanup on unmount
    return () => {
      hasMountedRef.current = false;
    };
  }, [params.id]);

  // Fetch aircraft photo when flight data is loaded
  useEffect(() => {
    if (flight?.aircraft?.registration) {
      const fetchAircraftPhoto = async () => {
        setLoadingPhoto(true);
        try {
          const response = await fetch(`/api/aircraft-photo?registration=${encodeURIComponent(flight.aircraft!.registration!)}`);
          if (response.ok) {
            const data = await response.json();
            setAircraftPhoto(data.photo);
            console.log('✅ Aircraft photo loaded:', data.photo);
          }
        } catch (error) {
          console.warn('Failed to load aircraft photo:', error);
        } finally {
          setLoadingPhoto(false);
        }
      };
      fetchAircraftPhoto();
    }
  }, [flight?.aircraft?.registration]);

  const handleBack = () => router.push('/search')

  const formatTime = (date: Date | string | undefined) => {
    if (!date) return 'N/A'
    const dateObj = typeof date === 'string' ? new Date(date) : date
    if (isNaN(dateObj.getTime())) return 'N/A'
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(dateObj)
  }

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'N/A'
    const dateObj = typeof date === 'string' ? new Date(date) : date
    if (isNaN(dateObj.getTime())) return 'N/A'
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    }).format(dateObj)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mb-4"></div>
          <p className="text-blue-200">Loading flight details...</p>
        </div>
      </div>
    )
  }

  if (error || !flight) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">✈️</div>
          <h2 className="text-2xl font-bold text-white mb-2">Flight Not Found</h2>
          <p className="text-blue-200 mb-6">{error || 'Could not load flight'}</p>
          <button
            onClick={handleBack}
            className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold py-3 px-6 rounded-lg transition-all"
          >
            Back to Search
          </button>
        </div>
      </div>
    )
  }

  const isLiveOnly = !flight.status.scheduled

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
      </div>

      <div className="relative z-10 min-h-screen">
        <div className="bg-white/10 backdrop-blur-md border-b border-white/20">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={handleBack}
                className="text-white hover:text-blue-300 transition-colors p-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex items-center gap-3">
                <Image 
                  src="/img/logo.png" 
                  alt="TrackMyFlight Logo" 
                  width={40} 
                  height={40}
                  className="rounded-full border-2 border-white/20"
                />
                <h1 className="text-2xl font-bold text-white">Flight Details</h1>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8">
          {isLiveOnly && (
            <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="text-2xl">ℹ️</div>
                <div>
                  <h3 className="text-yellow-200 font-medium mb-1">Live Tracking Only</h3>
                  <p className="text-yellow-100 text-sm">
                    This flight is tracked via live ADS-B data. Schedule info may be limited.
                    {flight.live?.source && (
                      <span className="block mt-1">Source: {flight.live.source}</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20 mb-6 flight-data">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="text-4xl">✈️</div>
                <div>
                  <h2 className="text-3xl font-bold text-white">{flight.flightNumber}</h2>
                  <p className="text-blue-200">{flight.airline.name}</p>  
                  {flight.callsign && flight.callsign !== flight.flightNumber && (
                    <p className="text-sm text-blue-300">Callsign: {flight.callsign}</p>
                  )}
                </div>
              </div>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                flight.status.status === 'departed' || (flight.live && flight.live.lat) ? 'bg-green-500/30 text-green-300' :
                flight.status.status === 'arrived' ? 'bg-blue-500/30 text-blue-300' :
                flight.status.status === 'delayed' ? 'bg-orange-500/30 text-orange-300' :
                flight.status.status === 'cancelled' ? 'bg-red-500/30 text-red-300' :
                'bg-gray-500/30 text-gray-300'
              }`}>
                {flight.live && flight.live.lat ? 'In Flight' : flight.status.status.charAt(0).toUpperCase() + flight.status.status.slice(1)}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 items-center mb-8">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  {flight.origin.country && (
                    <img 
                      src={`https://flagcdn.com/32x24/${flight.origin.country.toLowerCase()}.png`}
                      alt={flight.origin.country}
                      className="inline-block w-8 h-6"
                    />
                  )}
                  <div className="text-2xl font-bold text-white">{flight.origin.code}</div>
                </div>
                <div className="text-sm text-blue-200">{flight.origin.city}</div>
                <div className="text-xs text-blue-300">{flight.origin.name}</div>
                {(flight as any).departure && (
                  <div className="mt-2 pt-2 border-t border-white/10">
                    <div className="text-xs text-blue-300">Departure</div>
                    <div className="text-sm font-semibold text-white">
                      {(flight as any).departure.time} {(flight as any).departure.timezone}
                    </div>
                    <div className="text-xs text-blue-200">
                      ({userTimezone}: {(() => {
                        const result = convertToLocalTime((flight as any).departure.time, (flight as any).departure.timezone, (flight as any).date);
                        console.log('✅ Departure conversion result:', result);
                        return result;
                      })()})
                    </div>
                  </div>
                )}
              </div>
              <div className="text-center">
                <div className="text-blue-400 text-2xl">→</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  {flight.destination.country && (
                    <img 
                      src={`https://flagcdn.com/32x24/${flight.destination.country.toLowerCase()}.png`}
                      alt={flight.destination.country}
                      className="inline-block w-8 h-6"
                    />
                  )}
                  <div className="text-2xl font-bold text-white">{flight.destination.code}</div>
                </div>
                <div className="text-sm text-blue-200">{flight.destination.city}</div>
                <div className="text-xs text-blue-300">{flight.destination.name}</div>
                {(flight as any).arrival && (
                  <div className="mt-2 pt-2 border-t border-white/10">
                    <div className="text-xs text-blue-300">Scheduled Arrival</div>
                    <div className="text-sm font-semibold text-white">
                      {(flight as any).arrival.time} {(flight as any).arrival.timezone}
                    </div>
                    <div className="text-xs text-blue-200">
                      ({userTimezone}: {(() => {
                        const result = convertToLocalTime((flight as any).arrival.time, (flight as any).arrival.timezone, (flight as any).date);
                        console.log('✅ Arrival conversion result:', result);
                        return result;
                      })()})
                    </div>
                  </div>
                )}
              </div>
            </div>

            {flight.currentPosition && (
              <div className="bg-white/5 rounded-lg p-4 border border-white/10 mb-4">
                <h3 className="text-sm font-medium text-blue-200 mb-3">Current Position</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-blue-300">Altitude</div>
                    <div className="text-lg font-bold text-white">
                      {Math.round(flight.currentPosition.altitude).toLocaleString()}ft
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-blue-300">Speed</div>
                    <div className="text-lg font-bold text-white">
                      {Math.round(flight.currentPosition.speed)}kts
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-blue-300">Heading</div>
                    <div className="text-lg font-bold text-white">
                      {Math.round(flight.currentPosition.heading)}°
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-blue-300">Position</div>
                    <div className="text-sm font-bold text-white">
                      {flight.currentPosition.latitude.toFixed(2)}, {flight.currentPosition.longitude.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Flight Progress & ETA */}
            {flight.currentPosition && (flight as any).arrival && (() => {
              const flightStatus = calculateFlightStatus(
                flight.currentPosition,
                flight.destination,
                {
                  time: (flight as any).arrival.time,
                  timezone: (flight as any).arrival.timezone,
                  date: (flight as any).date
                }
              );
              
              if (!flightStatus) return null;
              
              return (
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <h3 className="text-sm font-medium text-blue-200 mb-3">Flight Progress</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-xs text-blue-300">Distance Remaining</div>
                      <div className="text-lg font-bold text-white">
                        {flightStatus.distanceKm} km
                      </div>
                      <div className="text-xs text-blue-200">
                        ({Math.round(flightStatus.distanceKm * 0.621371)} mi)
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-blue-300">Time Remaining</div>
                      <div className="text-lg font-bold text-white">
                        {Math.floor(flightStatus.estimatedMinutesRemaining / 60)}h {flightStatus.estimatedMinutesRemaining % 60}m
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-blue-300">Estimated Arrival (Local)</div>
                      <div className="text-lg font-bold text-white">
                        {flightStatus.estimatedArrival || 'Calculating...'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-blue-300">Status</div>
                      <div className={`text-lg font-bold ${
                        flightStatus.status === 'on-time' ? 'text-green-400' :
                        flightStatus.status === 'early' ? 'text-blue-400' :
                        flightStatus.status === 'delayed' ? 'text-orange-400' :
                        flightStatus.status === 'landed' ? 'text-purple-400' :
                        'text-gray-400'
                      }`}>
                        {flightStatus.status === 'on-time' && '✓ On Time'}
                        {flightStatus.status === 'early' && `↑ Early ${Math.abs(flightStatus.delayMinutes ?? 0)}m`}
                        {flightStatus.status === 'delayed' && `↓ Delayed ${flightStatus.delayMinutes ?? 0}m`}
                        {flightStatus.status === 'landed' && '🛬 Landed'}
                        {flightStatus.status === 'unknown' && 'Calculating...'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {flight.currentPosition && (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-6 border border-white/20 mb-6">
              <h3 className="text-xl font-bold text-white mb-4">Live Flight Tracking</h3>
              <div className="relative h-96 rounded-lg overflow-hidden">
                <FlightTracker
                  flight={flight}
                  showRoute={true}
                  className="w-full h-full"
                />
              </div>
            </div>
          )}

          {flight.aircraft && (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-6 border border-white/20 mb-6">
              <h3 className="text-xl font-bold text-white mb-4">Aircraft Information</h3>
              
              {/* Aircraft Photo with side-by-side layout */}
              {aircraftPhoto && (
                <div className="mb-6 rounded-lg overflow-hidden border border-white/20">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                    {/* Image on left - smaller */}
                    <div className="relative">
                      <img 
                        src={aircraftPhoto.thumbnailUrl || aircraftPhoto.imageUrl} 
                        alt={`${flight.aircraft.registration} - ${flight.aircraft.model}`}
                        className="w-full h-full object-cover"
                        style={{ maxHeight: '300px' }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                    
                    {/* Info on right */}
                    <div className="bg-white/5 p-4 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div>
                          <div className="text-xs text-blue-300 mb-1">📸 Photographer</div>
                          <div className="text-sm font-medium text-white">{aircraftPhoto.photographer}</div>
                        </div>
                        
                        {aircraftPhoto.photoDate !== 'Unknown' && (
                          <div>
                            <div className="text-xs text-blue-300 mb-1">📅 Photo Date</div>
                            <div className="text-sm font-medium text-white">{aircraftPhoto.photoDate}</div>
                          </div>
                        )}
                        
                        {aircraftPhoto.location !== 'Unknown' && (
                          <div>
                            <div className="text-xs text-blue-300 mb-1">📍 Location</div>
                            <div className="text-sm font-medium text-white">{aircraftPhoto.location}</div>
                          </div>
                        )}
                        
                        {aircraftPhoto.views > 0 && (
                          <div className="flex items-center gap-4 text-sm text-blue-200">
                            <span>👁️ {aircraftPhoto.views.toLocaleString()} views</span>
                            {aircraftPhoto.likes > 0 && (
                              <span>❤️ {aircraftPhoto.likes} likes</span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-4 pt-3 border-t border-white/20">
                        <a 
                          href={aircraftPhoto.imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-blue-300 hover:text-blue-100 transition-colors text-sm font-medium"
                        >
                          View Full Photo
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {loadingPhoto && !aircraftPhoto && (
                <div className="mb-6 rounded-lg border border-white/20 bg-white/5 h-64 flex items-center justify-center">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mb-2"></div>
                    <p className="text-blue-200 text-sm">Loading aircraft photo...</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {flight.aircraft.registration && (
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <div className="text-xs text-blue-300">Registration</div>
                    <div className="text-sm font-medium text-white">{flight.aircraft.registration}</div>
                    {aircraftPhoto?.serialNumber && aircraftPhoto.serialNumber !== 'Unknown' && (
                      <div className="text-xs text-blue-200 mt-1">S/N: {aircraftPhoto.serialNumber}</div>
                    )}
                  </div>
                )}
                {flight.aircraft.model && (
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <div className="text-xs text-blue-300">Model</div>
                    <div className="text-sm font-medium text-white">{flight.aircraft.model}</div>
                    {aircraftPhoto?.aircraftType && aircraftPhoto.aircraftType !== 'Unknown' && aircraftPhoto.aircraftType !== flight.aircraft.model && (
                      <div className="text-xs text-blue-200 mt-1">{aircraftPhoto.aircraftType}</div>
                    )}
                  </div>
                )}
                {aircraftPhoto?.airline && aircraftPhoto.airline !== 'Unknown' && (
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <div className="text-xs text-blue-300">Operator</div>
                    <div className="text-sm font-medium text-white">{aircraftPhoto.airline}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={handleBack}
              className="flex-1 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white font-bold py-3 px-6 rounded-xl transition-all border border-white/20"
            >
              Back to Search
            </button>
            <button
              onClick={() => {
                const details = `${flight.flightNumber} - ${flight.airline.name}\n${flight.origin.code} → ${flight.destination.code}\nStatus: ${flight.status.status}`
                navigator.clipboard.writeText(details)
              }}
              className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold py-3 px-6 rounded-xl transition-all"
            >
              Copy Details
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}