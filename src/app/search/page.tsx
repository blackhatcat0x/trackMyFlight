//file: src/app/search/page.tsx
'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

type Live = {
  source?: 'airplanes.live' | 'adsbx' | null
  callsign?: string | null
  lat?: number | null
  lon?: number | null
  altitudeFt?: number | null
  groundSpeedKt?: number | null
  trackDeg?: number | null
  seenSec?: number | null
  seenPosSec?: number | null
}

type Flight = {
  id: string
  flightNumber: string
  airline: { code: string; name: string }
  origin: {
    code: string | null
    name: string | null
    city: string | null
    country: string | null
    countryCode?: string | null
    latitude?: number | null
    longitude?: number | null
    timezone?: string | null
    scheduledTime?: string | null
    actualTime?: string | null
    terminal?: string | null
    gate?: string | null
    flag?: string | null
  }
  destination: {
    code: string | null
    name: string | null
    city: string | null
    country: string | null
    countryCode?: string | null
    latitude?: number | null
    longitude?: number | null
    timezone?: string | null
    scheduledTime?: string | null
    actualTime?: string | null
    terminal?: string | null
    gate?: string | null
    baggage?: string | null
    flag?: string | null
  }
  status: 'scheduled' | 'departed' | 'arrived' | 'delayed' | 'cancelled' | 'diverted' | 'unknown'
  aircraft?: { registration?: string | null; model?: string | null; icao24?: string | null } | null
  live?: Live | null
  enrichedTiming?: {
    departure: { time: string; timezone: string }
    arrival: { time: string; timezone: string }
  }
  sources?: {
    planefinder?: {
      scrapedAt: string
      status: string
    }
  }
  raw?: any
}

function toISODate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [searchType, setSearchType] = useState<'flight' | 'route' | 'airport'>('flight')
  const [searchResults, setSearchResults] = useState<Flight[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [dateStr, setDateStr] = useState<string>('')
  const [debug, setDebug] = useState<boolean>(false)
  const router = useRouter()

  const todayISO = useMemo(() => toISODate(new Date()), [])
  const tomorrowISO = useMemo(() => {
    const t = new Date()
    t.setDate(t.getDate() + 1)
    return toISODate(t)
  }, [])

  const prettyDate = useMemo(() => {
    if (!dateStr) return ''
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  }, [dateStr])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate input based on search type
    if (searchType === 'route') {
      if (!origin.trim() || !destination.trim()) return
    } else {
      if (!searchQuery.trim()) return
    }

    setIsSearching(true)
    setSearchError(null)
    setHasSearched(true)

    try {
      const params = new URLSearchParams()
      
      if (searchType === 'route') {
        const routeQuery = `${origin.trim().toUpperCase()}-${destination.trim().toUpperCase()}`
        params.set('query', routeQuery)
      } else {
        params.set('query', searchQuery.trim())
      }
      
      params.set('type', searchType)
      if (dateStr) params.set('date', dateStr)
      if (debug) params.set('debug', '1')

      const response = await fetch(`/api/flights?${params.toString()}`)
      const result = await response.json()

      if (response.ok) {
        const flights: Flight[] = Array.isArray(result?.flights) ? result.flights : []
        
        // Debug logging
        if (flights.length > 0) {
          console.log('=== Flight Data Debug ===')
          console.log('Origin flag:', flights[0]?.origin?.flag)
          console.log('Origin flag type:', typeof flights[0]?.origin?.flag)
          console.log('Destination flag:', flights[0]?.destination?.flag)
          console.log('Destination flag type:', typeof flights[0]?.destination?.flag)
          console.log('Full origin:', flights[0]?.origin)
          console.log('Full destination:', flights[0]?.destination)
        }
        
        setSearchResults(flights)

        if (flights.length === 0) {
          let searchDisplay = searchType === 'route' 
            ? `${origin.trim().toUpperCase()}-${destination.trim().toUpperCase()}`
            : searchQuery.trim()
          const msg = result?.note || `No ${searchType}s found for "${searchDisplay}"${dateStr ? ` on ${prettyDate}` : ''}`
          setSearchError(msg)
        }
      } else {
        // Handle specific error types
        if (result.error === 'Aviationstack API Unavailable') {
          setSearchError(`⚠️ Flight data service temporarily unavailable\n\n${result.message}\n\nPlease try again in a moment.`)
        } else if (result.error === 'API Plan Limitation') {
          setSearchError(`${result.message}\n\n💡 ${result.suggestion}`)
        } else if (result.error === 'HTTPS Not Supported') {
          setSearchError(`${result.message}\n\n💡 ${result.suggestion}`)
        } else {
          throw new Error(result.error || result.message || 'Search failed')
        }
      }
    } catch (error) {
      console.error('Search failed:', error)
      setSearchError('Search failed. Please check your API key and try again.')
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleFlightClick = (flight: Flight) => {
    router.push(`/flight/${encodeURIComponent(flight.id)}`)
  }

  const handleBack = () => {
    router.push('/')
  }

  const statusBadge = (status: Flight['status']) => {
    const base = 'inline-block px-2 py-1 rounded-full text-xs font-medium'
    switch (status) {
      case 'departed':
        return `${base} bg-green-500/30 text-green-300`
      case 'arrived':
        return `${base} bg-blue-500/30 text-blue-300`
      case 'delayed':
        return `${base} bg-orange-500/30 text-orange-300`
      case 'cancelled':
        return `${base} bg-red-500/30 text-red-300`
      case 'diverted':
        return `${base} bg-yellow-500/30 text-yellow-300`
      case 'scheduled':
      default:
        return `${base} bg-gray-500/30 text-gray-300`
    }
  }

  const sourceBadge = (src?: Live['source']) => {
    if (!src) return null
    const map: Record<NonNullable<Live['source']>, string> = {
      'airplanes.live': 'bg-purple-500/30 text-purple-200',
      adsbx: 'bg-emerald-500/30 text-emerald-200',
    }
    const cls = map[src] || 'bg-gray-500/30 text-gray-200'
    return <span className={`ml-2 inline-block px-2 py-0.5 rounded-full text-[10px] ${cls}`}>{src}</span>
  }

  const liveLine = (live?: Live | null) => {
    if (!live) return null
    const parts: string[] = []
    if (typeof live.altitudeFt === 'number') parts.push(`Alt: ${Math.round(live.altitudeFt)} ft`)
    if (typeof live.groundSpeedKt === 'number') parts.push(`Speed: ${Math.round(live.groundSpeedKt)} kts`)
    if (typeof live.trackDeg === 'number') parts.push(`Heading: ${Math.round(live.trackDeg)}°`)
    if (typeof live.lat === 'number' && typeof live.lon === 'number')
      parts.push(`Pos: ${live.lat.toFixed(3)}, ${live.lon.toFixed(3)}`)
    return parts.join(' • ')
  }

  const getPlaceholderText = () => {
    switch (searchType) {
      case 'flight':
        return 'Enter flight number (e.g., EZY8456 or U28456)'
      case 'route':
        return 'Enter route (e.g., LHR-BCN)'
      case 'airport':
        return 'Enter airport code (e.g., LHR)'
      default:
        return 'Enter search query'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Animated background */}
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
              <button onClick={handleBack} className="text-white hover:text-blue-300 transition-colors p-2">
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

        {/* Search Section */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20">
              <div className="text-center mb-8">
                <div className="mb-4 relative flex justify-center">
                  <div className="absolute inset-0 bg-cyan-400 rounded-full blur-2xl opacity-20 animate-pulse mx-auto w-72 h-44"></div>
                  <div className="relative z-10">
                    <Image
                      src="/img/page-logo.png"
                      alt="TrackMyFlight Logo"
                      width={200}
                      height={121}
                      className="object-contain h-full"
                    />
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">Search Flights</h2>
                <p className="text-blue-200">Find flights, routes, or airports in real-time</p>
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
                  <span className="block text-xs opacity-75">EZY8456 or U28456</span>
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
                  <span className="block text-xs opacity-75">LHR-BCN</span>
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
                  <span className="block text-xs opacity-75">LHR</span>
                </button>
              </div>

              {/* Date Quick Pick - Today/Tomorrow Only */}
              <div className="mb-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setDateStr(dateStr === todayISO ? '' : todayISO)}
                      className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all transform hover:scale-105 ${
                        dateStr === todayISO
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg border-blue-400/50'
                          : 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-200 hover:text-white hover:from-blue-500/30 hover:to-cyan-500/30 border border-blue-400/30 hover:border-blue-400/50'
                      }`}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => setDateStr(dateStr === tomorrowISO ? '' : tomorrowISO)}
                      className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all transform hover:scale-105 ${
                        dateStr === tomorrowISO
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg border-blue-400/50'
                          : 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-200 hover:text-white hover:from-blue-500/30 hover:to-cyan-500/30 border border-blue-400/30 hover:border-blue-400/50'
                      }`}
                    >
                      Tomorrow
                    </button>
                    {dateStr && (
                      <span className="text-sm text-blue-200 min-w-fit">
                        <span className="text-white font-medium">{prettyDate}</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {dateStr && (
                      <button
                        type="button"
                        onClick={() => setDateStr('')}
                        className="px-3 py-2.5 rounded-lg text-sm font-medium bg-white/5 text-blue-200 hover:text-white hover:bg-white/15 border border-white/10 hover:border-white/20 transition-all"
                      >
                        Clear
                      </button>
                    )}
                    <label className="flex items-center gap-2 text-sm text-blue-200 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={debug}
                        onChange={(e) => setDebug(e.target.checked)}
                        className="rounded"
                      />
                      Debug
                    </label>
                  </div>
                </div>
              </div>

              {/* Search Form */}
              <form onSubmit={handleSearch} className="space-y-4">
                {searchType === 'route' ? (
                  // Route search with two inputs
                  <div className="flex items-center gap-3">
                    {/* Origin input */}
                    <div className="relative group flex-1">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg
                          className="h-5 w-5 text-blue-300 group-hover:text-blue-200 transition-colors"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                          />
                        </svg>
                      </div>
                      <input
                        type="text"
                        value={origin}
                        onChange={(e) => setOrigin(e.target.value.toUpperCase())}
                        placeholder="From (e.g., LHR)"
                        className="w-full pl-12 pr-4 py-4 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent focus:bg-white/20 transition-all"
                        maxLength={3}
                      />
                      {origin && (
                        <button
                          type="button"
                          onClick={() => setOrigin('')}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-blue-300 hover:text-white transition-colors"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Arrow */}
                    <div className="flex items-center justify-center">
                      <svg
                        className="w-8 h-8 text-blue-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M14 5l7 7m0 0l-7 7m7-7H3"
                        />
                      </svg>
                    </div>

                    {/* Destination input */}
                    <div className="relative group flex-1">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg
                          className="h-5 w-5 text-blue-300 group-hover:text-blue-200 transition-colors"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                          />
                        </svg>
                      </div>
                      <input
                        type="text"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value.toUpperCase())}
                        placeholder="To (e.g., BCN)"
                        className="w-full pl-12 pr-4 py-4 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent focus:bg-white/20 transition-all"
                        maxLength={3}
                      />
                      {destination && (
                        <button
                          type="button"
                          onClick={() => setDestination('')}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-blue-300 hover:text-white transition-colors"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  // Single input for flight and airport search
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg
                        className="h-6 w-6 text-blue-300 group-hover:text-blue-200 transition-colors"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={getPlaceholderText()}
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
                )}

                <button
                  type="submit"
                  disabled={isSearching || (searchType === 'route' && (!origin.trim() || !destination.trim())) || (searchType !== 'route' && !searchQuery.trim())}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold py-4 px-8 rounded-xl transition-all transform hover:scale-105 shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSearching ? 'Searching...' : 'Search Flights'}
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
                        {dateStr && (
                          <span className="ml-2 text-xs text-blue-200">
                            on <span className="text-white">{prettyDate}</span>
                          </span>
                        )}
                      </h3>

                      {/* Debug flag rendering */}
{searchResults.length > 0 && (
  <div className="mb-4 p-4 bg-yellow-500/20 rounded">
    <p>Flag test: {searchResults[0].origin.flag} {searchResults[0].destination.flag}</p>
    <p>Raw: origin={JSON.stringify(searchResults[0].origin.flag)} dest={JSON.stringify(searchResults[0].destination.flag)}</p>
  </div>
)}


                      <div className="space-y-3">
                        {searchResults.map((flight) => (
                          <div
                            key={flight.id}
                            onClick={() => handleFlightClick(flight)}
                            className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-all cursor-pointer transform hover:scale-102 hover:shadow-xl"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-4 min-w-0">
                                <div className="text-2xl shrink-0">✈️</div>
                                <div className="min-w-0">
                                  <div className="font-bold text-white text-lg truncate">{flight.flightNumber}</div>
                                  <div className="text-blue-200 text-sm truncate">{flight.airline.name}</div>
                                  {flight.live?.callsign && (
                                    <div className="text-[11px] text-blue-300 mt-0.5 truncate">
                                      Callsign: {flight.live.callsign}
                                      {sourceBadge(flight.live.source || undefined)}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="flex items-center gap-2 text-white justify-end">
                                  <div className="text-center min-w-[80px]">
                                    <div className="flex items-center justify-center gap-1">
                                     {flight.origin.flag && <span className="text-lg">{flight.origin.flag}</span>}
                                      <div className="font-medium">{flight.origin.code || '-'}</div>
                                    </div>
                                    <div className="text-xs text-blue-200 truncate max-w-[100px]">
                                      {flight.origin.city || ''}
                                    </div>
                                  </div>
                                  <div className="text-blue-400">→</div>
                                  <div className="text-center min-w-[80px]">
                                    <div className="flex items-center justify-center gap-1">
                                      {flight.destination.flag && <span className="text-lg">{flight.destination.flag}</span>}
                                      <div className="font-medium">{flight.destination.code || '-'}</div>
                                    </div>
                                    <div className="text-xs text-blue-200 truncate max-w-[100px]">
                                      {flight.destination.city || ''}
                                    </div>
                                  </div>
                                </div>
                                <div className="mt-1">
                                  <span className={statusBadge(flight.status)}>
                                    {flight.status.charAt(0).toUpperCase() + flight.status.slice(1)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {flight.enrichedTiming && (
                              <div className="mt-3 pt-3 border-t border-white/10">
                                <div className="flex items-center gap-4 text-sm text-blue-200">
                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Departure: {flight.enrichedTiming.departure.time} {flight.enrichedTiming.departure.timezone}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                    </svg>
                                    <span>Arrival: {flight.enrichedTiming.arrival.time} {flight.enrichedTiming.arrival.timezone}</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {flight.aircraft && (flight.aircraft.model || flight.aircraft.registration) && (
                              <div className="mt-2 pb-3 border-t border-white/10">
                                <div className="flex items-center gap-4 text-sm text-blue-200">
                                  <svg className="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0l2-2m0 0l7-7m7 7l-7-7m0 0l2-2m-2 2h8M3 17V7a2 2 0 012-2h8a2 2 0 012 2v10M3 7a2 2 0 012-2h8a2 2 0 012 2M9 3a1 1 0 011-1h4a1 1 0 011 1H8z" />
                                  </svg>
                                  <div>
                                    {flight.aircraft.model && <span className="mr-3">{flight.aircraft.model}</span>}
                                    {flight.aircraft.registration && <span className="text-blue-300">({flight.aircraft.registration})</span>}
                                  </div>
                                </div>
                              </div>
                            )}

                            {flight.live && liveLine(flight.live) && (
                              <div className="mt-3 pt-3 border-t border-white/10">
                                <div className="flex items-center gap-4 text-sm text-blue-200">
                                  <span>{liveLine(flight.live)}</span>
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
                    { term: 'EZY8456', desc: 'easyJet (ICAO)' },
                    { term: 'U28456', desc: 'easyJet (IATA)' },
                    { term: 'BA2490', desc: 'British Airways' },
                    { term: 'RYR1234', desc: 'Ryanair' },
                    { term: 'LHR-BCN', desc: 'London to Barcelona' },
                    { term: 'LHR', desc: 'Heathrow Airport' },
                  ].map((item) => (
                    <button
                      key={item.term}
                      onClick={() => {
                        if (item.term.includes('-')) {
                          const [from, to] = item.term.split('-')
                          setSearchType('route')
                          setOrigin(from)
                          setDestination(to)
                          setSearchQuery('')
                        } else if (item.term.length === 3 && !item.term.match(/\d/)) {
                          setSearchType('airport')
                          setSearchQuery(item.term)
                          setOrigin('')
                          setDestination('')
                        } else {
                          setSearchType('flight')
                          setSearchQuery(item.term)
                          setOrigin('')
                          setDestination('')
                        }
                      }}
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
