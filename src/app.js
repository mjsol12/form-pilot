import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { getAdapter } from '../adapters/index.js';
import { createLogger } from '../utils/logger.js';
import { loadProfile } from '../utils/profile.js';
import { autofillMatches } from './autofillEngine.js';
import { launchBrowser, navigateTo } from './browser.js';
import { detectFields } from './fieldDetector.js';
import { matchFields } from './fieldMatcher.js';

export async function runAutofill(options) {
  const logger = createLogger();
  const adapter = getAdapter(options.adapter);
  const { profile, profilePath } = await loadProfile(options.profilePath);

  let browser;

  try {
    logger.info(`Loaded profile from ${profilePath}`);

    const launched = await launchBrowser({
      headless: options.headless,
      slowMo: options.slowMo
    });

    browser = launched.browser;
    const { page } = launched;

    await navigateTo(page, options.url, { logger });
    await adapter.beforeDetect?.(page, { logger, profile });

    const fields = await detectFields(page);
    logger.info(`Detected ${fields.length} visible form field(s).`);

    const matchedFields = matchFields(fields, profile, {
      resumePath: options.resumePath
    });

    const results = await autofillMatches(page, matchedFields, { logger });
    await adapter.afterFill?.(page, { logger, profile, results });

    logSummary(results, logger);
    await waitForManualReview(logger);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

function logSummary(results, logger) {
  const filled = results.filter((result) => result.status === 'filled');
  const skipped = results.filter((result) => result.status === 'skipped');
  const errors = results.filter((result) => result.status === 'error');

  logger.info(`Summary: ${filled.length} filled, ${skipped.length} skipped, ${errors.length} error(s).`);

  if (skipped.length > 0) {
    logger.debug('Skipped fields:', skipped.map((result) => ({
      field: result.field.label || result.field.placeholder || result.field.name || result.field.id,
      reason: result.reason
    })));
  }
}

async function waitForManualReview(logger) {
  logger.info('Review the highlighted fields in Chrome. This tool will not click the final submit button.');

  if (!process.stdin.isTTY) {
    logger.warn('No interactive terminal detected; closing browser without waiting for confirmation.');
    return;
  }

  const rl = readline.createInterface({ input, output });

  try {
    await rl.question('Submit manually in the browser when ready, then press Enter here to close Form Pilot. ');
  } finally {
    rl.close();
  }
}
