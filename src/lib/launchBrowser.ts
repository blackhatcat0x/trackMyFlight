// src/lib/launchBrowser.ts
export async function launchBrowser() {
  const herokuChrome = process.env.PUPPETEER_EXECUTABLE_PATH;
  const isLocal = !herokuChrome;

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
    '--ignore-certificate-errors', // replaces ignoreHTTPSErrors at launch
  ];

  if (isLocal) {
    return puppeteer.launch({
      headless: true,
      args,
    });
  }

  return puppeteer.launch({
    executablePath: herokuChrome, // e.g. /app/.apt/usr/bin/google-chrome on Heroku
    headless: true,
    args,
  });
}
