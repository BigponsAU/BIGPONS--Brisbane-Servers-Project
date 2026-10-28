/**
 * Resource body generation: Workers AI / NVIDIA with safe template fallback.
 * Same purpose-health standard as Improve: reject design jargon / off-topic output;
 * never force design Extrapolator expansions into consulting content.
 */

import type { TextGenerator } from '@voice-framework/generators/text-generator';
import type { Extrapolator } from '@voice-framework/generators/extrapolator';
import type { VoiceMatcher } from '@voice-framework/generators/voice-matcher';
import type { AuthRole } from '../../utils/auth';
import type { ResolvedResourceVoiceProfile } from '../resource-voice-profile';
import { resolveGenerateLength } from '../generate-length';
import { buildInferenceSystemPrompt, buildInferenceUserPrompt } from './prompt-builder';
import {
  checkUsageCap,
  recordUsage,
  unitsForGenerate,
  type UsageReason,
} from './usage-ledger';
import { completeInference, getInferenceProvider } from './inference-provider';
import {
  isDesignSystemVoiceProfile,
  isGenerateFaithful,
  scoreTopicFidelity,
} from './topic-fidelity';
import { buildOnTopicArticle, countWords, ensureArticleWordBand } from './on-topic-article';

export type InferenceMode = 'nvidia' | 'workers-ai' | 'template' | 'original';

export interface GenerateBodyParams {
  seedText: string;
  industry: string;
  topic: string;
  title: string;
  userBrief?: string;
  userId: string;
  userRole: AuthRole;
  resolved: ResolvedResourceVoiceProfile;
  textGenerator: TextGenerator;
  extrapolator: Extrapolator;
  voiceMatcher: VoiceMatcher;
  options?: {
    length?: 'short' | 'medium' | 'long' | 'full' | string | number;
    /** Preferred over length when set (e.g. 600, 1100, 1600, 2200). */
    wordCount?: string | number;
    includeExamples?: boolean;
  };
  reason?: UsageReason;
}

export interface GenerateBodyResult {
  content: string;
  inferenceMode: InferenceMode;
  modelId?: string;
  voiceScore: number;
  voiceValid: boolean;
  topicFidelity: number;
}

function topicAnchor(params: GenerateBodyParams): string {
  return [params.title, params.industry, params.topic, params.userBrief ?? '', params.seedText]
    .join(' ')
    .trim();
}

function acceptCandidate(
  params: GenerateBodyParams,
  content: string,
  inferenceMode: GenerateBodyResult['inferenceMode'],
  modelId: string | undefined
): GenerateBodyResult | null {
  const allowDesign = isDesignSystemVoiceProfile(params.resolved.profile);
  if (
    !isGenerateFaithful({
      industry: params.industry,
      topic: params.topic,
      title: params.title,
      seedText: params.seedText,
      candidate: content,
      allowDesignSystemJargon: allowDesign,
    })
  ) {
    return null;
  }
  const validation = params.voiceMatcher.validateVoice(content);
  return {
    content,
    inferenceMode,
    modelId,
    voiceScore: validation.score ?? 0,
    voiceValid: validation.isValid ?? false,
    topicFidelity: scoreTopicFidelity(topicAnchor(params), content),
  };
}

async function generateTemplateBody(params: GenerateBodyParams): Promise<string> {
  const { textGenerator, extrapolator, seedText, options } = params;
  const length = resolveGenerateLength(options?.length, options?.wordCount);
  if (!isDesignSystemVoiceProfile(params.resolved.profile)) {
    return buildOnTopicArticle({
      industry: params.industry,
      topic: params.topic,
      title: params.title,
      brief: params.userBrief,
      minWords: length.minWords,
      maxWords: length.maxWords,
    });
  }
  const generated = textGenerator.generateText(seedText, {
    length: length.templateLength,
    includeExamples: options?.includeExamples !== false,
    includeStructure: true,
    style: 'descriptive',
  });
  return extrapolator.extrapolate(generated, {
    expansionLevel: 'moderate',
    addExamples: true,
    addDetails: true,
  });
}

function bandedArticle(params: GenerateBodyParams, content: string): string {
  const length = resolveGenerateLength(params.options?.length, params.options?.wordCount);
  return ensureArticleWordBand(content, {
    industry: params.industry,
    topic: params.topic,
    title: params.title,
    brief: params.userBrief,
    minWords: length.minWords,
    maxWords: length.maxWords,
  });
}

export async function generateResourceBody(params: GenerateBodyParams): Promise<GenerateBodyResult> {
  const provider = getInferenceProvider();
  const reason = params.reason ?? 'inference_generate';
  const allowDesignJargon = isDesignSystemVoiceProfile(params.resolved.profile);

  const length = resolveGenerateLength(params.options?.length, params.options?.wordCount);

  if (provider === 'nvidia' || provider === 'workers-ai') {
    const estimatedUnits = unitsForGenerate(params.seedText.length + length.targetWords * 6);
    const cap = await checkUsageCap(params.userId, params.userRole, estimatedUnits);
    if (!cap.ok) {
      console.warn(
        `[inference] daily cap exceeded user=${params.userId} used=${cap.used}/${cap.cap}; template fallback`
      );
    } else {
      try {
        const system = buildInferenceSystemPrompt(params.resolved.profile);
        const user = buildInferenceUserPrompt({
          seedText: params.seedText,
          industry: params.industry,
          topic: params.topic,
          title: params.title,
          userBrief: params.userBrief,
          minWords: length.minWords,
          maxWords: length.maxWords,
          targetWords: length.targetWords,
          allowDesignSystemJargon: allowDesignJargon,
        });
        const ai = await completeInference({ system, user, maxTokens: length.maxTokens });
        const validation = params.voiceMatcher.validateVoice(ai.text);
        const score = validation.score ?? 0;

        let article = ai.text;
        if (isGenerateFaithful({
          industry: params.industry,
          topic: params.topic,
          title: params.title,
          seedText: params.seedText,
          candidate: article,
          allowDesignSystemJargon: allowDesignJargon,
        }) && countWords(article) < length.minWords) {
          try {
            const more = await completeInference({
              system,
              user: [
                `Continue the same ${params.industry} / ${params.topic} article.`,
                `You have ${countWords(article)} words; write until you reach about ${length.targetWords} (at least ${length.minWords}).`,
                'Do not restart. No preamble. Markdown only.',
                '',
                article.slice(-1800),
              ].join('\n'),
              maxTokens: length.maxTokens,
            });
            if (more.text.trim()) {
              article = `${article.trim()}\n\n${more.text.trim()}`;
            }
          } catch (continueErr) {
            console.warn(`[inference] length continuation failed`, continueErr);
          }
        }

        article = bandedArticle(params, article);
        const accepted = acceptCandidate(params, article, ai.provider, ai.modelId);
        if (accepted && (score >= 0.35 || countWords(article) >= length.minWords)) {
          await recordUsage({
            userId: params.userId,
            units: estimatedUnits,
            reason,
            modelId: ai.modelId,
          });
          return accepted;
        }
        console.warn(
          `[inference] generate AI rejected (voice=${score}); on-topic article fallback`,
        );
      } catch (err) {
        console.warn(`[inference] ${provider} failed; template fallback`, err);
      }
    }
  }

  const templateContent = bandedArticle(params, await generateTemplateBody(params));
  const templateAccepted = acceptCandidate(
    params,
    templateContent,
    'template',
    'on-topic-article'
  );
  if (templateAccepted) {
    return templateAccepted;
  }

  console.warn(
    `[inference] generate falling back to banded on-topic article for ${params.industry}/${params.topic}`
  );
  const fallback = bandedArticle(params, '');
  const validation = params.voiceMatcher.validateVoice(fallback);
  return {
    content: fallback,
    inferenceMode: 'template',
    modelId: 'on-topic-article',
    voiceScore: validation.score ?? 0,
    voiceValid: validation.isValid ?? false,
    topicFidelity: scoreTopicFidelity(topicAnchor(params), fallback),
  };
}
