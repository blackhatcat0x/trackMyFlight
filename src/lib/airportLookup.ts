// lib/airportLookup.ts

export interface AirportData {
  iata: string;
  icao: string;
  name: string;
  city: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezone: string;
  flag: string; // Emoji flag
}

// Country code to flag emoji
const countryToFlag = (countryCode: string): string => {
  if (!countryCode || countryCode.length !== 2) return '🌍';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

// Cache for parsed airports
let airportCache: Map<string, AirportData> | null = null;

// Parse CSV line (handles quoted fields with commas)
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Load and parse airports from CSV
async function loadAirports(): Promise<Map<string, AirportData>> {
  if (airportCache) return airportCache;

  try {
    // For server-side (API routes), read from filesystem
    if (typeof window === 'undefined') {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const filePath = path.join(process.cwd(), 'public', 'data', 'airports.csv');
      const text = await fs.readFile(filePath, 'utf-8');
      
      return parseAirportsCSV(text);
    } 
    // For client-side, fetch from public folder
    else {
      const response = await fetch('/data/airports.csv');
      const text = await response.text();
      
      return parseAirportsCSV(text);
    }
    
  } catch (error) {
    console.error('❌ Failed to load airport database:', error);
    airportCache = new Map();
    return airportCache;
  }
}

// Extract CSV parsing into separate function
function parseAirportsCSV(text: string): Map<string, AirportData> {
  const lines = text.split('\n');
  const cache = new Map<string, AirportData>();
  
  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const fields = parseCSVLine(line);
    
    // OurAirports CSV format:
    // 0: id, 1: ident, 2: type, 3: name, 4: latitude_deg, 5: longitude_deg, 
    // 6: elevation_ft, 7: continent, 8: iso_country, 9: iso_region, 
    // 10: municipality, 11: scheduled_service, 12: gps_code, 13: iata_code, 14: local_code
    
    const iataCode = fields[13]?.replace(/"/g, '').trim();
    const icaoCode = fields[12]?.replace(/"/g, '').trim() || fields[1]?.replace(/"/g, '').trim();
    
    if (!iataCode || iataCode.length !== 3) continue;
    
    const countryCode = fields[8]?.replace(/"/g, '').trim();
    const name = fields[3]?.replace(/"/g, '').trim();
    const city = fields[10]?.replace(/"/g, '').trim();
    const lat = parseFloat(fields[4]) || 0;
    const lon = parseFloat(fields[5]) || 0;
    
    const airportData: AirportData = {
      iata: iataCode.toUpperCase(),
      icao: icaoCode?.toUpperCase() || '',
      name: name || 'Unknown Airport',
      city: city || 'Unknown City',
      country: countryCode || 'Unknown',
      countryCode: countryCode || 'XX',
      latitude: lat,
      longitude: lon,
      timezone: 'UTC', // OurAirports doesn't have timezone, could add later
      flag: countryToFlag(countryCode),
    };
    
    cache.set(iataCode.toUpperCase(), airportData);
    
    // Also add by ICAO code for flexibility
    if (icaoCode && icaoCode.length === 4) {
      cache.set(icaoCode.toUpperCase(), airportData);
    }
  }
  
  airportCache = cache;
  console.log(`✅ Loaded ${cache.size} airports from database`);
  return cache;
}

// Lookup airport by IATA or ICAO code
export async function lookupAirport(code: string): Promise<AirportData | null> {
  if (!code || code === 'UNK' || code === 'UNKNOWN') return null;
  
  const airports = await loadAirports();
  const upperCode = code.toUpperCase().trim();
  
  return airports.get(upperCode) || null;
}

// Lookup multiple airports at once
export async function lookupAirports(codes: string[]): Promise<Map<string, AirportData>> {
  const airports = await loadAirports();
  const results = new Map<string, AirportData>();
  
  for (const code of codes) {
    if (!code || code === 'UNK' || code === 'UNKNOWN') continue;
    const upperCode = code.toUpperCase().trim();
    const airport = airports.get(upperCode);
    if (airport) {
      results.set(upperCode, airport);
    }
  }
  
  return results;
}

// Search airports by name or city
export async function searchAirports(query: string, limit: number = 10): Promise<AirportData[]> {
  if (!query || query.length < 2) return [];
  
  const airports = await loadAirports();
  const queryLower = query.toLowerCase();
  const results: AirportData[] = [];
  
  // Convert Map values to array to avoid iterator issues
  const airportArray = Array.from(airports.values());
  
  for (const airport of airportArray) {
    if (results.length >= limit) break;
    
    if (
      airport.iata.toLowerCase().includes(queryLower) ||
      airport.icao.toLowerCase().includes(queryLower) ||
      airport.name.toLowerCase().includes(queryLower) ||
      airport.city.toLowerCase().includes(queryLower) ||
      airport.country.toLowerCase().includes(queryLower)
    ) {
      results.push(airport);
    }
  }
  
  return results;
}

// Get airport display string
export function formatAirportDisplay(airport: AirportData | null): string {
  if (!airport) return 'Unknown';
  return `${airport.flag} ${airport.city} (${airport.iata})`;
}

export default {
  lookupAirport,
  lookupAirports,
  searchAirports,
  formatAirportDisplay,
};