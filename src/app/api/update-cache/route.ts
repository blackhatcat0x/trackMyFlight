// src/app/api/update-cache/route.ts
import fs from 'fs'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const { flightNumber, airlineName } = await request.json()

    if (!flightNumber || !airlineName) {
      return NextResponse.json(
        { error: 'Missing flightNumber or airlineName' },
        { status: 400 }
      )
    }

    const cachePath = path.join(process.cwd(), 'data', 'planefinder-cache.json')

    // Read the current cache
    let cache: Record<string, any> = {}
    try {
      const cacheData = fs.readFileSync(cachePath, 'utf8')
      cache = JSON.parse(cacheData)
    } catch (error) {
      console.warn('⚠️ Could not read cache file, creating new one')
    }

    // Update the airline name if the flight exists in cache
    if (cache[flightNumber]) {
      console.log(`📝 Updating airline for ${flightNumber}: ${airlineName}`)
      
      cache[flightNumber].data.airline = {
        ...cache[flightNumber].data.airline,
        name: airlineName
      }

      // Write back to the cache file
      fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf8')
      
      console.log(`✅ Successfully updated cache for ${flightNumber}`)
      
      return NextResponse.json({
        success: true,
        message: `Updated airline for ${flightNumber}`,
        flightNumber,
        airlineName
      })
    } else {
      console.log(`⚠️ Flight ${flightNumber} not found in cache`)
      return NextResponse.json(
        { 
          success: false,
          message: `Flight ${flightNumber} not found in cache` 
        },
        { status: 404 }
      )
    }

  } catch (error) {
    console.error('❌ Error updating cache:', error)
    return NextResponse.json(
      { error: 'Failed to update cache', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}