import { chromium } from 'playwright';

export async function launchBrowser({ headless = false, slowMo = 25 } = {}) {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless,
    slowMo
  });

  const context = await browser.newContext({
    viewport: { width: 1366, height: 900 },
    acceptDownloads: true
  });

  const page = await context.newPage();

  return {
    browser,
    context,
    page
  };
}

export async function navigateTo(page, url, { logger }) {
  logger.info(`Opening ${url}`);
  await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000
  });

  // Many application pages hydrate fields after the initial DOM is ready.
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {
    logger.warn('Network did not become idle; continuing with current page state.');
  });
}
