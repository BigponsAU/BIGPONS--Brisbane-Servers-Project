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
import { buildInferenceSystemPrompt, buildImproveUserPrompt } from './prompt-builder';
import { completeInference, getInferenceProvider } from './inference-provider';
import {
  checkUsageCap,
  recordUsage,
  unitsForGenerate,
  type UsageReason,
} from './usage-ledger';
import type { InferenceMode } from './resource-generate';
import {
  isDesignSystemVoiceProfile,
  isTopicFaithful,
  scoreTopicFidelity,
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
  if (!allowDesign && !isTopicFaithful(original, content)) {
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

function keepOriginal(params: ImproveBodyParams): ImproveBodyResult {
  const content = params.resource.content;
  const validation = params.voiceMatcher.validateVoice(content);
  return {
    content,
    inferenceMode: 'original',
    modelId: 'topic-fidelity-guard',
    voiceScore: validation.score ?? 0,
    voiceValid: validation.isValid ?? false,
    topicFidelity: 1,
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
        });
        const ai = await completeInference({ system, user, maxTokens: 1400 });
        const validation = params.voiceMatcher.validateVoice(ai.text);
        const score = validation.score ?? 0;

        if (score >= 0.45) {
          const accepted = acceptCandidate(params, ai.text, ai.provider, ai.modelId);
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

  const templateContent = improveTemplateBody(params);
  const templateAccepted = acceptCandidate(
    params,
    templateContent,
    'template',
    'voice-framework-template'
  );
  if (templateAccepted) {
    return templateAccepted;
  }

  console.warn(
    `[inference] improve template failed topic fidelity; keeping original content for resource=${params.resource.id}`
  );
  return keepOriginal(params);
}
