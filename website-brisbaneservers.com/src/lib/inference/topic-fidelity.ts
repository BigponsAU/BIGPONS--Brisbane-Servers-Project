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

/** Soft floor for greenfield Generate (seed is short vs full article). */
export const GENERATE_FIDELITY_MIN = 0.28;

/**
 * Generate / materialize fidelity: stay on industry+topic, reject design gibberish.
 * Does not require high lexical overlap with a short seed the way Improve does with a full article.
 */
export function isGenerateFaithful(params: {
  industry: string;
  topic: string;
  title: string;
  seedText?: string;
  candidate: string;
  allowDesignSystemJargon?: boolean;
}): boolean {
  const candidate = params.candidate?.trim() ?? '';
  if (!candidate) return false;
  if (!params.allowDesignSystemJargon && containsDesignSystemJargon(candidate)) {
    return false;
  }
  if (/\[[^\]]+\s+#\d+\]/.test(candidate)) return false;

  const hay = candidate.toLowerCase();
  const tokens = [params.industry, params.topic, params.title]
    .flatMap((t) =>
      String(t || '')
        .toLowerCase()
        .replace(/[^a-z0-9&/\s-]+/g, ' ')
        .split(/[\s/_-]+/)
        .filter((w) => w.length >= 4)
    )
    .filter((w, i, arr) => arr.indexOf(w) === i);
  const hit = tokens.some((w) => hay.includes(w));
  if (!hit) return false;

  const anchor = [params.title, params.industry, params.topic, params.seedText ?? '']
    .join(' ')
    .trim();
  if (anchor.length < 40) return true;
  return scoreTopicFidelity(anchor, candidate) >= GENERATE_FIDELITY_MIN;
}

/** Heading labels from markdown — used to verify document rewrite kept structure. */
export function extractMarkdownHeadings(md: string): string[] {
  return [...(md.matchAll(/^#{1,6}\s+(.+)$/gm) ?? [])].map((m) =>
    m[1].trim().toLowerCase()
  );
}

/**
 * Structure preservation for OCR/document rewrite: retain most original headings.
 */
export function isStructurePreserved(
  original: string,
  candidate: string,
  minRetain = 0.6
): boolean {
  const a = extractMarkdownHeadings(original);
  if (a.length === 0) return true;
  const b = extractMarkdownHeadings(candidate);
  if (b.length < Math.ceil(a.length * 0.7)) return false;
  const retained = a.filter((h) => b.some((x) => x.includes(h) || h.includes(x))).length;
  return retained / a.length >= minRetain;
}
