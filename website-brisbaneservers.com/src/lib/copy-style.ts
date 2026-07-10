/**
 * Light copy helpers for non-heading chrome (eyebrows / kickers).
 *
 * Do not use these for body or heading text — SemanticText renders authored
 * casing and punctuation as written. A previous formatHeadingCopy() forced
 * sentence-case across the site and is intentionally removed.
 */

/**
 * Eyebrows / kickers: light normalisation only (no forced uppercase via CSS).
 */
export function formatEyebrowCopy(text: string): string {
  if (!text?.trim()) return text;
  return text.trim().replace(/\s*&\s*/g, ' · ');
}
