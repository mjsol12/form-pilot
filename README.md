# Form Pilot

Form Pilot is a local-first personal autofill helper for application websites. It
uses Node.js and Playwright to open a real Chrome browser, inspect visible form
fields, match them against a local `profile.json`, fill likely matches, highlight
what changed, and pause before any final submission.

The MVP is intentionally lightweight and keeps all data on your machine. Future
AI integrations can plug into the matcher without changing browser automation
or site adapter code.

## Features

- Launches a real Chrome browser through Playwright.
- Detects visible `input`, `textarea`, `select`, checkbox, radio, and file fields.
- Extracts labels, placeholders, ARIA metadata, field names, IDs, select options,
  and nearby text.
- Matches fields to local `profile.json` values with deterministic heuristics.
- Uploads a resume when a resume/CV file input is found.
- Highlights autofilled fields for manual review.
- Never clicks final submit; you stay in control.
- Provides adapter and prompt folders for multi-site and future AI mapping work.

## Project structure

```text
.
├── apply.js                 # CLI entrypoint
├── profile.json             # Sample local profile data
├── package.json
├── adapters/
│   ├── defaultAdapter.js    # Default site hooks
│   └── index.js
├── prompts/
│   └── field-mapping.md     # Future AI semantic mapping prompt
├── src/
│   ├── app.js               # Main orchestration flow
│   ├── autofillEngine.js    # Fill/highlight behavior
│   ├── browser.js           # Playwright browser setup/navigation
│   ├── fieldDetector.js     # In-page field metadata extraction
│   └── fieldMatcher.js      # Profile matching heuristics
└── utils/
    ├── logger.js
    └── profile.js
```

## Setup

```bash
npm install
npx playwright install chrome
```

Chrome is used via Playwright's `channel: "chrome"` option so forms open in a
real Chrome browser instead of a bundled headless-only environment.

## Configure your profile

Edit `profile.json` with your own information. Keep it local and avoid committing
private data. The sample includes common application keys:

- `personal`: name, email, phone, address
- `work`: current company/title, links, experience, salary
- `application`: sponsorship, start date, relocation, cover letter
- `uploads.resume`: default resume path
- `custom`: any extra fields you want matched

You can also pass a resume path at runtime:

```bash
node apply.js "https://example.com/apply" --resume ./resumes/resume.pdf
```

## Usage

```bash
node apply.js <application-url> [options]
```

Options:

```text
--profile <path>    Path to local profile JSON (default: profile.json)
--resume <path>     Resume file to upload when a matching file input is found
--adapter <name>    Site adapter to use (default: default)
--headless          Run Chrome headlessly
--slow-mo <ms>      Slow Playwright actions for visibility (default: 25)
--help              Show CLI help
```

Example:

```bash
node apply.js "https://jobs.example.com/software-engineer/apply" \
  --profile profile.json \
  --resume ./resumes/resume.pdf
```

After autofill completes, Form Pilot pauses with Chrome open. Review highlighted
fields, fix anything manually, submit yourself if desired, then press Enter in
the terminal to close the browser.

## Architecture notes

- Browser automation lives in `src/browser.js` and `src/autofillEngine.js`.
- Field detection is isolated in `src/fieldDetector.js` so it can later be reused
  by a Chrome extension content script.
- Matching is isolated in `src/fieldMatcher.js`; this is the future integration
  point for OpenAI, local models, resume parsing, or cover letter generation.
- Site-specific behavior belongs in `adapters/`. Add a new adapter and register
  it in `adapters/index.js`.
- Local JSON is the only storage layer.

## Development

Run syntax checks:

```bash
npm run check
```

Increase logging detail:

```bash
LOG_LEVEL=debug node apply.js "https://example.com/apply"
```
