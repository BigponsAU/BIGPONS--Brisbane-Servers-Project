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
}): string {
  const parts = [
    `Title: ${params.title}`,
    `Industry: ${params.industry}`,
    `Topic: ${params.topic}`,
    params.userBrief ? `User guidance: ${params.userBrief}` : '',
    '',
    params.seedText,
    '',
    'Write a complete resource article (800–1500 words) suitable for the Brisbane Servers resource library.',
  ];
  return parts.filter(Boolean).join('\n');
}

export function buildImproveUserPrompt(params: {
  title: string;
  industry: string;
  topic: string;
  originalContent: string;
  ragContextText?: string;
}): string {
  const parts = [
    `Improve this resource article while preserving factual intent and structure.`,
    `Title: ${params.title}`,
    `Industry: ${params.industry}`,
    `Topic: ${params.topic}`,
  ];
  if (params.ragContextText?.trim()) {
    parts.push('', 'Related knowledge base context:', params.ragContextText.trim());
  }
  parts.push(
    '',
    '---',
    'Current article:',
    params.originalContent,
    '',
    'Return the full improved article (markdown body only). Add clarity, evidence-led framing, and actionable detail where supported by the context — do not invent statistics or citations.'
  );
  return parts.join('\n');
}
