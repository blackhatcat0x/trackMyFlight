// src/app/api/flights/route.ts
import { planeFinderScraper } from '@/lib/planefinder-scraper';
import axios from 'axios';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Live Flight Search with PlaneFinder Enhancement
 * - Uses live tracking data from Airplanes.live and ADS-B Exchange
 * - Enriches with PlaneFinder.net data for airport details, flags, aircraft info
 * - Completely independent of Aviationstack
 * - Supports flight number search (EZY8456, U28456, etc.)
 */

// ----------------------------
// Helpers
// ----------------------------

function normalizeQuery(raw?: string): string {
  return (raw || '').toUpperCase().replace(/\s+/g, '')
}

function buildVariants(q: string): string[] {
  // Return list of plausible flight identifiers (ICAO/IATA variants)
  const out = new Set<string>([q])
  
  // Add common easyJet variants
  if (q.startsWith('EZY')) {
    out.add(q.replace('EZY', 'U2')) // ICAO -> IATA
    out.add(q.replace('EZY', 'EZY')) // Keep ICAO
  } else if (q.startsWith('U2')) {
    out.add(q.replace('U2', 'EZY')) // IATA -> ICAO
    out.add(q.replace('U2', 'U2'))   // Keep IATA
  }
  
  // Add Ryanair variants
  if (q.startsWith('RYR')) {
    out.add(q.replace('RYR', 'FR')) // ICAO -> IATA
    out.add(q.replace('RYR', 'RYR')) // Keep ICAO
  } else if (q.startsWith('FR')) {
    out.add(q.replace('FR', 'RYR')) // IATA -> ICAO
    out.add(q.replace('FR', 'FR'))   // Keep IATA
  }
  
  // Add British Airways variants
  if (q.startsWith('BAW')) {
    out.add(q.replace('BAW', 'BA')) // ICAO -> IATA
    out.add(q.replace('BAW', 'BAW')) // Keep ICAO
  } else if (q.startsWith('BA')) {
    out.add(q.replace('BA', 'BAW')) // IATA -> ICAO
    out.add(q.replace('BA', 'BA'))   // Keep IATA
  }
  
  return Array.from(out)
}

function inferAirlineFromPrefix(q: string) {
  const prefix = q.match(/^([A-Z]{2,3})/)?.[1]
  if (!prefix) return null
  
  if (prefix === 'EZY' || prefix === 'U2') {
    return { code: prefix === 'EZY' ? 'EZY' : 'U2', name: 'easyJet' }
  }
  if (prefix === 'RYR' || prefix === 'FR') {
    return { code: prefix === 'RYR' ? 'RYR' : 'FR', name: 'Ryanair' }
  }
  if (prefix === 'BAW' || prefix === 'BA') {
    return { code: prefix === 'BAW' ? 'BAW' : 'BA', name: 'British Airways' }
  }
  
  return { code: prefix, name: 'Unknown Airline' }
}

// ----------------------------
// Live Tracking Data Sources
// ----------------------------

type LiveAircraft = {
  hex?: string
  flight?: string
  lat?: number
  lon?: number
  alt_baro?: number | null
  alt_geom?: number | null
  gs?: number | null
  track?: number | null
  seen?: number | null
  seen_pos?: number | null
}

// Airplanes.live API
const airplanesLiveApi = axios.create({
  baseURL: 'https://api.airplanes.live/v2',
  timeout: 12000,
  headers: { 
    'User-Agent': 'TrackMyFlight-App/1.0',
    'Connection': 'keep-alive'
  },
})

async function fetchLiveByCallsign(callsign: string): Promise<LiveAircraft | null> {
  try {
    const { data } = await airplanesLiveApi.get(`/callsign/${encodeURIComponent(callsign)}`)
    const ac = Array.isArray(data?.ac) ? data.ac : []
    if (!ac.length) return null
    
    // Prefer aircraft with current position
    const withPos = ac.filter((a: any) => typeof a.lat === 'number' && typeof a.lon === 'number')
    const best = (withPos[0] || ac[0]) as LiveAircraft
    return { ...best, source: 'airplanes.live' } as any
  } catch (error) {
    console.warn(`Airplanes.live failed for ${callsign}:`, error instanceof Error ? error.message : String(error))
    return null
  }
}

// ADS-B Exchange API
const ADSBEX_RAPIDAPI_KEY = process.env.ADSBEX_RAPIDAPI_KEY || ''

async function fetchLiveByCallsignAdsbx(callsign: string): Promise<LiveAircraft | null> {
  if (!ADSBEX_RAPIDAPI_KEY) return null
  
  try {
    const url = `https://adsbexchange-com1.p.rapidapi.com/v2/callsign/${encodeURIComponent(callsign)}`
    const { data } = await axios.get(url, {
      headers: {
        'X-RapidAPI-Key': ADSBEX_RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'adsbexchange-com1.p.rapidapi.com',
      },
      timeout: 12000,
    })
    
    const ac = Array.isArray(data?.ac) ? data.ac : []
    if (!ac.length) return null
    
    const withPos = ac.filter((a: any) => typeof a.lat === 'number' && typeof a.lon === 'number')
    return { ...(withPos[0] || ac[0]), source: 'adsbx' } as any
  } catch (error) {
    console.warn(`ADS-B Exchange failed for ${callsign}:`, error instanceof Error ? error.message : String(error))
    return null
  }
}


// Fallback live fetch (try all sources)
async function fetchLiveAny(callsign: string): Promise<LiveAircraft | null> {
  console.log(`🔍 Searching for live data: ${callsign}`)
  
  // Try Airplanes.live first (best coverage)
  let live = await fetchLiveByCallsign(callsign)
  if (live) {
    console.log(`✅ Found live data from Airplanes.live: ${callsign}`)
    return live
  }
  
  // Try ADS-B Exchange
  live = await fetchLiveByCallsignAdsbx(callsign)
  if (live) {
    console.log(`✅ Found live data from ADS-B Exchange: ${callsign}`)
    return live
  }
  
  
  console.log(`❌ No live data found for: ${callsign}`)
  return null
}

// ----------------------------
// Rate Limiting
// ----------------------------

const requestCache = new Map<string, { count: number; resetTime: number; lastRequest: number }>()
const RATE_LIMIT_WINDOW = 60000 // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30
const MIN_REQUEST_INTERVAL = 2000 // 2 seconds between requests

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const existing = requestCache.get(ip)
  
  if (!existing || now > existing.resetTime) {
    requestCache.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
      lastRequest: now
    })
    return true
  }
  
  if (now - existing.lastRequest < MIN_REQUEST_INTERVAL) {
    return false
  }
  
  if (existing.count >= MAX_REQUESTS_PER_WINDOW) {
    return false
  }
  
  existing.count++
  existing.lastRequest = now
  return true
}

// ----------------------------
// Handler
// ----------------------------

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('query') || searchParams.get('q') || ''
  const debugFlag = searchParams.get('debug') === '1' || process.env.DEBUG_FLIGHTS === '1'

  // Rate limiting
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json({
      error: 'Rate Limit Exceeded',
      message: 'Too many requests. Please wait a moment before trying again.',
      retryAfter: Math.ceil(RATE_LIMIT_WINDOW / 1000)
    }, { 
      status: 429,
      headers: {
        'Retry-After': Math.ceil(RATE_LIMIT_WINDOW / 1000).toString()
      }
    })
  }

  if (!query.trim()) {
    return NextResponse.json({ error: 'Missing ?query=' }, { status: 400 })
  }

  const qNorm = normalizeQuery(query)
  const csCandidates = buildVariants(qNorm)
  
  console.log(`🛫 Flight search request: ${qNorm}`)
  console.log(`🔍 Testing callsign variants: ${csCandidates.join(', ')}`)
  
  const debugInfo: any = debugFlag ? { 
    qNorm, 
    candidates: csCandidates,
    sources: []
  } : undefined

  // Try to get live data for each callsign variant
  const liveResults = []
  
  for (const cs of csCandidates) {
    const live = await fetchLiveAny(cs)
    if (live) {
      // Extract airline info
      const airlineInfo = inferAirlineFromPrefix(cs)
      const airlineCode = airlineInfo?.code || 'UNK'
      const airlineName = airlineInfo?.name || 'Unknown Airline'
      
      // Create base flight object from live data
      const liveFlight = {
        id: `live_${cs}_${Date.now()}`,
        flightNumber: live.flight?.trim() || cs,
        airline: {
          code: airlineCode,
          name: airlineName,
        },
        origin: {
          code: null,
          name: null,
          city: null,
          country: null,
          timezone: null,
          latitude: live.lat || null,
          longitude: live.lon || null,
          scheduledTime: null,
          actualTime: null,
          terminal: null,
          gate: null,
          flag: null,
        },
        destination: {
          code: null,
          name: null,
          city: null,
          country: null,
          timezone: null,
          latitude: null,
          longitude: null,
          scheduledTime: null,
          actualTime: null,
          terminal: null,
          gate: null,
          baggage: null,
          flag: null,
        },
        status: 'departed',
        aircraft: {
          registration: live.hex || null,
          model: null,
          icao24: live.hex || null,
        },
        live: {
          source: (live as any).source || null,
          callsign: (live.flight || '').trim() || null,
          hex: live.hex || null,
          lat: live.lat || null,
          lon: live.lon || null,
          altitudeFt: (live.alt_geom ?? live.alt_baro) || null,
          groundSpeedKt: live.gs || null,
          trackDeg: live.track || null,
          seenSec: live.seen || null,
          seenPosSec: null,
        },
        raw: process.env.NODE_ENV === 'development' ? live : undefined,
      }
      
      // Enhance with PlaneFinder data (adds flags, airport details, aircraft info, etc.)
      try {
        const enrichedFlight = await planeFinderScraper.enrichFlightData(liveFlight)
        
        // Add enrichedTiming for the UI if we have the data
        if (enrichedFlight.origin?.scheduledTime && enrichedFlight.destination?.scheduledTime) {
          enrichedFlight.enrichedTiming = {
            departure: {
              time: enrichedFlight.origin.scheduledTime,
              timezone: enrichedFlight.origin.timezone || ''
            },
            arrival: {
              time: enrichedFlight.destination.scheduledTime,
              timezone: enrichedFlight.destination.timezone || ''
            }
          }
        }
        
        liveResults.push(enrichedFlight)
        console.log(`✅ Enhanced with PlaneFinder data: ${cs}`)
        console.log(`   Origin: ${enrichedFlight.origin.code} ${enrichedFlight.origin.flag || '(no flag)'} ${enrichedFlight.origin.city}`)
        console.log(`   Dest: ${enrichedFlight.destination.code} ${enrichedFlight.destination.flag || '(no flag)'} ${enrichedFlight.destination.city}`)
        
        if (debugFlag) {
          debugInfo.sources.push({
            callsign: cs,
            liveSource: (live as any).source,
            planeFinderEnriched: true,
            hasFlag: !!(enrichedFlight.origin.flag && enrichedFlight.destination.flag),
            originFlag: enrichedFlight.origin.flag,
            destFlag: enrichedFlight.destination.flag
          })
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.warn(`❌ Failed to enrich with PlaneFinder: ${cs}`, errorMessage)
        liveResults.push(liveFlight)
        
        if (debugFlag) {
          debugInfo.sources.push({
            callsign: cs,
            liveSource: (live as any).source,
            planeFinderEnriched: false,
            error: errorMessage
          })
        }
      }
    }
  }

  if (liveResults.length > 0) {
    console.log(`🎉 Found ${liveResults.length} flight(s) with enhanced data!`)
    
    return NextResponse.json({
      flights: liveResults,
      note: 'Live flight tracking with PlaneFinder enhancement - showing flags, airport details, and aircraft information.',
      debug: debugFlag ? debugInfo : undefined
    })
  }

  // No live data found
  console.log(`❌ No live tracking data found for: ${qNorm}`)
  
  return NextResponse.json({
    flights: [],
    note: `No live tracking data found for "${qNorm}". The flight may not be currently airborne or may not be broadcasting ADS-B signals. Try searching for active flights or check the flight number format.`,
    debug: debugFlag ? { 
      ...debugInfo, 
      suggestions: [
        'Try easyJet flights: EZY1234, U21234',
        'Try Ryanair flights: RYR1234, FR1234', 
        'Try British Airways flights: BAW123, BA1234',
        'Make sure the flight is currently in the air'
      ]
    } : undefined
  })
}