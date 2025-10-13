/**
 * PlaneFinder.net Scraper with Puppeteer
 * Uses headless browser to bypass bot detection
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { parse } from 'node-html-parser';
import { join } from 'path';
import { AirportData, lookupAirport } from './airportLookup';

// Dynamic import for puppeteer
let puppeteer: any = null;
try {
  puppeteer = require('puppeteer');
} catch (e) {
  console.warn('⚠️ Puppeteer not installed. Install with: npm install puppeteer');
}

// Types
export interface PlaneFinderFlightData {
  flightNumber: string;
  date: string;
  airline: {
    name: string;
    code: string;
  };
  origin: {
    airport: string;
    city: string;
    country: string;
    code: string;
    flag?: string;
    latitude?: number;
    longitude?: number;
  };
  destination: {
    airport: string;
    city: string;
    country: string;
    code: string;
    flag?: string;
    latitude?: number;
    longitude?: number;
  };
  departure: {
    time: string;
    timezone: string;
  };
  arrival: {
    time: string;
    timezone: string;
  };
  aircraft: {
    model: string;
    registration: string;
  };
  status: string;
  scrapedAt: string;
}

export interface FlightDataCache {
  [flightNumber: string]: {
    data: PlaneFinderFlightData;
    timestamp: number;
  };
}

class PlaneFinderScraper {
  private cacheFile: string;
  private cache: FlightDataCache;
  private readonly CACHE_DURATION = 30 * 60 * 1000;
  private browser: any = null;

  constructor() {
    this.cacheFile = join(process.cwd(), 'data', 'planefinder-cache.json');
    this.cache = this.loadCache();
  }

  private loadCache(): FlightDataCache {
    try {
      if (existsSync(this.cacheFile)) {
        const data = readFileSync(this.cacheFile, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.warn('Failed to load PlaneFinder cache:', error);
    }
    return {};
  }

  private saveCache(): void {
    try {
      const dataDir = join(process.cwd(), 'data');
      if (!existsSync(dataDir)) {
        mkdirSync(dataDir, { recursive: true });
      }
      writeFileSync(this.cacheFile, JSON.stringify(this.cache, null, 2));
      console.log('✅ Cache saved successfully');
    } catch (error) {
      console.error('❌ Failed to save PlaneFinder cache:', error);
    }
  }

  private isCacheValid(flightNumber: string): boolean {
    const cached = this.cache[flightNumber];
    if (!cached) return false;
    
    const cacheAge = Date.now() - cached.timestamp;
    return cacheAge < this.CACHE_DURATION;
  }

  private normalizeFlightNumber(flightNumber: string): string {
    return flightNumber.replace(/\s+/g, '').toUpperCase();
  }

  private inferAirline(flightNumber: string): { code: string; name: string } {
    const prefix = flightNumber.match(/^([A-Z]{2,3})/)?.[1];
    
    const airlines: Record<string, { code: string; name: string }> = {
      'EZY': { code: 'EZY', name: 'easyJet' },
      'U2': { code: 'U2', name: 'easyJet' },
      'RYR': { code: 'RYR', name: 'Ryanair' },
      'FR': { code: 'FR', name: 'Ryanair' },
      'BAW': { code: 'BAW', name: 'British Airways' },
      'BA': { code: 'BA', name: 'British Airways' },
    };
    
    return prefix && airlines[prefix] 
      ? airlines[prefix] 
      : { code: prefix || 'UNK', name: 'Unknown Airline' };
  }

  private parseStatus(statusClass: string): string {
    const statusMap: Record<string, string> = {
      'unknown': 'scheduled',
      'departed': 'departed',
      'arrived': 'arrived',
      'delayed': 'delayed',
      'cancelled': 'cancelled',
      'diverted': 'diverted',
    };
    return statusMap[statusClass] || 'unknown';
  }

  private async getBrowser() {
    if (!puppeteer) {
      throw new Error('Puppeteer not installed. Run: npm install puppeteer');
    }

    if (!this.browser) {
      console.log('🚀 Launching Puppeteer browser...');
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-blink-features=AutomationControlled',
        ],
        ignoreHTTPSErrors: true,
      });
      console.log('✅ Browser launched');
    }
    return this.browser;
  }

  async scrapeFlightData(flightNumber: string): Promise<PlaneFinderFlightData | null> {
    const normalizedFlight = this.normalizeFlightNumber(flightNumber);
    
    // Check cache first
    if (this.isCacheValid(normalizedFlight)) {
      console.log(`📦 Using cached data for ${normalizedFlight}`);
      return this.cache[normalizedFlight].data;
    }

    let page = null;

    try {
      console.log(`🔄 Scraping PlaneFinder for ${normalizedFlight} with Puppeteer...`);
      
      const url = `https://planefinder.net/data/flight/${normalizedFlight}`;
      
      const browser = await this.getBrowser();
      page = await browser.newPage();
      
      // Set realistic viewport and user agent
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Block unnecessary resources to speed up
      await page.setRequestInterception(true);
      page.on('request', (request: any) => {
        const resourceType = request.resourceType();
        if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
          request.abort();
        } else {
          request.continue();
        }
      });
      
      console.log(`📡 Navigating to ${url}...`);
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      
      // Handle cookie consent popup
      console.log('🍪 Checking for cookie consent...');
      try {
        // Wait for Accept button and click it
        await page.waitForSelector('button[title="Accept"]', { timeout: 5000 });
        await page.click('button[title="Accept"]');
        console.log('✅ Clicked Accept button');
        // Wait for popup to close
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (e) {
        console.log('ℹ️ No cookie consent popup found or already accepted');
      }
      
      // Wait a bit for any dynamic content
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const html = await page.content();
      await page.close();
      page = null;
      
      console.log(`✅ Page loaded, HTML length: ${html.length}`);
      
      // Parse with node-html-parser
      const root = parse(html);
      
      console.log('🔍 Looking for Live Flights section...');
      
      const liveFlightsHeading = root.querySelectorAll('h2').find(h2 => {
        const text = h2.text.trim();
        return text.includes('Live Flights');
      });
      
      if (!liveFlightsHeading) {
        console.log(`❌ No "Live Flights" h2 heading found for ${normalizedFlight}`);
        return null;
      }

      console.log('✅ Found "Live Flights" heading');

      let tableContainer = liveFlightsHeading.nextElementSibling;
      let attempts = 0;
      
      while (tableContainer && attempts < 5) {
        if (tableContainer.tagName === 'DIV' && 
            tableContainer.classNames.includes('table-prominent')) {
          break;
        }
        tableContainer = tableContainer.nextElementSibling;
        attempts++;
      }

      if (!tableContainer || !tableContainer.classNames.includes('table-prominent')) {
        console.log(`❌ No table-prominent div found`);
        return null;
      }

      const table = tableContainer.querySelector('table');
      if (!table) {
        console.log(`❌ No table found`);
        return null;
      }

      const tbody = table.querySelector('tbody');
      if (!tbody) {
        console.log(`❌ No tbody found`);
        return null;
      }

      const rows = tbody.querySelectorAll('tr');
      console.log(`📊 Found ${rows.length} row(s)`);
      
      if (rows.length === 0) {
        console.log(`❌ No rows found`);
        return null;
      }

      const row = rows[0];
      const cells = row.querySelectorAll('td');
      
      console.log(`📋 Found ${cells.length} cells`);
      
      if (cells.length < 7) {
        console.log(`❌ Insufficient data (need 7+ cells, got ${cells.length})`);
        return null;
      }

      // Parse date (cell 0)
      const date = cells[0].text.trim();
      console.log(`📅 Date: ${date}`);

      // Parse departure (cell 1)
      const depCell = cells[1];
      const depStatusDot = depCell.querySelector('.dot');
      const depStatusClass = depStatusDot ? 
        Array.from(depStatusDot.classNames).find(c => c !== 'dot') || 'unknown' : 
        'unknown';
      console.log(`🔴 Departure status: ${depStatusClass}`);
      
      const depTimeDiv = depCell.querySelector('.d-inline-flex');
      const depTimeText = depTimeDiv ? depTimeDiv.text.trim() : depCell.text.trim();
      const depTime = depTimeText.split('\n')[0].trim();
      console.log(`🕐 Departure time: ${depTime}`);
      
      const depTzSpan = depCell.querySelector('.tag');
      const depTz = depTzSpan ? 
        (depTzSpan.getAttribute('data-bs-original-title') || depTzSpan.text.trim()) : '';
      console.log(`🌍 Departure timezone: ${depTz}`);

      // Parse origin (cell 2)
      const fromCell = cells[2];
      const originLink = fromCell.querySelector('a.tag');
      const originCode = originLink ? originLink.text.trim() : '';
      console.log(`✈️ Origin code: ${originCode}`);
      
      const originImg = fromCell.querySelector('img');
      const originCountry = originImg ? originImg.getAttribute('alt') || '' : '';
      console.log(`🏳️ Origin country: ${originCountry}`);
      
      const fromText = fromCell.text.trim();
      const originCity = fromText.replace(originCode, '').trim().split(/\s+/)[0] || '';
      console.log(`🏙️ Origin city: ${originCity}`);

      // Parse destination (cell 3)
      const toCell = cells[3];
      const destLink = toCell.querySelector('a.tag');
      const destCode = destLink ? destLink.text.trim() : '';
      console.log(`✈️ Destination code: ${destCode}`);
      
      const destImg = toCell.querySelector('img');
      const destCountry = destImg ? destImg.getAttribute('alt') || '' : '';
      console.log(`🏳️ Destination country: ${destCountry}`);
      
      const toText = toCell.text.trim();
      const destCity = toText.replace(destCode, '').trim().split(/\s+/)[0] || '';
      console.log(`🏙️ Destination city: ${destCity}`);

      // Parse arrival (cell 4)
      const arrCell = cells[4];
      const arrTimeDiv = arrCell.querySelector('.d-inline-flex');
      const arrTimeText = arrTimeDiv ? arrTimeDiv.text.trim() : arrCell.text.trim();
      const arrTime = arrTimeText.split('\n')[0].trim();
      console.log(`🕐 Arrival time: ${arrTime}`);
      
      const arrTzSpan = arrCell.querySelector('.tag');
      const arrTz = arrTzSpan ? 
        (arrTzSpan.getAttribute('data-bs-original-title') || arrTzSpan.text.trim()) : '';
      console.log(`🌍 Arrival timezone: ${arrTz}`);

      // Parse aircraft (cell 5)
      const aircraftModel = cells[5].text.trim();
      console.log(`🛩️ Aircraft model: ${aircraftModel}`);

      // Parse registration (cell 6)
      const regLink = cells[6].querySelector('a');
      const registration = regLink ? regLink.text.trim() : cells[6].text.trim();
      console.log(`🔢 Registration: ${registration}`);

      const airline = this.inferAirline(normalizedFlight);
      console.log(`🏢 Airline: ${airline.name} (${airline.code})`);

      const status = this.parseStatus(depStatusClass);
      console.log(`📊 Status: ${status}`);

      console.log('\n🔍 Looking up airport data...');
      let originAirportData: AirportData | null = null;
      let destAirportData: AirportData | null = null;

      try {
        if (originCode) {
          console.log(`  Looking up origin: ${originCode}`);
          originAirportData = await lookupAirport(originCode);
          if (originAirportData) {
            console.log(`  ✅ Found origin: ${originAirportData.name}, ${originAirportData.city} ${originAirportData.flag}`);
          }
        }
        if (destCode) {
          console.log(`  Looking up destination: ${destCode}`);
          destAirportData = await lookupAirport(destCode);
          if (destAirportData) {
            console.log(`  ✅ Found destination: ${destAirportData.name}, ${destAirportData.city} ${destAirportData.flag}`);
          }
        }
      } catch (error) {
        console.warn('⚠️ Failed to lookup airport data:', error);
      }

      const flightData: PlaneFinderFlightData = {
        flightNumber: normalizedFlight,
        date,
        airline,
        origin: {
          code: originCode,
          airport: originAirportData?.name || `${originCode} Airport`,
          city: originAirportData?.city || originCity,
          country: originAirportData?.country || originCountry,
          flag: originAirportData?.flag,
          latitude: originAirportData?.latitude,
          longitude: originAirportData?.longitude,
        },
        destination: {
          code: destCode,
          airport: destAirportData?.name || `${destCode} Airport`,
          city: destAirportData?.city || destCity,
          country: destAirportData?.country || destCountry,
          flag: destAirportData?.flag,
          latitude: destAirportData?.latitude,
          longitude: destAirportData?.longitude,
        },
        departure: {
          time: depTime,
          timezone: depTz,
        },
        arrival: {
          time: arrTime,
          timezone: arrTz,
        },
        aircraft: {
          model: aircraftModel,
          registration,
        },
        status,
        scrapedAt: new Date().toISOString(),
      };

      console.log('\n✅ Successfully parsed flight data');

      this.cache[normalizedFlight] = {
        data: flightData,
        timestamp: Date.now(),
      };
      this.saveCache();

      console.log(`✅ Successfully scraped and cached data for ${normalizedFlight}`);
      return flightData;

    } catch (error) {
      console.error(`❌ Failed to scrape ${normalizedFlight}:`, error instanceof Error ? error.message : error);
      return null;
    } finally {
      if (page) {
        try {
          await page.close();
        } catch (e) {
          console.warn('Failed to close page:', e);
        }
      }
    }
  }

  async enrichFlightData(flightData: any): Promise<any> {
    if (!flightData?.flightNumber) {
      return flightData;
    }

    const scrapedData = await this.scrapeFlightData(flightData.flightNumber);
    
    if (!scrapedData) {
      console.log(`⚠️ No PlaneFinder data available for ${flightData.flightNumber}`);
      return flightData;
    }

    return {
      ...flightData,
      airline: {
        ...flightData.airline,
        name: scrapedData.airline.name,
        code: scrapedData.airline.code,
      },
      origin: {
        ...flightData.origin,
        code: scrapedData.origin.code,
        name: scrapedData.origin.airport,
        city: scrapedData.origin.city,
        country: scrapedData.origin.country,
        flag: scrapedData.origin.flag,
        latitude: scrapedData.origin.latitude || flightData.origin?.latitude,
        longitude: scrapedData.origin.longitude || flightData.origin?.longitude,
        scheduledTime: scrapedData.departure.time,
        timezone: scrapedData.departure.timezone,
      },
      destination: {
        ...flightData.destination,
        code: scrapedData.destination.code,
        name: scrapedData.destination.airport,
        city: scrapedData.destination.city,
        country: scrapedData.destination.country,
        flag: scrapedData.destination.flag,
        latitude: scrapedData.destination.latitude || flightData.destination?.latitude,
        longitude: scrapedData.destination.longitude || flightData.destination?.longitude,
        scheduledTime: scrapedData.arrival.time,
        timezone: scrapedData.arrival.timezone,
      },
      aircraft: {
        ...flightData.aircraft,
        model: scrapedData.aircraft.model,
        registration: scrapedData.aircraft.registration,
      },
      status: scrapedData.status,
      enrichedData: {
        source: 'planefinder',
        scrapedAt: scrapedData.scrapedAt,
        date: scrapedData.date,
      },
    };
  }

  getCache(): FlightDataCache {
    return { ...this.cache };
  }

  clearCache(): void {
    this.cache = {};
    this.saveCache();
    console.log('✅ PlaneFinder cache cleared');
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log('🔒 Browser closed');
    }
  }
}

export const planeFinderScraper = new PlaneFinderScraper();