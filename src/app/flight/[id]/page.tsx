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

const transformFlightData = (apiData: any): ExtendedFlight => {
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
      name: apiData.origin?.name || apiData.departure?.airport || 'Unknown Airport',
      city: apiData.origin?.city || 'Unknown City',
      country: apiData.origin?.country || 'Unknown Country',
      latitude: apiData.origin?.latitude || 0,
      longitude: apiData.origin?.longitude || 0,
      timezone: apiData.origin?.timezone || 'UTC',
    },
    destination: {
      code: destCode,
      name: apiData.destination?.name || apiData.arrival?.airport || 'Unknown Airport',
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

  return {
    ...baseFlight,
    live: apiData.live,
  };
}

// Global cache to prevent duplicate requests
const flightCache = new Map<string, { data: ExtendedFlight; timestamp: number }>();
const pendingRequests = new Map<string, Promise<ExtendedFlight | null>>();
const CACHE_DURATION = 30000; // 30 seconds

export default function FlightDetailPage({ params }: { params: { id: string } }) {
  const [flight, setFlight] = useState<ExtendedFlight | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  
  const hasMountedRef = useRef(false);

  useEffect(() => {
    // Prevent double execution in React StrictMode
    if (hasMountedRef.current) {
      console.log('⏭️ Already mounted, skipping');
      return;
    }
    hasMountedRef.current = true;

    const fetchFlightDetails = async () => {
      const flightNumber = extractFlightNumber(params.id);
      const cacheKey = flightNumber;

      // Check cache first
      const cached = flightCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log('📦 Using cached flight data');
        setFlight(cached.data);
        setLoading(false);
        return;
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
                flight.status.status === 'departed' ? 'bg-green-500/30 text-green-300' :
                flight.status.status === 'arrived' ? 'bg-blue-500/30 text-blue-300' :
                flight.status.status === 'delayed' ? 'bg-orange-500/30 text-orange-300' :
                flight.status.status === 'cancelled' ? 'bg-red-500/30 text-red-300' :
                'bg-gray-500/30 text-gray-300'
              }`}>
                {flight.status.status.charAt(0).toUpperCase() + flight.status.status.slice(1)}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 items-center mb-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{flight.origin.code}</div>
                <div className="text-sm text-blue-200">{flight.origin.city}</div>
                <div className="text-xs text-blue-300">{flight.origin.name}</div>
              </div>
              <div className="text-center">
                <div className="text-blue-400 text-2xl">→</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{flight.destination.code}</div>
                <div className="text-sm text-blue-200">{flight.destination.city}</div>
                <div className="text-xs text-blue-300">{flight.destination.name}</div>
              </div>
            </div>

            {flight.status.scheduled && (
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <h3 className="text-sm font-medium text-blue-200 mb-2">Departure</h3>
                  <div className="text-xl font-bold text-white">
                    {formatTime(flight.status.scheduled.departure)}
                  </div>
                  <div className="text-sm text-blue-200">
                    {formatDate(flight.status.scheduled.departure)}
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <h3 className="text-sm font-medium text-blue-200 mb-2">Arrival</h3>
                  <div className="text-xl font-bold text-white">
                    {formatTime(flight.status.scheduled.arrival)}
                  </div>
                  <div className="text-sm text-blue-200">
                    {formatDate(flight.status.scheduled.arrival)}
                  </div>
                </div>
              </div>
            )}

            {flight.currentPosition && (
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {flight.aircraft.registration && (
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <div className="text-xs text-blue-300">Registration</div>
                    <div className="text-sm font-medium text-white">{flight.aircraft.registration}</div>
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