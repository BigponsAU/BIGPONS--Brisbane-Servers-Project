/**
 * Light copy helpers for non-heading chrome (eyebrows / kickers).
 *
 * Site copy policy (after SemanticText stopped rewriting casing):
 * - Section titles, card titles, CTAs: sentence case (first word + proper nouns).
 * - Industry hub names: Title Case with & from industries.ts (canonical).
 * - Legal document names: Title Case (Privacy Policy, Terms of Service).
 * - Brand / product names: preserve authored casing (Brisbane Servers, BIGPONS).
 *
 * Do not use these helpers for body or heading text — SemanticText renders
 * authored casing and punctuation as written.
 */

/**
 * Eyebrows / kickers: light normalisation only (no forced uppercase via CSS).
 */
export function formatEyebrowCopy(text: string): string {
  if (!text?.trim()) return text;
  return text.trim().replace(/\s*&\s*/g, ' · ');
}
