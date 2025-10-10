'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

// Define Flight interface locally
interface FlightPosition {
  latitude: number
  longitude: number
  altitude: number
  speed: number
  heading: number
  timestamp: Date
}

interface Flight {
  id: string
  flightNumber: string
  callsign?: string
  airline: {
    code: string
    name: string
  }
  origin: {
    code: string
    name: string
    city: string
    country: string
    latitude: number
    longitude: number
    timezone: string
  }
  destination: {
    code: string
    name: string
    city: string
    country: string
    latitude: number
    longitude: number
    timezone: string
  }
  aircraft?: {
    type: string
    registration: string
    model: string
  }
  status: {
    scheduled: {
      departure: Date
      arrival: Date
    }
    estimated?: {
      departure: Date
      arrival: Date
    }
    status: 'scheduled' | 'departed' | 'arrived' | 'delayed' | 'cancelled' | 'diverted'
  }
  currentPosition?: FlightPosition
  createdAt: Date
  updatedAt: Date
}

// Define getFlightDetails function locally
const getFlightDetails = async (flightId: string): Promise<Flight | null> => {
  try {
    const response = await fetch(`/api/flights?search=${flightId}&page=1&pageSize=1`)
    if (response.ok) {
      const result = await response.json()
      return result.flights?.[0] || null
    }
    return null
  } catch (error) {
    console.error('Failed to fetch flight details:', error)
    return null
  }
}

export default function FlightDetailPage({ params }: { params: { id: string } }) {
  const [flight, setFlight] = useState<Flight | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchFlightDetails = async () => {
      try {
        setLoading(true)
        const flightData = await getFlightDetails(params.id)
        if (flightData) {
          setFlight(flightData)
        } else {
          setError('Flight not found')
        }
      } catch (err) {
        console.error('Failed to fetch flight details:', err)
        setError('Failed to load flight details')
      } finally {
        setLoading(false)
      }
    }

    fetchFlightDetails()
  }, [params.id])

  const handleBack = () => {
    router.push('/search')
  }

  const formatTime = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    if (isNaN(dateObj.getTime())) {
      return 'N/A'
    }
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(dateObj)
  }

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    if (isNaN(dateObj.getTime())) {
      return 'N/A'
    }
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
          <p className="text-blue-200 mb-6">{error || 'This flight could not be found'}</p>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen">
        {/* Header */}
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

        {/* Flight Details */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Main flight card */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="text-4xl">✈️</div>
                <div>
                  <h2 className="text-3xl font-bold text-white">{flight.flightNumber}</h2>
                  <p className="text-blue-200">{flight.airline.name}</p>
                </div>
              </div>
              <div className="text-right">
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
            </div>

            {/* Route */}
            <div className="grid grid-cols-3 gap-4 items-center mb-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{flight.origin.code}</div>
                <div className="text-sm text-blue-200">{flight.origin.city}</div>
                <div className="text-xs text-blue-300">{flight.origin.name}</div>
              </div>
              <div className="text-center">
                <div className="text-blue-400 text-2xl">→</div>
                <div className="text-xs text-blue-300 mt-1">Route</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{flight.destination.code}</div>
                <div className="text-sm text-blue-200">{flight.destination.city}</div>
                <div className="text-xs text-blue-300">{flight.destination.name}</div>
              </div>
            </div>

            {/* Schedule */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <h3 className="text-sm font-medium text-blue-200 mb-2">Departure</h3>
                <div className="text-xl font-bold text-white">
                  {formatTime(flight.status.scheduled.departure)}
                </div>
                <div className="text-sm text-blue-200">
                  {formatDate(flight.status.scheduled.departure)}
                </div>
                {flight.status.estimated?.departure && (
                  <div className="text-xs text-orange-300 mt-1">
                    Est: {formatTime(flight.status.estimated.departure)}
                  </div>
                )}
              </div>
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <h3 className="text-sm font-medium text-blue-200 mb-2">Arrival</h3>
                <div className="text-xl font-bold text-white">
                  {formatTime(flight.status.scheduled.arrival)}
                </div>
                <div className="text-sm text-blue-200">
                  {formatDate(flight.status.scheduled.arrival)}
                </div>
                {flight.status.estimated?.arrival && (
                  <div className="text-xs text-orange-300 mt-1">
                    Est: {formatTime(flight.status.estimated.arrival)}
                  </div>
                )}
              </div>
            </div>

            {/* Current Position */}
            {flight.currentPosition && (
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <h3 className="text-sm font-medium text-blue-200 mb-3">Current Position</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-blue-300">Altitude</div>
                    <div className="text-lg font-bold text-white">
                      {Math.round(flight.currentPosition.altitude)}ft
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
                    <div className="text-xs text-blue-300">Updated</div>
                    <div className="text-lg font-bold text-white">
                      {formatTime(flight.currentPosition.timestamp)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Aircraft Info */}
          {flight.aircraft && (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-6 border border-white/20 mb-6">
              <h3 className="text-xl font-bold text-white mb-4">Aircraft Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <div className="text-xs text-blue-300">Type</div>
                  <div className="text-sm font-medium text-white">{flight.aircraft.type}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <div className="text-xs text-blue-300">Registration</div>
                  <div className="text-sm font-medium text-white">{flight.aircraft.registration}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <div className="text-xs text-blue-300">Model</div>
                  <div className="text-sm font-medium text-white">{flight.aircraft.model}</div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={handleBack}
              className="flex-1 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white font-bold py-3 px-6 rounded-xl transition-all border border-white/20"
            >
              Back to Search
            </button>
            <button
              onClick={() => {
                // Copy flight details to clipboard
                const details = `${flight.flightNumber} - ${flight.airline.name}\n${flight.origin.code} → ${flight.destination.code}\nStatus: ${flight.status.status}`
                navigator.clipboard.writeText(details)
                alert('Flight details copied to clipboard!')
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
