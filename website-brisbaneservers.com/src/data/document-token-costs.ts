/**
 * Community token costs for document OCR / rewrite (NVIDIA + inference resources).
 * Earn tokens via approved contributions — see /contribute and GET /api/tokens/me.
 */
export const DOCUMENT_TOKEN_COSTS = {
  /** Local parse: txt, md, html, docx xml, text-based PDF */
  extractLocal: 1,
  /** NVIDIA vision OCR: scanned PDF, images, docx fallback */
  extractVision: 4,
  /** Structure-preserving voice rewrite */
  rewrite: 3,
} as const;

export type DocumentTokenCostKey = keyof typeof DOCUMENT_TOKEN_COSTS;
