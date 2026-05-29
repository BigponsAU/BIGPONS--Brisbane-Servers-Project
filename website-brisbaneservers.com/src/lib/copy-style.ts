/**
 * Site-wide copy casing: sentence-style headings, natural grammar.
 */

const ACRONYMS = [
  'API',
  'APP',
  'CRM',
  'GST',
  'MFA',
  'NLP',
  'POS',
  'PMS',
  'ROI',
  'SME',
  'URL',
] as const;

const PROPER_NOUNS = [
  'BIGPONS',
  'Brisbane',
  'Australia',
  'Australian',
  'Cool Finance',
  'E-commerce',
  'Google',
  'Privacy',
] as const;

/**
 * Headings and card titles: sentence case, "and" not "&", acronyms preserved.
 */
export function formatHeadingCopy(text: string): string {
  if (!text?.trim()) return text;
  if (/<[a-z][\s\S]*>/i.test(text)) return text;

  let t = text.trim().replace(/\s*&\s*/g, ' and ');

  const segments = t.split(':').map((segment) => {
    const s = segment.trim().toLowerCase();
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
  });
  t = segments.join(': ');

  for (const acr of ACRONYMS) {
    const escaped = acr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    t = t.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), acr);
  }
  for (const noun of PROPER_NOUNS) {
    t = t.replace(new RegExp(noun.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), noun);
  }

  return t;
}

/**
 * Eyebrows / kickers: light normalisation only (no forced uppercase via CSS).
 */
export function formatEyebrowCopy(text: string): string {
  if (!text?.trim()) return text;
  return text.trim().replace(/\s*&\s*/g, ' · ');
}
