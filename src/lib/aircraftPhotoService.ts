// lib/aircraftPhotoService.ts

export interface AircraftPhoto {
  imageUrl: string;
  thumbnailUrl: string;
  photographer: string;
  photoDate: string;
  location: string;
  airline: string;
  aircraftType: string;
  serialNumber: string;
  registration: string;
  views: number;
  likes: number;
  source: 'jetphotos' | 'planespotters' | 'fallback';
}

// Dynamic import for puppeteer
let puppeteer: any = null;
try {
  puppeteer = require('puppeteer');
} catch (e) {
  console.warn('⚠️ Puppeteer not installed');
}

class AircraftPhotoService {
  private cache: Map<string, { data: AircraftPhoto | null; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private browser: any = null;

  private isCacheValid(registration: string): boolean {
    const cached = this.cache.get(registration);
    if (!cached) return false;
    return Date.now() - cached.timestamp < this.CACHE_DURATION;
  }

  private async getBrowser() {
    if (!puppeteer) {
      throw new Error('Puppeteer not installed');
    }

    if (!this.browser) {
      console.log('🚀 Launching Puppeteer browser for aircraft photos...');
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

  async fetchFromJetPhotos(registration: string): Promise<AircraftPhoto | null> {
    let page = null;
    
    try {
      // Keep the hyphen in registration for JetPhotos
      const cleanReg = registration.trim().toUpperCase();
      console.log(`📸 Fetching aircraft photo for ${cleanReg} from JetPhotos...`);
      
      const url = `https://www.jetphotos.com/photo/keyword/${cleanReg}`;
      
      const browser = await this.getBrowser();
      page = await browser.newPage();
      
      // Set realistic viewport and user agent
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Block unnecessary resources
      await page.setRequestInterception(true);
      page.on('request', (request: any) => {
        const resourceType = request.resourceType();
        if (['font', 'media'].includes(resourceType)) {
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
      
      // Wait for results to load
      await page.waitForSelector('#results .result', { timeout: 10000 }).catch(() => null);
      
      // Extract data using page.evaluate
      const photoData = await page.evaluate(() => {
        const firstResult = document.querySelector('#results .result');
        if (!firstResult) return null;

        // Get image URL and thumbnail
        const photoLink = firstResult.querySelector('.result__photoLink');
        const thumbnailImg = firstResult.querySelector('.result__photo') as HTMLImageElement;
        
        if (!photoLink || !thumbnailImg) return null;

        // Extract desktop info list (more complete data)
        const desktopInfoList = firstResult.querySelector('.desktop-only--block .result__infoList');
        
        if (!desktopInfoList) return null;

        const infoText = desktopInfoList.textContent || '';
        
        // Extract airline
        const airlineLink = desktopInfoList.querySelector('a[href*="/airline/"]');
        const airline = airlineLink?.textContent?.trim() || 'Unknown';
        
        // Extract registration
        const regLink = desktopInfoList.querySelector('a[href*="/registration/"]');
        const regText = regLink?.textContent?.trim() || '';
        const reg = regText.replace(' photos', '').trim();
        
        // Extract aircraft type
        const aircraftLink = desktopInfoList.querySelector('a[href*="/aircraft/"]');
        const aircraftType = aircraftLink?.textContent?.trim() || 'Unknown';
        
        // Extract serial number
        const serialLink = desktopInfoList.querySelector('a[href*="/serial/"]');
        const serialNumber = serialLink?.textContent?.trim() || 'Unknown';
        
        // Extract photo date
        const photoDateLink = desktopInfoList.querySelector('a[href*="/photo/date/"]');
        const photoDate = photoDateLink?.textContent?.trim() || 'Unknown';
        
        // Extract location from the third section
        const locationSection = firstResult.querySelector('.result__section--info2-wrapper');
        const locationLink = locationSection?.querySelector('a[href*="/airport/"]');
        const location = locationLink?.textContent?.trim() || 'Unknown';
        
        // Extract photographer
        const photographerLink = locationSection?.querySelector('a[href*="/photographer/"]');
        const photographer = photographerLink?.textContent?.trim() || 'Unknown';
        
        // Extract stats
        const statsSection = firstResult.querySelector('.result__stats');
        const statsText = statsSection?.textContent || '';
        
        const likesMatch = statsText.match(/Likes:\s*(\d+)/i) || statsText.match(/\s(\d+)\s*$/m);
        const likes = likesMatch ? parseInt(likesMatch[1]) : 0;
        
        const viewsMatch = statsText.match(/Views:\s*([\d,]+)/i);
        const views = viewsMatch ? parseInt(viewsMatch[1].replace(/,/g, '')) : 0;

        return {
          imageUrl: photoLink.getAttribute('href') || '',
          thumbnailUrl: thumbnailImg.getAttribute('src') || '',
          photographer,
          photoDate,
          location,
          airline,
          aircraftType,
          serialNumber,
          registration: reg,
          views,
          likes
        };
      });

      await page.close();
      page = null;

      if (!photoData) {
        console.log(`❌ No photos found for ${cleanReg}`);
        return null;
      }

      const photo: AircraftPhoto = {
        ...photoData,
        imageUrl: photoData.imageUrl.startsWith('http') 
          ? photoData.imageUrl 
          : `https://www.jetphotos.com${photoData.imageUrl}`,
        thumbnailUrl: photoData.thumbnailUrl.startsWith('//')
          ? `https:${photoData.thumbnailUrl}`
          : photoData.thumbnailUrl.startsWith('http')
          ? photoData.thumbnailUrl
          : `https://www.jetphotos.com${photoData.thumbnailUrl}`,
        source: 'jetphotos'
      };

      console.log(`✅ Found photo for ${cleanReg}:`, photo);
      return photo;

    } catch (error) {
      console.error(`❌ Failed to fetch from JetPhotos:`, error);
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

  async fetchFromPlanespotters(registration: string): Promise<AircraftPhoto | null> {
    let page = null;
    
    try {
      const cleanReg = registration.replace(/[^A-Z0-9]/gi, '').toUpperCase();
      console.log(`📸 Fetching from Planespotters.net for ${cleanReg}...`);
      
      const url = `https://www.planespotters.net/registration/${cleanReg}`;
      
      const browser = await this.getBrowser();
      page = await browser.newPage();
      
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      await page.setRequestInterception(true);
      page.on('request', (request: any) => {
        const resourceType = request.resourceType();
        if (['font', 'media'].includes(resourceType)) {
          request.abort();
        } else {
          request.continue();
        }
      });
      
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      
      await page.waitForSelector('.plane-photo', { timeout: 10000 }).catch(() => null);
      
      const photoData = await page.evaluate(() => {
        const photoImg = document.querySelector('.plane-photo img');
        if (!photoImg) return null;
        
        return {
          imageUrl: photoImg.getAttribute('src') || '',
        };
      });

      await page.close();
      page = null;

      if (!photoData?.imageUrl) {
        console.log(`❌ No photo found on Planespotters for ${cleanReg}`);
        return null;
      }

      const photo: AircraftPhoto = {
        imageUrl: photoData.imageUrl.startsWith('http') 
          ? photoData.imageUrl 
          : `https://www.planespotters.net${photoData.imageUrl}`,
        thumbnailUrl: photoData.imageUrl.startsWith('http') 
          ? photoData.imageUrl 
          : `https://www.planespotters.net${photoData.imageUrl}`,
        photographer: 'Planespotters Community',
        photoDate: 'Unknown',
        location: 'Unknown',
        airline: 'Unknown',
        aircraftType: 'Unknown',
        serialNumber: 'Unknown',
        registration: cleanReg,
        views: 0,
        likes: 0,
        source: 'planespotters'
      };

      console.log(`✅ Found photo from Planespotters for ${cleanReg}`);
      return photo;

    } catch (error) {
      console.error(`❌ Failed to fetch from Planespotters:`, error);
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

  async getAircraftPhoto(registration: string): Promise<AircraftPhoto | null> {
    if (!registration) return null;

    // Check cache first
    if (this.isCacheValid(registration)) {
      console.log(`📦 Using cached photo for ${registration}`);
      return this.cache.get(registration)!.data;
    }

    // Try JetPhotos first (best quality and metadata)
    let photo = await this.fetchFromJetPhotos(registration);
    
    // Fallback to Planespotters if JetPhotos fails
    if (!photo) {
      console.log(`⚠️ JetPhotos failed, trying Planespotters...`);
      photo = await this.fetchFromPlanespotters(registration);
    }

    // Cache the result (even if null)
    this.cache.set(registration, {
      data: photo,
      timestamp: Date.now()
    });

    return photo;
  }

  clearCache(): void {
    this.cache.clear();
    console.log('✅ Aircraft photo cache cleared');
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log('🔒 Aircraft photo browser closed');
    }
  }
}

export const aircraftPhotoService = new AircraftPhotoService();