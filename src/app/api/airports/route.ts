// app/api/airports/route.ts

import { lookupAirport, searchAirports } from '@/lib/airportLookup';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const search = searchParams.get('search');
  const limit = parseInt(searchParams.get('limit') || '10');

  try {
    // Lookup by code (IATA or ICAO)
    if (code) {
      const airport = await lookupAirport(code);
      
      if (!airport) {
        return NextResponse.json(
          { error: 'Airport not found', code },
          { status: 404 }
        );
      }
      
      return NextResponse.json({ airport });
    }
    
    // Search by query
    if (search) {
      const airports = await searchAirports(search, limit);
      
      return NextResponse.json({ 
        airports,
        count: airports.length 
      });
    }
    
    return NextResponse.json(
      { error: 'Missing code or search parameter' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Airport lookup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}