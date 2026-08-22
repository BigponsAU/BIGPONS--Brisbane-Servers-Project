/**
 * Light copy helpers for non-heading chrome (eyebrows / kickers).
 *
 * Site copy policy:
 * - Section titles, card titles, CTAs, and workspace headings: sentence case
 *   (first word + proper nouns). Do not force case in CSS.
 * - Industry hub names: Title Case with & from industries.ts (canonical).
 * - Legal document names: Title Case (Privacy Policy, Terms of Service).
 * - Brand / product names: preserve authored casing (Brisbane Servers, BIGPONS).
 * - True kickers (section numbers, status badges) may use `.text-kicker`.
 *
 * SemanticText renders authored casing and punctuation as written.
 */

/**
 * Eyebrows / kickers: light normalisation only (no forced uppercase via CSS).
 */
export function formatEyebrowCopy(text: string): string {
  if (!text?.trim()) return text;
  return text.trim().replace(/\s*&\s*/g, ' · ');
}
