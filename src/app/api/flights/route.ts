import axios, { AxiosInstance } from 'axios'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Flight search + live-position enrichment route
 * - Resolves flight by number via Aviationstack (status/schedule)
 * - Enriches with a free live position via Airplanes.live (callsign endpoint)
 * - Handles easyJet robustly (IATA U2 <-> ICAO EZY) and other common patterns
 * - Supports route search (LHR-BCN) and airport search (LHR)
 *
 * Env vars (optional but recommended):
 *   NEXT_PUBLIC_AVIATIONSTACK_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxx
 */

// ----------------------------
// Helpers
// ----------------------------

function parseFlightCode(q: string) {
  // Capture airline prefix (2-3 letters), number, optional 1-2 trailing letters
  const m = q.match(/^([A-Z]{2,3})(\d+)([A-Z]{0,2})$/)
  if (!m) return null
  return { prefix: m[1], number: m[2], suffix: m[3] || '' }
}

function parseRoute(q: string): { dep: string; arr: string } | null {
  const m = q.match(/^([A-Z]{3})-([A-Z]{3})$/)
  if (!m) return null
  return { dep: m[1], arr: m[2] }
}

function iataFromIcaoPrefix(icao: string): string | undefined {
  // reverse lookup in AIRLINE_IATA_TO_ICAO
  const entry = Object.entries(AIRLINE_IATA_TO_ICAO).find(([, v]) => v === icao)
  return entry?.[0]
}

function buildVariants(q: string): string[] {
  // Return a list of plausible flight identifiers we can try to match/enrich
  const out = new Set<string>([q])
  const parsed = parseFlightCode(q)
  if (parsed) {
    const { prefix, number, suffix } = parsed
    // If EZY -> add U2 variants (drop suffix for schedule matching)
    if (prefix.length === 3) {
      out.add(`${prefix}${number}`) // numeric only
      const iata = iataFromIcaoPrefix(prefix)
      if (iata) {
        out.add(`${iata}${number}`)
        if (suffix) out.add(`${iata}${number}${suffix}`)
      }
    }
    // If IATA (2 letters) -> add ICAO variants
    if (prefix.length === 2) {
      const icao = AIRLINE_IATA_TO_ICAO[prefix]
      if (icao) {
        out.add(`${icao}${number}`)
        if (suffix) out.add(`${icao}${number}${suffix}`)
      }
      out.add(`${prefix}${number}`) // numeric only too
    }
    // Also include version without suffix if present
    if (suffix) {
      out.add(`${prefix}${number}`)
    }
  }
  return Array.from(out)
}

function matchesAnyCandidate(code: string | undefined, candidates: string[]): boolean {
  if (!code) return false
  const norm = code.replace(/\s+/g, '').toUpperCase()
  return candidates.some(c => c === norm)
}


const AIRLINE_IATA_TO_ICAO: Record<string, string> = {
  // Expand as needed
  U2: 'EZY',   // easyJet
  BA: 'BAW',   // British Airways (callsign often BAW + number)
  FR: 'RYR',   // Ryanair
  EZ: 'EZS',   // easyJet Switzerland (IATA EZ -> ICAO EZS)
}

function normalizeQuery(raw?: string): string {
  return (raw || '').toUpperCase().replace(/\s+/g, '')
}

function splitAirlineAndNumber(q: string): { airline?: string; number?: string } {
  const m = q.match(/^([A-Z]{2,3})(\d+[A-Z]?)$/)
  if (m) return { airline: m[1], number: m[2] }
  return { airline: undefined, number: undefined }
}

function iataToIcaoAirline(iata?: string): string | undefined {
  if (!iata) return undefined
  return AIRLINE_IATA_TO_ICAO[iata] // may be undefined if not mapped
}

function makeAirplanesLiveCallsign(q: string): string | undefined {
  // If query already looks like ICAO callsign (3 letters + number), use it
  if (/^[A-Z]{3}\d+[A-Z]?$/.test(q)) return q
  // If it's IATA + number, convert IATA -> ICAO using small map above
  const { airline, number } = splitAirlineAndNumber(q)
  if (airline && number) {
    const icao = iataToIcaoAirline(airline) || (airline.length === 3 ? airline : undefined)
    if (icao) return `${icao}${number}`
  }
  return undefined
}

// ----------------------------
// Axios clients
// ----------------------------

const aviationStackApi: AxiosInstance = axios.create({
  baseURL: 'https://api.aviationstack.com/v1',
  timeout: 15000,
})

const airplanesLiveApi: AxiosInstance = axios.create({
  baseURL: 'https://api.airplanes.live/v2',
  timeout: 12000,
  headers: { 'User-Agent': 'TrackMyFlight-App/1.0' },
})

// ----------------------------
// Aviationstack search
// ----------------------------

type AviationFlight = {
  flight_date?: string
  flight_status?: string
  departure?: any
  arrival?: any
  airline?: { name?: string; iata?: string; icao?: string }
  flight?: { number?: string; iata?: string; icao?: string }
  aircraft?: { registration?: string; iata?: string; icao?: string; icao24?: string }
}

function buildAviationParams(
  queryRaw: string,
  searchType: 'flight' | 'route' | 'airport',
  airlineHint?: string,
  date?: string
) {
  const q = normalizeQuery(queryRaw)

  // Base params
  const params: Record<string, string | number> = {
    access_key: process.env.NEXT_PUBLIC_AVIATIONSTACK_API_KEY as string,
    limit: 10,
    offset: 0,
  }

  // IMPORTANT: Date filtering requires PAID plan (Basic or higher)
  // For FREE plan, only real-time/active flights are available
  const allowDateFilter = process.env.AVIATIONSTACK_ALLOW_DATE_FILTER === 'true'

  if (searchType === 'route') {
    // Route search: LHR-BCN
    const route = parseRoute(q)
    if (route) {
      params['dep_iata'] = route.dep
      params['arr_iata'] = route.arr
      // Only add date if explicitly allowed (paid plan)
      if (allowDateFilter && date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        params['flight_date'] = date
      }
    }
    return params
  }

  if (searchType === 'airport') {
    // Airport search: list departures from this airport
    params['dep_iata'] = q
    // Only add date if explicitly allowed (paid plan)
    if (allowDateFilter && date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      params['flight_date'] = date
    }
    return params
  }

  // Flight number search (original logic)
  // Detect by pattern
  if (/^[A-Z]{3}\d+[A-Z]{0,2}$/.test(q)) {
    // ICAO flight id (e.g., EZY1234 or EZY18YX)
    const parsed = parseFlightCode(q);
    if (parsed && parsed.suffix) {
      // Remove suffix letters for API query (EZY18YX -> EZY18)
      params['flight_icao'] = `${parsed.prefix}${parsed.number}`
    } else {
      params['flight_icao'] = q
    }
  } else if (/^[A-Z]{2}\d+[A-Z]{0,2}$/.test(q)) {
    // IATA flight id (e.g., U21234)
    const parsed2 = parseFlightCode(q);
    if (parsed2 && parsed2.suffix) {
      // Remove suffix letters for API query
      params['flight_iata'] = `${parsed2.prefix}${parsed2.number}`
    } else {
      params['flight_iata'] = q
    }
  } else if (/^\d{2,4}[A-Z]?$/.test(q)) {
    // Bare number; use airline hint if provided
    params['flight_number'] = q
    const hint = normalizeQuery(airlineHint || '')
    if (hint) {
      if (/^[A-Z]{3}$/.test(hint)) params['airline_icao'] = hint
      if (/^[A-Z]{2}$/.test(hint)) params['airline_iata'] = hint
    }
  } else {
    // As a last resort, if user typed an airline code as prefix, add airline filter
    const { airline } = splitAirlineAndNumber(q)
    if (airline) {
      if (airline.length === 3) params['airline_icao'] = airline
      if (airline.length === 2) params['airline_iata'] = airline
    }
  }

  // easyJet robustness: if query begins U2 -> also set airline_iata=U2
  if (q.startsWith('U2')) params['airline_iata'] = 'U2'
  // If begins EZY -> airline_icao=EZY
  if (q.startsWith('EZY')) params['airline_icao'] = 'EZY'

  // Optional date filter (YYYY-MM-DD) for schedule matching
  // ONLY ADD IF PAID PLAN - Free plan does NOT support date filtering
  if (allowDateFilter && date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    (params as any)['flight_date'] = date
  }
  
  return params
}

function mapStatus(apiStatus?: string): string {
  if (!apiStatus) return 'scheduled'
  const statusMap: Record<string, string> = {
    scheduled: 'scheduled',
    active: 'departed',
    departed: 'departed',
    'en-route': 'departed',
    landed: 'arrived',
    arrived: 'arrived',
    delayed: 'delayed',
    cancelled: 'cancelled',
    diverted: 'diverted',
  }
  return statusMap[apiStatus.toLowerCase()] || 'scheduled'
}

// ----------------------------
// Airplanes.live enrichment
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
  rssi?: number | null
}

async function fetchLiveByCallsign(callsign: string): Promise<LiveAircraft | null> {
  try {
    const { data } = await airplanesLiveApi.get(`/callsign/${encodeURIComponent(callsign)}`)
    const ac = Array.isArray(data?.ac) ? data.ac : []
    if (!ac.length) return null
    // Prefer aircraft with a current position (lat/lon present)
    const withPos = ac.filter((a: any) => typeof a.lat === 'number' && typeof a.lon === 'number')
    const best = (withPos[0] || ac[0]) as LiveAircraft
    return best || null
  } catch (_err) {
    return null
  }
}

// ----------------------------
// ADS-B Exchange enrichment
// ----------------------------

type AdsbxAircraft = {
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

const ADSBEX_PROVIDER = (process.env.ADSBEX_PROVIDER || 'rapidapi').toLowerCase()
const ADSBEX_ENTERPRISE_BASE = process.env.ADSBEX_ENTERPRISE_BASE || 'https://api.adsbexchange.com/v2'
const ADSBEX_ENTERPRISE_KEY = process.env.ADSBEX_ENTERPRISE_KEY || ''
const ADSBEX_RAPIDAPI_KEY = process.env.ADSBEX_RAPIDAPI_KEY || ''

async function fetchLiveByCallsignAdsbx(callsign: string): Promise<AdsbxAircraft | null> {
  try {
    if (ADSBEX_PROVIDER === 'enterprise' && ADSBEX_ENTERPRISE_KEY) {
      // Enterprise: documented v2 usually uses path /callsign/{cs} with header 'api-auth'
      const url = `${ADSBEX_ENTERPRISE_BASE.replace(/\/+$/,'')}/callsign/${encodeURIComponent(callsign)}`
      const { data } = await axios.get(url, { headers: { 'api-auth': ADSBEX_ENTERPRISE_KEY }, timeout: 12000 })
      const ac = Array.isArray(data?.ac) ? data.ac : []
      if (!ac.length) return null
      const withPos = ac.filter((a: any) => typeof a.lat === 'number' && typeof a.lon === 'number')
      return (withPos[0] || ac[0]) as AdsbxAircraft
    } else if (ADSBEX_RAPIDAPI_KEY) {
      // RapidAPI "Lite"
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
      return (withPos[0] || ac[0]) as AdsbxAircraft
    }
    return null
  } catch (_e) {
    return null
  }
}

// ----------------------------
// OpenSky Network enrichment
// ----------------------------

type OpenSkyStates = {
  time: number
  states: any[] | null
}

const OPEN_SKY_BASE = (process.env.OPENSkY_BASE || 'https://opensky-network.org').replace(/\/+$/,'')

async function fetchLiveByCallsignOpenSky(callsign: string): Promise<LiveAircraft | null> {
  try {
    // OpenSky allows a callsign filter; unauthenticated is rate-limited
    const url = `${OPEN_SKY_BASE}/api/states/all?callsign=${encodeURIComponent(callsign)}`
    const { data } = await axios.get<OpenSkyStates>(url, { timeout: 12000 })
    const states = Array.isArray((data as any)?.states) ? (data as any).states : []
    if (!states.length) return null
    // Pick the first state with a position
    const withPos = states.filter((s: any[]) => typeof s[6] === 'number' && typeof s[5] === 'number')
    const s = (withPos[0] || states[0]) as any[]
    const rec: LiveAircraft = {
      hex: s[0] || undefined,
      flight: (s[1] || '').toString().trim() || callsign,
      lat: typeof s[6] === 'number' ? s[6] : undefined,
      lon: typeof s[5] === 'number' ? s[5] : undefined,
      alt_baro: typeof s[7] === 'number' ? s[7] : null,
      alt_geom: typeof s[13] === 'number' ? s[13] : null,
      gs: typeof s[9] === 'number' ? (s[9] * 1.94384) : null, // m/s -> knots
      track: typeof s[10] === 'number' ? s[10] : null,
      seen: typeof s[4] === 'number' ? (Date.now()/1000 - s[4]) : null,
      seen_pos: typeof s[3] === 'number' ? (Date.now()/1000 - s[3]) : null,
      rssi: null,
    }
    return rec
  } catch (_e) {
    return null
  }
}

// ----------------------------
// Fallback live fetch (Airplanes.live -> ADS-B Exchange -> OpenSky)
// ----------------------------

async function fetchLiveAny(callsign: string): Promise<LiveAircraft | null> {
  // 1) Airplanes.live
  const a = await fetchLiveByCallsign(callsign)
  if (a) return { ...a, source: 'airplanes.live' } as any
  // 2) ADS-B Exchange (if configured)
  const b = await fetchLiveByCallsignAdsbx(callsign)
  if (b) return { ...b, source: 'adsbx' } as any
  // 3) OpenSky
  const c = await fetchLiveByCallsignOpenSky(callsign)
  if (c) return { ...c, source: 'opensky' } as any
  return null
}

// ----------------------------
// Handler
// ----------------------------

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('query') || searchParams.get('q') || ''
  const searchType = (searchParams.get('type') || 'flight') as 'flight' | 'route' | 'airport'
  const airlineHint = searchParams.get('airline') || ''
  const dateParam = (searchParams.get('date') || '').trim()
  const debugFlag = searchParams.get('debug') === '1' || process.env.DEBUG_FLIGHTS === '1'

  if (!query.trim()) {
    return NextResponse.json({ error: 'Missing ?query=' }, { status: 400 })
  }

  const qNorm = normalizeQuery(query)

  // If no Aviationstack key, short-circuit to live-only enrichment using callsign
  const noAviationKey = !process.env.NEXT_PUBLIC_AVIATIONSTACK_API_KEY
  if (noAviationKey) {
    const csCandidates = buildVariants(qNorm)
    const cs = csCandidates[0]
    if (!cs) {
      return NextResponse.json({ flights: [], note: 'Provide an Aviationstack key for schedule/status resolution.' })
    }
    const live = await fetchLiveAny(cs)
    return NextResponse.json({
      debug: debugFlag ? { qNorm, liveOnly: true } : undefined,
      flights: [{
        id: `live_only_${cs}`,
        flightNumber: qNorm,
        airline: inferAirlineFromPrefix(qNorm),
        status: 'unknown',
        live: live ? normalizeLive(live) : null,
      }],
      note: 'Live position via Airplanes.live (no schedule/status because no Aviationstack key provided).'
    })
  }

  try {
    // IMPORTANT: Don't pass date to buildAviationParams unless explicitly allowed
    // Free plan does NOT support date filtering
    const allowDateFilter = process.env.AVIATIONSTACK_ALLOW_DATE_FILTER === 'true'
    const dateToUse = allowDateFilter ? dateParam : undefined
    
    const params = buildAviationParams(qNorm, searchType, airlineHint || undefined, dateToUse)
    
    let data: any
    try {
      const response = await aviationStackApi.get('/flights', { params })
      data = response.data
    } catch (apiError: any) {
      // Handle Aviationstack API errors
      if (apiError.response?.status === 520 || apiError.response?.status === 503) {
        return NextResponse.json({
          error: 'Aviationstack API Unavailable',
          message: 'The flight data service is temporarily unavailable. Please try again in a few moments.',
          suggestion: 'The service provider (Aviationstack) is experiencing issues. This should resolve shortly.'
        }, { status: 503 })
      }
      throw apiError
    }

    const flights: AviationFlight[] = Array.isArray(data?.data) ? data.data : []

    // Build candidate identifiers from user query to improve precision (handles suffix letters)
    const candidates = buildVariants(qNorm)

    const debugInfo: any = debugFlag ? { qNorm, searchType, candidates, params } : undefined

    // For flight search, filter results to those matching any candidate by IATA/ICAO/number+airline where possible
    let results = flights
    
    if (searchType === 'flight') {
      const filtered = flights.filter((f) => {
        const fiata = (f.flight?.iata || '').toUpperCase().replace(/\s+/g, '')
        const ficao = (f.flight?.icao || '').toUpperCase().replace(/\s+/g, '')
        const airlineIata = (f.airline?.iata || '').toUpperCase()
        const airlineIcao = (f.airline?.icao || '').toUpperCase()
        const number = (f.flight?.number || '').toUpperCase()
        const comboIata = airlineIata && number ? `${airlineIata}${number}` : ''
        const comboIcao = airlineIcao && number ? `${airlineIcao}${number}` : ''
        return matchesAnyCandidate(fiata, candidates) || matchesAnyCandidate(ficao, candidates) || matchesAnyCandidate(comboIata, candidates) || matchesAnyCandidate(comboIcao, candidates)
      })

      results = filtered.length ? filtered : flights

      if (!results.length) {
        const altParams = { ...params }
        if (qNorm.startsWith('EZY') && !altParams['flight_iata']) {
          delete altParams['flight_icao']
          altParams['flight_iata'] = qNorm.replace(/^EZY/, 'U2')
          altParams['airline_iata'] = 'U2'
          const alt = await aviationStackApi.get('/flights', { params: altParams })
          results = Array.isArray(alt.data?.data) ? alt.data.data : []
        } else if (qNorm.startsWith('U2') && !altParams['flight_icao']) {
          delete altParams['flight_iata']
          altParams['flight_icao'] = qNorm.replace(/^U2/, 'EZY')
          altParams['airline_icao'] = 'EZY'
          const alt = await aviationStackApi.get('/flights', { params: altParams })
          results = Array.isArray(alt.data?.data) ? alt.data.data : []
        }
      }
    }

    if (!results.length) {
      // No results from Aviationstack - try live tracking as fallback
      console.log('Aviationstack returned no results, trying live tracking fallback...')
      
      if (searchType === 'flight') {
        const csVariants = buildVariants(qNorm)
        let liveData: any = null
        
        for (const cs of csVariants) {
          liveData = await fetchLiveAny(cs)
          if (liveData) {
            console.log(`Found live flight: ${cs}`)
            
            // Extract airline info from the callsign
            const airlineInfo = inferAirlineFromPrefix(cs)
            const airlineCode = airlineInfo?.code || 'UNK'
            const airlineName = airlineInfo?.name || 'Unknown Airline'
            
            // Try to extract airport codes from live data
            // Airplanes.live doesn't return dep/arr, but other sources might
            const rawLive = liveData as any
            const depCode = rawLive.dep_iata || rawLive.dep_icao || null
            const arrCode = rawLive.arr_iata || rawLive.arr_icao || null
            
            // Create a minimal flight object from live data
            const liveOnlyFlight = {
              id: `live_${cs}_${Date.now()}`,
              flightNumber: liveData.flight?.trim() || cs,
              airline: {
                code: airlineCode,
                name: airlineName,
              },
              origin: depCode ? {
                code: depCode,
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
              } : {
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
              },
              destination: arrCode ? {
                code: arrCode,
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
              } : {
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
              },
              status: 'departed' as const,
              aircraft: {
                registration: rawLive.reg_number || liveData.hex || null,
                model: rawLive.aircraft_icao || null,
                icao24: liveData.hex || null,
              },
              live: normalizeLive(liveData),
            }
            
            return NextResponse.json({
              flights: [liveOnlyFlight],
              note: 'Flight not found in Aviationstack, showing live tracking data only. Airport and schedule details may be limited.',
              source: 'live-only',
              debug: debugFlag ? { ...debugInfo, liveOnly: true, liveSource: (liveData as any).source } : undefined
            })
          }
        }
      }
      
      // No results from Aviationstack or live tracking
      const typeLabel = searchType === 'route' ? 'route' : searchType === 'airport' ? 'airport' : 'flight'
      return NextResponse.json({
        flights: [],
        note: `No ${typeLabel}s found in Aviationstack for "${query}"${dateToUse ? ` on ${dateToUse}` : ''}. Note: Free plan has limited airline coverage. Try searching without a date, or the flight may not be in the database.`,
        debug: debugFlag ? debugInfo : undefined
      })
    }

    // Map results
    const mappedFlights = results.map((f) => ({
      source: 'aviationstack',
      data: f,
    }))

    // Enrich with live data and format
    const enriched = await Promise.all(mappedFlights.slice(0, 10).map(async (item) => {
      const f = item.data
      const flightIcao = f.flight?.icao?.toUpperCase()
      const flightIata = f.flight?.iata?.toUpperCase()
      const csVariants = buildVariants((flightIcao || flightIata || qNorm))
      let live: any = null
      
      // Get live tracking from Airplanes.live (free, unlimited, best coverage)
      if (searchType === 'flight') {
        for (const cs of csVariants) { 
          live = await fetchLiveAny(cs); 
          if (live) break; 
        }
      }

      // Extract airline info - handle both Aviationstack and FlightLabs formats
      const airlineCode = f.airline?.iata || f.airline?.icao || 'UNK'
      const airlineName = f.airline?.name || 'Unknown Airline'

      return {
        id: `${(f.flight?.iata || f.flight?.icao || f.flight?.number || 'unknown')}_${f.flight_date || ''}`,
        flightNumber: f.flight?.iata || f.flight?.icao || (f.airline?.iata || f.airline?.icao ? `${f.airline?.iata || f.airline?.icao}${f.flight?.number || ''}` : f.flight?.number),
        airline: {
          code: airlineCode,
          name: airlineName,
        },
        origin: {
          code: f.departure?.iata || f.departure?.icao || null,
          name: f.departure?.airport || null,
          city: (f.departure as any)?.city || null,
          country: (f.departure as any)?.country || null,
          timezone: f.departure?.timezone || null,
          latitude: (f.departure as any)?.latitude || null,
          longitude: (f.departure as any)?.longitude || null,
          scheduledTime: f.departure?.scheduled || f.departure?.estimated || null,
          actualTime: f.departure?.actual || null,
          terminal: f.departure?.terminal || null,
          gate: f.departure?.gate || null,
        },
        destination: {
          code: f.arrival?.iata || f.arrival?.icao || null,
          name: f.arrival?.airport || null,
          city: (f.arrival as any)?.city || null,
          country: (f.arrival as any)?.country || null,
          timezone: f.arrival?.timezone || null,
          latitude: (f.arrival as any)?.latitude || null,
          longitude: (f.arrival as any)?.longitude || null,
          scheduledTime: f.arrival?.scheduled || f.arrival?.estimated || null,
          actualTime: f.arrival?.actual || null,
          terminal: f.arrival?.terminal || null,
          gate: f.arrival?.gate || null,
          baggage: f.arrival?.baggage || null,
        },
        status: mapStatus(f.flight_status),
        aircraft: {
          registration: f.aircraft?.registration || null,
          model: f.aircraft?.iata || f.aircraft?.icao || null,
          icao24: (f.aircraft as any)?.icao24 || null,
        },
        live: live,
        raw: process.env.NODE_ENV === 'development' ? f : undefined,
      }
    }))

    return NextResponse.json({ 
      flights: enriched,
      debug: debugFlag ? { ...debugInfo, resultCount: enriched.length } : undefined 
    })
  } catch (err: any) {
    console.error('Flight search error:', err?.response?.data || err?.message || err)
    
    // Check if it's a subscription plan error
    const errorCode = err?.response?.data?.error?.code
    const errorMsg = err?.response?.data?.error?.message
    
    if (errorCode === 'function_access_restricted') {
      return NextResponse.json({ 
        error: 'API Plan Limitation',
        message: 'Your Aviationstack plan does not support this feature. The FREE plan only supports real-time flight searches without date filtering. Upgrade to Basic plan ($49.99/month) for full features including historical data, routes, and date filtering.',
        suggestion: 'Try searching without selecting a date, or upgrade your plan at https://aviationstack.com/pricing',
        details: errorMsg
      }, { status: 403 })
    }
    
    if (errorCode === 'https_access_restricted') {
      return NextResponse.json({ 
        error: 'HTTPS Not Supported',
        message: 'The FREE plan does not support HTTPS. Please add AVIATIONSTACK_USE_HTTP=true to your environment variables to use HTTP instead.',
        suggestion: 'Add AVIATIONSTACK_USE_HTTP=true to your .env file'
      }, { status: 403 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to search flights',
      details: errorMsg || err?.message || 'Unknown error'
    }, { status: 500 })
  }
}

// ----------------------------
// Small helpers
// ----------------------------

function normalizeLive(a: LiveAircraft) {
  return {
    source: (a as any).source || null,
    callsign: (a.flight || '').trim() || null,
    hex: a.hex || null,
    lat: a.lat ?? null,
    lon: a.lon ?? null,
    altitudeFt: (a.alt_geom ?? a.alt_baro) ?? null,
    groundSpeedKt: a.gs ?? null,
    trackDeg: a.track ?? null,
    seenSec: a.seen ?? null,
    seenPosSec: a.seen_pos ?? null,
  }
}

// Extract airport codes from live data if available
function getAirportFromLive(iata?: string, icao?: string) {
  if (!iata && !icao) return null
  return {
    code: iata || icao || null,
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
  }
}

function inferAirlineFromPrefix(q: string) {
  const { airline } = splitAirlineAndNumber(q)
  if (!airline) return null
  if (airline.length === 2) {
    const icao = iataToIcaoAirline(airline)
    return { code: airline, icao, name: airlineNameGuess(airline, icao) }
  }
  if (airline.length === 3) {
    return { code: airline, name: airlineNameGuess(undefined, airline) }
  }
  return null
}

function airlineNameGuess(iata?: string, icao?: string) {
  const key = (iata || icao || '').toUpperCase()
  switch (key) {
    case 'U2':
    case 'EZY': return 'easyJet'
    case 'EZ':  // not a standard IATA, but included above for EZS mapping context
    case 'EZS': return 'easyJet Switzerland'
    case 'BA':
    case 'BAW': return 'British Airways'
    case 'FR':
    case 'RYR': return 'Ryanair'
    default: return 'Unknown Airline'
  }
}