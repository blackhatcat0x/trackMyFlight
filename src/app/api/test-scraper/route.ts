// app/api/test-scraper/route.ts
import { planeFinderScraper } from '@/lib/planefinder-scraper';
import { NextResponse } from 'next/server';

export async function GET() {
  console.log('🧪 Testing PlaneFinder Scraper\n');
  
  const testFlights = [
    'EZY49LE', // From your HTML example
    'U22767',  // IATA variant
  ];

  const results = [];

  for (const flightNumber of testFlights) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing: ${flightNumber}`);
    console.log('='.repeat(60));

    try {
      const result = await planeFinderScraper.scrapeFlightData(flightNumber);

      if (result) {
        console.log('✅ SUCCESS! Flight data found:\n');
        console.log(`Flight: ${result.flightNumber}`);
        console.log(`Date: ${result.date}`);
        console.log(`Airline: ${result.airline.name} (${result.airline.code})`);
        console.log(`Status: ${result.status}`);
        
        console.log(`\n📍 Origin:`);
        console.log(`  ${result.origin.flag || '🌍'} ${result.origin.city} (${result.origin.code})`);
        console.log(`  Airport: ${result.origin.airport}`);
        console.log(`  Country: ${result.origin.country}`);
        console.log(`  Coordinates: ${result.origin.latitude}, ${result.origin.longitude}`);
        console.log(`  Departure: ${result.departure.time} ${result.departure.timezone}`);
        
        console.log(`\n📍 Destination:`);
        console.log(`  ${result.destination.flag || '🌍'} ${result.destination.city} (${result.destination.code})`);
        console.log(`  Airport: ${result.destination.airport}`);
        console.log(`  Country: ${result.destination.country}`);
        console.log(`  Coordinates: ${result.destination.latitude}, ${result.destination.longitude}`);
        console.log(`  Arrival: ${result.arrival.time} ${result.arrival.timezone}`);
        
        console.log(`\n✈️ Aircraft:`);
        console.log(`  Model: ${result.aircraft.model}`);
        console.log(`  Registration: ${result.aircraft.registration}`);
        
        console.log(`\n📅 Scraped: ${result.scrapedAt}`);
        
        // Check if we have complete data
        const hasCompleteData = !!(
          result.origin.flag &&
          result.destination.flag &&
          result.origin.latitude &&
          result.destination.latitude
        );
        
        if (hasCompleteData) {
          console.log('\n🎉 COMPLETE DATA with flags and coordinates!');
        } else {
          console.log('\n⚠️ Partial data - some fields missing');
        }

        results.push({
          flightNumber,
          success: true,
          hasCompleteData,
          data: result
        });
      } else {
        console.log('❌ No data found for this flight');
        results.push({
          flightNumber,
          success: false,
          error: 'No data found'
        });
      }
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : error);
      results.push({
        flightNumber,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('Cache Summary');
  console.log('='.repeat(60));
  
  const cache = planeFinderScraper.getCache();
  const cachedFlights = Object.keys(cache);
  
  console.log(`Cached flights: ${cachedFlights.length}`);
  if (cachedFlights.length > 0) {
    console.log(`Flight numbers: ${cachedFlights.join(', ')}`);
  }
  
  console.log('\n✅ Test complete!');

  return NextResponse.json({
    success: true,
    testResults: results,
    cache: {
      count: cachedFlights.length,
      flights: cachedFlights
    }
  });
}