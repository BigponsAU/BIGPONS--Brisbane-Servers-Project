import type { VoiceProfile } from '@voice-framework/models/voice-profile';
import { BRISBANE_PROFILE_NAME } from '../brisbane-profile';

export function buildInferenceSystemPrompt(profile: VoiceProfile): string {
  const tone = profile.characteristics?.tone;
  const markers = profile.characteristics?.voiceMarkers;
  const openings = markers?.openingPhrases?.slice(0, 4).join('; ') ?? '';
  const terms =
    profile.characteristics?.linguisticPatterns?.vocabulary?.technicalTerms?.slice(0, 12).join(', ') ?? '';

  return [
    `You write in the ${BRISBANE_PROFILE_NAME} / Brisbane Servers voice for Australian SMEs.`,
    tone
      ? `Tone: formality ${tone.formality}, technicality ${tone.technicality}.`
      : '',
    openings ? `Opening style examples: ${openings}.` : '',
    terms ? `Preferred terminology (use naturally): ${terms}.` : '',
    'Use evidence before claims, plain Australian English, actionable structure.',
    'Output markdown body only — no preamble or meta commentary.',
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildInferenceUserPrompt(params: {
  seedText: string;
  industry: string;
  topic: string;
  title: string;
  userBrief?: string;
  /** Approximate body length; defaults applied by callers via resolveGenerateLength. */
  minWords?: number;
  maxWords?: number;
  targetWords?: number;
  /** When false (default), ban design-system jargon unrelated to the industry topic. */
  allowDesignSystemJargon?: boolean;
}): string {
  const minWords = params.minWords ?? 850;
  const maxWords = params.maxWords ?? 1500;
  const targetWords = params.targetWords ?? Math.round((minWords + maxWords) / 2);
  const parts = [
    `Title: ${params.title}`,
    `Industry: ${params.industry}`,
    `Topic: ${params.topic}`,
    `Stay on the ${params.industry} / ${params.topic} subject. Do not invent an unrelated technical domain.`,
    params.userBrief ? `User guidance: ${params.userBrief}` : '',
  ];
  if (!params.allowDesignSystemJargon) {
    parts.push(
      'Do NOT introduce design-system / meta jargon unrelated to this industry and topic (e.g. cipher, Fourier transform, wave function, golden ratio, phi, 1.618, 61.8, "mathematical precision", vectorized, permutation).'
    );
  }
  parts.push(
    '',
    params.seedText,
    '',
    `Write a complete resource article of about ${targetWords} words (aim for ${minWords}–${maxWords} words) suitable for a full Brisbane Servers resource library page.`,
    'Use clear markdown headings and enough practical depth that the article stands alone as a full page — not a short stub.',
    'If the seed includes markdown images (![...](...)), keep figures that are relevant to the topic; do not invent new image URLs.'
  );
  return parts.filter(Boolean).join('\n');
}

export function buildImproveUserPrompt(params: {
  title: string;
  industry: string;
  topic: string;
  originalContent: string;
  ragContextText?: string;
  /** When false (default), ban design-system jargon unrelated to the industry topic. */
  allowDesignSystemJargon?: boolean;
}): string {
  const parts = [
    `Improve this resource article while preserving factual intent, industry focus, and structure.`,
    `Title: ${params.title}`,
    `Industry: ${params.industry}`,
    `Topic: ${params.topic}`,
    `Stay on the ${params.industry} / ${params.topic} subject. Do not change the article into an unrelated technical domain.`,
  ];
  if (!params.allowDesignSystemJargon) {
    parts.push(
      'Do NOT introduce design-system / meta jargon unrelated to this industry and topic (e.g. cipher, Fourier transform, wave function, golden ratio, phi, 1.618, 61.8, "mathematical precision", vectorized, permutation).'
    );
  }
  if (params.ragContextText?.trim()) {
    parts.push('', 'Related knowledge base context (use only if on-topic):', params.ragContextText.trim());
  }
  parts.push(
    '',
    '---',
    'Current article:',
    params.originalContent,
    '',
    'Return the full improved article (markdown body only). Add clarity, evidence-led framing, and actionable detail where supported by the context — do not invent statistics or citations. Prefer finishing incomplete sentences from the original over inventing new sections.'
  );
  return parts.join('\n');
}

export function buildDocumentRewriteSystemPrompt(profile: VoiceProfile): string {
  return [
    buildInferenceSystemPrompt(profile),
    'You rewrite existing documents in the target voice while preserving document structure.',
    'CRITICAL rules:',
    '- Keep every heading level (# ## ###), list type, table layout (markdown tables), block quote, markdown images (![alt](url)), and section order.',
    '- Do NOT alter logos, letterhead, footer boilerplate, company legal names, or brand colour/style references.',
    '- Rewrite informational prose only — facts may be clarified but not invented.',
    '- Return markdown body only; no preamble.',
  ].join('\n');
}

export function buildDocumentRewriteUserPrompt(params: {
  originalContent: string;
  title?: string;
  allowDesignSystemJargon?: boolean;
}): string {
  const parts = [
    params.title ? `Document title: ${params.title}` : '',
    'Rewrite the document below in the target voice. Preserve structure exactly; change wording only.',
  ];
  if (!params.allowDesignSystemJargon) {
    parts.push(
      'Do NOT introduce design-system / meta jargon (cipher, Fourier, wave function, golden ratio, phi, 1.618, 61.8, "mathematical precision", vectorized, permutation).'
    );
  }
  parts.push('', '---', params.originalContent);
  return parts.filter(Boolean).join('\n');
}
