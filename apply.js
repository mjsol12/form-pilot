#!/usr/bin/env node

import { runAutofill } from './src/app.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger();

function parseArgs(argv) {
  const args = {
    url: null,
    profilePath: 'profile.json',
    resumePath: null,
    headless: false,
    slowMo: 25,
    adapter: 'default'
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (!arg.startsWith('--') && !args.url) {
      args.url = arg;
      continue;
    }

    switch (arg) {
      case '--profile':
        args.profilePath = argv[++i];
        break;
      case '--resume':
        args.resumePath = argv[++i];
        break;
      case '--adapter':
        args.adapter = argv[++i];
        break;
      case '--headless':
        args.headless = true;
        break;
      case '--slow-mo':
        args.slowMo = Number(argv[++i]);
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!args.url) {
    printHelp();
    throw new Error('Target URL is required.');
  }

  if (!Number.isFinite(args.slowMo) || args.slowMo < 0) {
    throw new Error('--slow-mo must be a non-negative number.');
  }

  return args;
}

function printHelp() {
  console.log(`
Form Pilot - local-first Playwright autofill helper

Usage:
  node apply.js <url> [options]

Options:
  --profile <path>    Path to local profile JSON (default: profile.json)
  --resume <path>     Resume file to upload when a matching file input is found
  --adapter <name>    Site adapter to use (default: default)
  --headless          Run Chrome headlessly
  --slow-mo <ms>      Slow Playwright actions for visibility (default: 25)
  --help              Show this help message

Example:
  node apply.js "https://example.com/apply" --resume ./resumes/resume.pdf
`);
}

try {
  const options = parseArgs(process.argv.slice(2));
  await runAutofill(options);
} catch (error) {
  logger.error(error.message);
  process.exitCode = 1;
}
