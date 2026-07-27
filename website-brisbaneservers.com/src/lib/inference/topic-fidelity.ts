/**
 * Topic fidelity helpers for Improve / ingest — reject outputs that drift into
 * unrelated design-system jargon or lose overlap with the original article.
 * Industry-agnostic: applies to every industry/topic in the consulting library.
 */

import { hashEmbedding } from '../semantic/embedding-client';
import { cosineSimilarity } from '../semantic/semantic-similarity';

/** Design-system voice jargon that must not appear in consulting/industry articles. */
export const DESIGN_SYSTEM_JARGON_PATTERNS: RegExp[] = [
  /\bcipher\b/i,
  /\bfourier\b/i,
  /\bwave\s+function\b/i,
  /\bgolden\s+ratio\b/i,
  /\bphi\b/i,
  /\b1\.618\b/,
  /\b0\.618\b/,
  /\b61\.8\b/,
  /\b38\.2\b/,
  /\b23\.6\b/,
  /\b76\.4\b/,
  /\bmathematical\s+precision\b/i,
  /\bvectorized\b/i,
  /\bpermutation\b/i,
  /\bdesign\s+blocks?\b/i,
  /\bvisual\s+patterns?\b/i,
  /for comprehensive integration/i,
  /for comprehensive system integration/i,
];

/** Minimum lexical/hash overlap with the original to accept an improve candidate. */
export const TOPIC_FIDELITY_MIN = 0.42;

export function containsDesignSystemJargon(text: string): boolean {
  return DESIGN_SYSTEM_JARGON_PATTERNS.some((re) => re.test(text));
}

export function isDesignSystemVoiceProfile(profile: { voiceName?: string }): boolean {
  return (profile.voiceName ?? '').toLowerCase().includes('design system');
}

/**
 * Strip design-system junk, RAG chunk markers, and empty debris from industry articles.
 * Used when a prior bad Improve contaminated a draft — keeps purposeful topic prose.
 */
export function sanitizeDesignSystemContamination(text: string): string {
  if (!text?.trim()) return text ?? '';

  let cleaned = text
    .replace(/\[[^\]]+\s+#\d+\][^\n]*/g, '')
    .replace(/^Knowledge base context:\s*/gim, '')
    .replace(/^---\s*$/gm, '');

  const blocks = cleaned.split(/\n{2,}/);
  const kept = blocks.filter((block) => {
    const t = block.trim();
    if (!t) return false;
    if (DESIGN_SYSTEM_JARGON_PATTERNS.some((re) => re.test(t))) return false;
    if (/^The\s+.+\s+(provides|maintains|creates|uses)\s+.+\s+with\s+[\d.]+/i.test(t)) {
      return false;
    }
    if (/^-\s+\*\*[^*]+\*\*:\s+.+\s+for comprehensive/i.test(t)) return false;
    return true;
  });

  return kept
    .join('\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Rough topic fidelity via hash embeddings of title+industry+topic+body excerpts.
 * Returns 0–1; higher means the candidate stays closer to the original topic.
 */
export function scoreTopicFidelity(original: string, candidate: string): number {
  const a = hashEmbedding(original.slice(0, 4000));
  const b = hashEmbedding(candidate.slice(0, 4000));
  return cosineSimilarity(a, b);
}

export function isTopicFaithful(
  original: string,
  candidate: string,
  min = TOPIC_FIDELITY_MIN,
  options?: { allowDesignSystemJargon?: boolean }
): boolean {
  if (!candidate.trim()) return false;
  if (!options?.allowDesignSystemJargon && containsDesignSystemJargon(candidate)) {
    return false;
  }
  return scoreTopicFidelity(original, candidate) >= min;
}
