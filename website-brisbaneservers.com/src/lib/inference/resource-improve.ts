/**
 * Resource improve: RAG context + inference (NVIDIA / Workers AI) with safe fallback.
 * Falls back to the original article when template/AI output fails topic fidelity —
 * never force design-system Extrapolator jargon into consulting content.
 */

import type { Extrapolator } from '@voice-framework/generators/extrapolator';
import type { VoiceMatcher } from '@voice-framework/generators/voice-matcher';
import type { AuthRole } from '../../utils/auth';
import type { Resource } from '../resource-types';
import type { ResolvedResourceVoiceProfile } from '../resource-voice-profile';
import { resolveGenerateLength } from '../generate-length';
import { buildInferenceSystemPrompt, buildImproveUserPrompt } from './prompt-builder';
import { countWords, ensureArticleWordBand } from './on-topic-article';
import { developArticle, type DevelopMode } from './article-develop';
import { completeInference, getInferenceProvider } from './inference-provider';
import {
  checkUsageCap,
  recordUsage,
  unitsForGenerate,
  type UsageReason,
} from './usage-ledger';
import type { InferenceMode } from './resource-generate';
import {
  containsDesignSystemJargon,
  isDesignSystemVoiceProfile,
  isTopicFaithful,
  sanitizeDesignSystemContamination,
  scoreTopicFidelity,
  TOPIC_FIDELITY_MIN,
} from './topic-fidelity';

export interface ImproveBodyParams {
  resource: Resource;
  ragContextText: string;
  userId: string;
  userRole: AuthRole;
  resolved: ResolvedResourceVoiceProfile;
  extrapolator: Extrapolator;
  voiceMatcher: VoiceMatcher;
  reason?: UsageReason;
  develop?: { mode: DevelopMode; heading?: string };
}

export interface ImproveBodyResult {
  content: string;
  inferenceMode: InferenceMode;
  modelId?: string;
  voiceScore: number;
  voiceValid: boolean;
  topicFidelity: number;
}

function improveTemplateBody(params: ImproveBodyParams): string {
  const base = params.ragContextText
    ? `${params.ragContextText}\n\n---\nOriginal:\n${params.resource.content}`
    : params.resource.content;
  return params.extrapolator.extrapolate(base, {
    expansionLevel: 'moderate',
    addExamples: true,
    addDetails: true,
  });
}

function acceptCandidate(
  params: ImproveBodyParams,
  content: string,
  inferenceMode: ImproveBodyResult['inferenceMode'],
  modelId: string | undefined
): ImproveBodyResult | null {
  const original = params.resource.content;
  const allowDesign = isDesignSystemVoiceProfile(params.resolved.profile);
  if (!isTopicFaithful(original, content, TOPIC_FIDELITY_MIN, { allowDesignSystemJargon: allowDesign })) {
    return null;
  }
  // Reject outputs that look like raw RAG dumps (chunk markers leaked into body).
  if (/\[[^\]]+\s+#\d+\]/.test(content)) {
    return null;
  }
  const validation = params.voiceMatcher.validateVoice(content);
  return {
    content,
    inferenceMode,
    modelId,
    voiceScore: validation.score ?? 0,
    voiceValid: validation.isValid ?? false,
    topicFidelity: scoreTopicFidelity(original, content),
  };
}

function needsDocumentSeed(content: string): boolean {
  const hasMajorHeading = /^##\s+/m.test(content);
  return (
    /Going deeper|Working detail:|Practice note\s+\d+|Pilot notes|before you wide/i.test(content) ||
    !hasMajorHeading
  );
}

function structuredArticle(params: ImproveBodyParams): string {
  const plan = resolveGenerateLength(undefined, params.resource.metadata?.wordCount || 1600);
  return ensureArticleWordBand(params.resource.content, {
    industry: params.resource.industry,
    topic: params.resource.topic,
    title: params.resource.title,
    minWords: plan.minWords,
    maxWords: plan.maxWords,
  });
}

function keepOriginal(params: ImproveBodyParams): ImproveBodyResult {
  const raw = params.resource.content;
  const allowDesign = isDesignSystemVoiceProfile(params.resolved.profile);
  if (needsDocumentSeed(raw)) {
    const rebuilt = structuredArticle(params);
    const validation = params.voiceMatcher.validateVoice(rebuilt);
    return {
      content: rebuilt,
      inferenceMode: 'template',
      modelId: 'document-structure-seed',
      voiceScore: validation.score ?? 0,
      voiceValid: validation.isValid ?? false,
      topicFidelity: scoreTopicFidelity(raw, rebuilt),
    };
  }
  // If a prior bad Improve left design-system junk in an industry draft, strip it
  // rather than preserving gibberish as "original".
  const content =
    !allowDesign && containsDesignSystemJargon(raw)
      ? sanitizeDesignSystemContamination(raw) || raw
      : raw;
  const validation = params.voiceMatcher.validateVoice(content);
  return {
    content,
    inferenceMode: 'original',
    modelId: content === raw ? 'topic-fidelity-guard' : 'design-jargon-sanitize',
    voiceScore: validation.score ?? 0,
    voiceValid: validation.isValid ?? false,
    topicFidelity: scoreTopicFidelity(raw, content),
  };
}

export async function improveResourceBody(params: ImproveBodyParams): Promise<ImproveBodyResult> {
  const provider = getInferenceProvider();
  const reason = params.reason ?? 'inference_improve';
  const seedLen = params.resource.content.length + (params.ragContextText?.length ?? 0);
  const allowDesignJargon = isDesignSystemVoiceProfile(params.resolved.profile);

  if (provider === 'nvidia' || provider === 'workers-ai') {
    const estimatedUnits = unitsForGenerate(seedLen + 1500);
    const cap = await checkUsageCap(params.userId, params.userRole, estimatedUnits);
    if (!cap.ok) {
      console.warn(
        `[inference] improve cap exceeded user=${params.userId} used=${cap.used}/${cap.cap}; template fallback`
      );
    } else {
      try {
        const system = buildInferenceSystemPrompt(params.resolved.profile);
        const user = buildImproveUserPrompt({
          title: params.resource.title,
          industry: params.resource.industry,
          topic: params.resource.topic,
          originalContent: params.resource.content,
          ragContextText: params.ragContextText,
          allowDesignSystemJargon: allowDesignJargon,
          develop: params.develop,
        });
        const ai = await completeInference({ system, user, maxTokens: 1400 });
        const validation = params.voiceMatcher.validateVoice(ai.text);
        const score = validation.score ?? 0;

        if (score >= 0.45) {
          const plan = resolveGenerateLength(undefined, params.resource.metadata?.wordCount || 1600);
          const article = params.develop
            ? ai.text
            : ensureArticleWordBand(ai.text, {
                industry: params.resource.industry,
                topic: params.resource.topic,
                title: params.resource.title,
                minWords: plan.minWords,
                maxWords: plan.maxWords,
              });
          const accepted = acceptCandidate(params, article, ai.provider, ai.modelId);
          if (accepted) {
            await recordUsage({
              userId: params.userId,
              units: estimatedUnits,
              reason,
              modelId: ai.modelId,
            });
            return accepted;
          }
          console.warn(
            `[inference] improve AI rejected for topic fidelity; trying template then original`
          );
        } else {
          console.warn(`[inference] improve voice score ${score} below threshold; template fallback`);
        }
      } catch (err) {
        console.warn(`[inference] improve ${provider} failed; template fallback`, err);
      }
    }
  }

  if (params.develop) {
    const developed = developArticle({
      content: params.resource.content,
      industry: params.resource.industry,
      topic: params.resource.topic,
      title: params.resource.title,
      mode: params.develop.mode,
      heading: params.develop.heading,
    });
    const developedAccepted = acceptCandidate(params, developed, 'template', 'article-develop');
    if (developedAccepted) return developedAccepted;
  }

  const templateContent = improveTemplateBody(params);
  // Design Extrapolator templates invent golden-ratio / cipher expansions — only
  // allow that path for an intentional design-system profile.
  if (allowDesignJargon) {
    const templateAccepted = acceptCandidate(
      params,
      templateContent,
      'template',
      'voice-framework-template'
    );
    if (templateAccepted) {
      return templateAccepted;
    }
  }

  console.warn(
    `[inference] improve falling back to original content for resource=${params.resource.id} (template skipped or failed topic fidelity)`
  );
  return keepOriginal(params);
}
