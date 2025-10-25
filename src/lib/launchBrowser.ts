// src/lib/launchBrowser.ts
export async function launchBrowser() {
  // On Heroku, Chrome is installed to /tmp at runtime
  const herokuChrome = process.env.CHROME_BIN || 
                       process.env.PUPPETEER_EXECUTABLE_PATH ||
                       (process.env.DYNO ? '/tmp/.cache/puppeteer/chrome/linux-141.0.7390.122/chrome-linux64/chrome' : null);
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
    '--disable-software-rasterizer',
    '--disable-extensions',
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