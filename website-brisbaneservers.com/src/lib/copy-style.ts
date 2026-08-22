/**
 * Light copy helpers for chrome and headings.
 *
 * Site copy policy:
 * - Section titles, card titles, and topic headings: Title Case
 *   (every word; acronyms such as IT / POS stay intact). Do not force case in CSS.
 * - Industry hub names: Title Case with & from industries.ts (canonical).
 * - Legal document names: Title Case (Privacy Policy, Terms of Service).
 * - Brand / product names: preserve authored casing (Brisbane Servers, BIGPONS).
 * - Hero taglines and body copy stay as authored (usually sentence case).
 * - True kickers (section numbers, status badges) may use `.text-kicker`.
 *
 * SemanticText parent headings run through formatHeadingCopy.
 */

/**
 * Eyebrows / kickers: light normalisation only (no forced uppercase via CSS).
 */
export function formatEyebrowCopy(text: string): string {
  if (!text?.trim()) return text;
  return text.trim().replace(/\s*&\s*/g, ' · ');
}

/**
 * Title Case for underlined section titles, cards, and topic labels.
 * Preserves all-caps tokens (IT, POS, AI) and does not rewrite punctuation.
 */
export function formatHeadingCopy(text: string): string {
  if (!text?.trim()) return text;
  return text.replace(/[A-Za-z0-9]+(?:['’][A-Za-z]+)?/g, (word) => {
    if (/^[A-Z0-9]{2,}$/.test(word)) return word;
    return word.charAt(0).toUpperCase() + word.slice(1);
  });
}
