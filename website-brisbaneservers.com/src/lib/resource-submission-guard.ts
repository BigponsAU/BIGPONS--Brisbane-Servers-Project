/**
 * Server-side checks for pasted or uploaded resource source text.
 * Stops empty tests, keyboard spam, and extremely repetitive payloads while staying permissive for real drafts.
 */

export type ResourceSourceGuardResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

const MIN_CHARS = 80;
const MIN_WORDS = 12;
const MAX_SAME_CHAR_RUN = 45;
const MIN_LETTER_RATIO = 0.22;
const MIN_UNIQUE_TOKEN_RATIO = 0.26;
const UNIQUE_RATIO_MIN_WORDS = 18;

function longestSameCharRun(s: string): number {
  if (s.length === 0) return 0;
  let best = 1;
  let cur = 1;
  for (let i = 1; i < s.length; i++) {
    if (s[i] === s[i - 1]) cur++;
    else cur = 1;
    if (cur > best) best = cur;
  }
  return best;
}

export function validateResourceSourceText(raw: string): ResourceSourceGuardResult {
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  if (trimmed.length < MIN_CHARS) {
    return {
      ok: false,
      code: 'CONTENT_TOO_SHORT',
      message: `Add at least ${MIN_CHARS} characters of real content. Very short or empty uploads are rejected.`
    };
  }

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < MIN_WORDS) {
    return {
      ok: false,
      code: 'CONTENT_TOO_SHORT',
      message: `Add at least ${MIN_WORDS} words. One-line or test strings are not accepted as resources.`
    };
  }

  if (longestSameCharRun(trimmed) > MAX_SAME_CHAR_RUN) {
    return {
      ok: false,
      code: 'CONTENT_LOW_SIGNAL',
      message:
        'Content looks like repeated characters (noise). Upload readable documentation or article text.'
    };
  }

  const nonSpace = trimmed.replace(/\s/g, '');
  const printableLen = nonSpace.length || 1;
  const letters = nonSpace.replace(/[^a-zA-Z]/g, '').length;
  const letterRatio = letters / printableLen;
  if (printableLen > 40 && letterRatio < MIN_LETTER_RATIO) {
    return {
      ok: false,
      code: 'CONTENT_LOW_SIGNAL',
      message:
        'Content has very few letters compared to symbols or numbers. Please upload normal prose or markdown.'
    };
  }

  if (words.length >= UNIQUE_RATIO_MIN_WORDS) {
    const normalized = words.map((w) => w.toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, '')).filter(Boolean);
    if (normalized.length === 0) {
      return {
        ok: false,
        code: 'CONTENT_LOW_SIGNAL',
        message: 'Content does not contain recognizable words. Please upload real text.'
      };
    }
    const unique = new Set(normalized).size;
    const ratio = unique / normalized.length;
    if (ratio < MIN_UNIQUE_TOKEN_RATIO) {
      return {
        ok: false,
        code: 'CONTENT_LOW_VARIETY',
        message:
          'Content repeats the same few words too much (possible spam or gibberish). Use varied, meaningful writing.'
      };
    }
  }

  return { ok: true };
}
