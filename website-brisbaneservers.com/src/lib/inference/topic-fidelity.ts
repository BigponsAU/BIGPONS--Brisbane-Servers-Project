/**
 * Topic fidelity helpers for Improve / ingest — reject outputs that drift into
 * unrelated design-system jargon or lose overlap with the original article.
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
  /\bmathematical\s+precision\b/i,
  /\bvectorized\b/i,
  /\bpermutation\b/i,
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
 * Rough topic fidelity via hash embeddings of title+industry+topic+body excerpts.
 * Returns 0–1; higher means the candidate stays closer to the original topic.
 */
export function scoreTopicFidelity(original: string, candidate: string): number {
  const a = hashEmbedding(original.slice(0, 4000));
  const b = hashEmbedding(candidate.slice(0, 4000));
  return cosineSimilarity(a, b);
}

export function isTopicFaithful(original: string, candidate: string, min = TOPIC_FIDELITY_MIN): boolean {
  if (!candidate.trim()) return false;
  if (containsDesignSystemJargon(candidate) && !containsDesignSystemJargon(original)) {
    return false;
  }
  return scoreTopicFidelity(original, candidate) >= min;
}
