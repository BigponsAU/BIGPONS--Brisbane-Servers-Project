import type { VoiceProfile } from '@voice-framework/models/voice-profile';
import { BRISBANE_PROFILE_NAME } from '../brisbane-profile';
import { buildDocumentStructureSeed } from './article-structure-seed';
import { articlePlanNotes, developPromptInstructions, type DevelopMode } from './article-develop';

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
    'Suggested spine for THIS article only — change a heading if the brief needs it, keep importance and continuity:',
    buildDocumentStructureSeed({
      industry: params.industry,
      topic: params.topic,
      title: params.title,
      brief: params.userBrief,
    }),
    '',
    'Knowledge / brief (use only if on-topic):',
    params.seedText,
    '',
    `Write a complete ${params.industry} / ${params.topic} article. Around ${targetWords} words is enough if the claims need it (do not exceed ${maxWords}). Do not pad, clone headings, or invent extra sections to hit a count.`,
    'Heading levels mark importance: one # title; ## only for the two or three load-bearing claims; ### for supporting points that follow from the claim above; #### for short asides only when they earn space. Do not make every heading the same weight.',
    'Do not write heading then one equal paragraph then heading. The main claim needs more paragraphs and more refined explanation than asides.',
    'Place :::diagram-here::: in the section that is the join for this topic — after a short reading of what to look at, then discuss what the picture shows. Never dump the figure at the end uncommented.',
    'If the seed includes markdown images (![...](...)), keep figures that are relevant to the topic; do not invent new image URLs.',
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
  develop?: { mode: DevelopMode; heading?: string };
}): string {
  const parts = [
    params.develop
      ? developPromptInstructions({
          mode: params.develop.mode,
          heading: params.develop.heading,
          industry: params.industry,
          topic: params.topic,
        })
      : `Improve this resource article while preserving factual intent, industry focus, and the headings that already work.`,
    `Title: ${params.title}`,
    `Industry: ${params.industry}`,
    `Topic: ${params.topic}`,
    `Stay on the ${params.industry} / ${params.topic} subject. Do not change the article into an unrelated technical domain.`,
    articlePlanNotes(params.originalContent, params.industry, params.topic),
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
    'Do not replace this draft with a canned outline. Keep existing headings unless they are filler. Deepen the main claim; add ### only where a supporting distinction is necessary; add #### for a short aside.',
    buildDocumentStructureSeed({
      industry: params.industry,
      topic: params.topic,
      title: params.title,
      existingMarkdown: params.originalContent,
    }),
    '',
    '---',
    'Current article:',
    params.originalContent,
    '',
    'Return the full improved article (markdown body only). Mix ## / ### / #### by importance. Keep :::diagram-here::: next to the operating explanation and discuss the picture. Do not invent statistics or citations.'
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
