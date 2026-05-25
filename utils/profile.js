import fs from 'node:fs/promises';
import path from 'node:path';

export async function loadProfile(profilePath) {
  const absolutePath = path.resolve(process.cwd(), profilePath);

  try {
    const raw = await fs.readFile(absolutePath, 'utf8');
    const profile = JSON.parse(raw);

    return {
      profile,
      profilePath: absolutePath
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Profile file not found: ${absolutePath}`);
    }

    if (error instanceof SyntaxError) {
      throw new Error(`Profile file is not valid JSON: ${absolutePath}`);
    }

    throw error;
  }
}

export function flattenProfile(profile) {
  const entries = [];

  function visit(value, pathParts) {
    if (value === null || value === undefined) {
      return;
    }

    if (Array.isArray(value)) {
      entries.push({
        key: pathParts.join('.'),
        label: pathParts.join(' '),
        value: value.join(', ')
      });
      return;
    }

    if (typeof value === 'object') {
      for (const [key, childValue] of Object.entries(value)) {
        visit(childValue, [...pathParts, key]);
      }
      return;
    }

    entries.push({
      key: pathParts.join('.'),
      label: pathParts.join(' '),
      value
    });
  }

  visit(profile, []);
  return entries;
}
