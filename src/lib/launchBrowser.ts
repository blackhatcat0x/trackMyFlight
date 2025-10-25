// src/lib/launchBrowser.ts
export async function launchBrowser() {
  const herokuChrome = process.env.PUPPETEER_EXECUTABLE_PATH;
  const isLocal = !herokuChrome;

  console.log('🔍 Launching browser...');
  console.log('Environment:', isLocal ? 'LOCAL' : 'HEROKU');
  console.log('Chrome path:', herokuChrome || 'using bundled chrome');

  const puppeteer = isLocal
    ? (await import('puppeteer')).default
    : (await import('puppeteer-core')).default;

  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-features=NetworkService',
    '--disable-blink-features=AutomationControlled',
    '--single-process',
    '--no-zygote',
  ];

  const launchOptions: any = {
    headless: true,
    args,
  };

  if (!isLocal) {
    launchOptions.executablePath = herokuChrome;
  }

  console.log('Launch options:', JSON.stringify(launchOptions, null, 2));

  try {
    const browser = await puppeteer.launch(launchOptions);
    console.log('✅ Browser launched successfully');
    return browser;
  } catch (error) {
    console.error('❌ Failed to launch browser:', error);
    throw error;
  }
}