import { flattenProfile } from '../utils/profile.js';

const SYNONYMS = new Map([
  ['first name', 'personal.firstName'],
  ['given name', 'personal.firstName'],
  ['last name', 'personal.lastName'],
  ['surname', 'personal.lastName'],
  ['family name', 'personal.lastName'],
  ['full name', 'personal.fullName'],
  ['name', 'personal.fullName'],
  ['email', 'personal.email'],
  ['e-mail', 'personal.email'],
  ['phone', 'personal.phone'],
  ['mobile', 'personal.phone'],
  ['address', 'personal.address'],
  ['street', 'personal.address'],
  ['city', 'personal.city'],
  ['state', 'personal.state'],
  ['province', 'personal.state'],
  ['zip', 'personal.zip'],
  ['postal code', 'personal.zip'],
  ['country', 'personal.country'],
  ['company', 'work.currentCompany'],
  ['current company', 'work.currentCompany'],
  ['title', 'work.currentTitle'],
  ['job title', 'work.currentTitle'],
  ['linkedin', 'work.linkedin'],
  ['github', 'work.github'],
  ['portfolio', 'work.portfolio'],
  ['website', 'custom.website'],
  ['years of experience', 'work.yearsExperience'],
  ['experience', 'work.yearsExperience'],
  ['salary', 'work.desiredSalary'],
  ['sponsorship', 'application.requiresSponsorship'],
  ['authorized', 'application.authorizedToWork'],
  ['work authorization', 'application.authorizedToWork'],
  ['start date', 'application.availableStartDate'],
  ['relocate', 'application.willingToRelocate'],
  ['remote', 'application.remotePreference'],
  ['cover letter', 'application.coverLetter'],
  ['resume', 'uploads.resume'],
  ['cv', 'uploads.resume']
]);

const NEGATIVE_HINTS = [
  'password',
  'captcha',
  'security code',
  'credit card',
  'card number',
  'ssn',
  'social security'
];

export function matchFields(fields, profile, { resumePath = null } = {}) {
  const entries = flattenProfile(profile);
  const valueByKey = new Map(entries.map((entry) => [entry.key, entry.value]));

  return fields.map((field) => {
    const haystack = buildSearchText(field);

    if (NEGATIVE_HINTS.some((hint) => haystack.includes(hint))) {
      return { field, match: null, reason: 'sensitive_or_unsupported' };
    }

    if (field.type === 'file') {
      const profileResume = valueByKey.get('uploads.resume');
      const value = resumePath || profileResume;

      if (value && /\b(resume|cv|curriculum vitae)\b/.test(haystack)) {
        return {
          field,
          match: {
            key: 'uploads.resume',
            value,
            confidence: 0.95,
            strategy: 'file-upload'
          }
        };
      }

      return { field, match: null, reason: 'file_without_resume_match' };
    }

    const direct = directSynonymMatch(haystack, valueByKey);
    if (direct) {
      return { field, match: direct };
    }

    const scored = bestTokenMatch(haystack, entries);
    if (scored) {
      return { field, match: scored };
    }

    return { field, match: null, reason: 'no_profile_match' };
  });
}

function directSynonymMatch(haystack, valueByKey) {
  const matches = [...SYNONYMS.entries()]
    .filter(([hint, key]) => haystack.includes(hint) && valueByKey.has(key))
    .sort((a, b) => b[0].length - a[0].length);

  if (matches.length === 0) {
    return null;
  }

  const [hint, key] = matches[0];

  return {
    key,
    value: valueByKey.get(key),
    confidence: Math.min(0.98, 0.75 + hint.length / 100),
    strategy: 'synonym'
  };
}

function bestTokenMatch(haystack, entries) {
  let best = null;

  for (const entry of entries) {
    const tokens = tokenize(entry.label);
    if (tokens.length === 0) {
      continue;
    }

    const hits = tokens.filter((token) => haystack.includes(token)).length;
    const score = hits / tokens.length;

    if (score >= 0.7 && (!best || score > best.confidence)) {
      best = {
        key: entry.key,
        value: entry.value,
        confidence: score,
        strategy: 'token'
      };
    }
  }

  return best;
}

function buildSearchText(field) {
  return normalize([
    field.label,
    field.placeholder,
    field.ariaLabel,
    field.name,
    field.id,
    field.autocomplete,
    field.nearbyText
  ].filter(Boolean).join(' '));
}

function normalize(value) {
  return String(value)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value) {
  return normalize(value)
    .split(' ')
    .filter((token) => token.length > 1 && !['personal', 'work', 'application', 'custom', 'uploads'].includes(token));
}
