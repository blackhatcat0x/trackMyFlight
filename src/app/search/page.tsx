'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
// Define Flight interface locally since we're not using shared
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

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState<'flight' | 'route' | 'airport'>('flight')
  const [searchResults, setSearchResults] = useState<Flight[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const router = useRouter()

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setIsSearching(true)
    setSearchError(null)
    setHasSearched(true)

    try {
      const response = await fetch(`/api/flights?search=${encodeURIComponent(searchQuery.trim())}&page=1&pageSize=10`)
      const result = await response.json()
      
      if (response.ok) {
        setSearchResults(result.flights)
        
        if (result.flights.length === 0) {
          setSearchError(`No flights found for "${searchQuery}"`)
        }
      } else {
        throw new Error(result.error || 'Search failed')
      }
    } catch (error) {
      console.error('Search failed:', error)
      setSearchError('Search failed. Please try again.')
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleFlightClick = (flight: Flight) => {
    // Navigate to flight details page
    router.push(`/flight/${flight.id}`)
  }

  const handleBack = () => {
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col">
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
                <h1 className="text-2xl font-bold text-white">Flight Search</h1>
              </div>
            </div>
          </div>
        </div>

        {/* Search Form */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20">
              <div className="text-center mb-8">
                <div className="mb-4 relative">
                  <div className="absolute inset-0 bg-cyan-400 rounded-full blur-2xl opacity-20 animate-pulse mx-auto w-16 h-16"></div>
                  <div className="relative z-10 text-4xl">✈️</div>
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">Search Flights</h2>
                <p className="text-blue-200">Find any flight in real-time</p>
              </div>
              
              {/* Search Type Selector */}
              <div className="flex gap-2 mb-6 bg-white/10 rounded-lg p-1 backdrop-blur-sm">
                <button
                  onClick={() => setSearchType('flight')}
                  className={`flex-1 py-3 px-4 rounded-md transition-all transform hover:scale-105 ${
                    searchType === 'flight' 
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg' 
                      : 'text-blue-200 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span className="block text-sm font-medium">Flight Number</span>
                  <span className="block text-xs opacity-75">AA123</span>
                </button>
                <button
                  onClick={() => setSearchType('route')}
                  className={`flex-1 py-3 px-4 rounded-md transition-all transform hover:scale-105 ${
                    searchType === 'route' 
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg' 
                      : 'text-blue-200 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span className="block text-sm font-medium">Route</span>
                  <span className="block text-xs opacity-75">JFK-LAX</span>
                </button>
                <button
                  onClick={() => setSearchType('airport')}
                  className={`flex-1 py-3 px-4 rounded-md transition-all transform hover:scale-105 ${
                    searchType === 'airport' 
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg' 
                      : 'text-blue-200 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span className="block text-sm font-medium">Airport</span>
                  <span className="block text-xs opacity-75">JFK</span>
                </button>
              </div>

              {/* Search Form */}
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-6 w-6 text-blue-300 group-hover:text-blue-200 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      searchType === 'flight' ? 'Enter flight number (e.g., AA123)' :
                      searchType === 'route' ? 'Enter route (e.g., JFK-LAX)' :
                      'Enter airport code (e.g., JFK)'
                    }
                    className="w-full pl-12 pr-4 py-4 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent focus:bg-white/20 transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-blue-300 hover:text-white transition-colors"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold py-4 px-8 rounded-xl transition-all transform hover:scale-105 shadow-xl hover:shadow-2xl"
                >
                  Search Flights
                </button>
              </form>

              {/* Search Results */}
              {hasSearched && (
                <div className="mt-8">
                  {isSearching ? (
                    <div className="text-center py-8">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                      <p className="text-blue-200 mt-2">Searching flights...</p>
                    </div>
                  ) : searchError ? (
                    <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-center">
                      <div className="text-red-300 mb-2">⚠️</div>
                      <p className="text-white font-medium">{searchError}</p>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">
                        Found {searchResults.length} flight{searchResults.length !== 1 ? 's' : ''}
                      </h3>
                      <div className="space-y-3">
                        {searchResults.map((flight) => (
                          <div
                            key={flight.id}
                            onClick={() => handleFlightClick(flight)}
                            className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-all cursor-pointer transform hover:scale-102 hover:shadow-xl"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="text-2xl">✈️</div>
                                <div>
                                  <div className="font-bold text-white text-lg">
                                    {flight.flightNumber}
                                  </div>
                                  <div className="text-blue-200 text-sm">
                                    {flight.airline.name}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="flex items-center gap-2 text-white">
                                  <div className="text-center">
                                    <div className="font-medium">{flight.origin.code}</div>
                                    <div className="text-xs text-blue-200">{flight.origin.city}</div>
                                  </div>
                                  <div className="text-blue-400">→</div>
                                  <div className="text-center">
                                    <div className="font-medium">{flight.destination.code}</div>
                                    <div className="text-xs text-blue-200">{flight.destination.city}</div>
                                  </div>
                                </div>
                                <div className="mt-1">
                                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
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
                            </div>
                            {flight.currentPosition && (
                              <div className="mt-3 pt-3 border-t border-white/10">
                                <div className="flex items-center gap-4 text-sm text-blue-200">
                                  <span>Alt: {Math.round(flight.currentPosition.altitude)}ft</span>
                                  <span>Speed: {Math.round(flight.currentPosition.speed)}kts</span>
                                  <span>Heading: {Math.round(flight.currentPosition.heading)}°</span>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Popular Searches */}
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">🔥</span>
                  Popular Searches
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { term: 'AA123', desc: 'New York to LA' },
                    { term: 'UA456', desc: 'Chicago to Miami' },
                    { term: 'EZY82EY', desc: 'easyJet Flight' },
                    { term: 'EZY8456', desc: 'London to Barcelona' },
                    { term: 'LHR-JFK', desc: 'London to NYC' },
                    { term: 'RYR1234', desc: 'Ryanair Flight' }
                  ].map((item) => (
                    <button
                      key={item.term}
                      onClick={() => setSearchQuery(item.term)}
                      className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-blue-200 hover:text-white py-3 px-4 rounded-xl text-sm transition-all transform hover:scale-105 border border-white/20 hover:border-white/30 text-left"
                    >
                      <div className="font-medium text-white">{item.term}</div>
                      <div className="text-xs opacity-75">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Features */}
              <div className="mt-8 pt-6 border-t border-white/20">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <div className="text-2xl mb-1">⚡</div>
                    <div className="text-sm font-medium text-white">Real-time</div>
                    <div className="text-xs text-blue-200">Live updates</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <div className="text-2xl mb-1">🌍</div>
                    <div className="text-sm font-medium text-white">Global</div>
                    <div className="text-xs text-blue-200">Worldwide coverage</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <div className="text-2xl mb-1">📱</div>
                    <div className="text-sm font-medium text-white">Mobile</div>
                    <div className="text-xs text-blue-200">Any device</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
