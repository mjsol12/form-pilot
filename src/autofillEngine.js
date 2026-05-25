import fs from 'node:fs/promises';
import path from 'node:path';
import { FIELD_SELECTOR } from './fieldDetector.js';

export async function autofillMatches(page, matchedFields, { logger }) {
  const results = [];

  for (const item of matchedFields) {
    if (!item.match) {
      results.push({
        field: item.field,
        status: 'skipped',
        reason: item.reason || 'no_match'
      });
      continue;
    }

    try {
      const result = await fillField(page, item.field, item.match, { logger });
      results.push(result);
    } catch (error) {
      logger.warn(`Could not fill ${describeField(item.field)}: ${error.message}`);
      results.push({
        field: item.field,
        match: item.match,
        status: 'error',
        reason: error.message
      });
    }
  }

  return results;
}

async function fillField(page, field, match, { logger }) {
  const locator = page.locator(FIELD_SELECTOR).nth(field.index);
  const value = normalizeValue(match.value);

  logger.debug(`Filling ${describeField(field)} with ${match.key}`);

  if (field.type === 'file') {
    const uploadPath = path.resolve(process.cwd(), String(value));
    await fs.access(uploadPath);
    await locator.setInputFiles(uploadPath);
    await highlight(locator);

    return { field, match, status: 'filled', value: uploadPath };
  }

  if (field.type === 'checkbox') {
    const checked = toBoolean(value);
    await locator.setChecked(checked);
    await highlight(locator);

    return { field, match, status: 'filled', value: checked };
  }

  if (field.type === 'radio') {
    if (shouldSelectRadio(field, value)) {
      await locator.check();
      await highlight(locator);

      return { field, match, status: 'filled', value };
    }

    return { field, match, status: 'skipped', reason: 'radio_option_did_not_match' };
  }

  if (field.tagName === 'select') {
    const selected = await selectBestOption(locator, field.options, value);
    await highlight(locator);

    return { field, match, status: 'filled', value: selected };
  }

  await locator.fill(String(value));
  await highlight(locator);

  return { field, match, status: 'filled', value };
}

async function selectBestOption(locator, options, value) {
  const desired = normalizeText(value);
  const candidates = options.filter((option) => option.value || option.label);

  const exact = candidates.find((option) => {
    return normalizeText(option.value) === desired || normalizeText(option.label) === desired;
  });

  const partial = exact || candidates.find((option) => {
    return normalizeText(option.value).includes(desired) || normalizeText(option.label).includes(desired);
  });

  const fallback = partial || candidates.find((option) => option.value);
  const selectedValue = fallback?.value ?? String(value);

  await locator.selectOption(selectedValue);
  return selectedValue;
}

async function highlight(locator) {
  await locator.evaluate((element) => {
    element.style.outline = '3px solid #22c55e';
    element.style.boxShadow = '0 0 0 4px rgba(34, 197, 94, 0.25)';
    element.dataset.formPilotAutofilled = 'true';
  });
}

function shouldSelectRadio(field, value) {
  const desired = normalizeText(value);
  const fieldText = normalizeText([
    field.value,
    field.label,
    field.ariaLabel,
    field.nearbyText
  ].filter(Boolean).join(' '));

  if (typeof value === 'boolean') {
    return value === true && !/\b(no|false|decline)\b/.test(fieldText);
  }

  return fieldText.includes(desired);
}

function normalizeValue(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return value;
}

function toBoolean(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  return ['true', 'yes', 'y', '1', 'on'].includes(String(value).trim().toLowerCase());
}

function normalizeText(value) {
  return String(value)
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function describeField(field) {
  return field.label || field.placeholder || field.name || field.id || `${field.tagName}[${field.index}]`;
}
