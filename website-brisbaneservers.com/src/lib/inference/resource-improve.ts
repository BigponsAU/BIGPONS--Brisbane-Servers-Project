/**
 * Resource improve: RAG context + inference (NVIDIA / Workers AI) with template fallback.
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

export async function improveResourceBody(params: ImproveBodyParams): Promise<ImproveBodyResult> {
  const provider = getInferenceProvider();
  const reason = params.reason ?? 'inference_improve';
  const seedLen = params.resource.content.length + (params.ragContextText?.length ?? 0);

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
        });
        const ai = await completeInference({ system, user, maxTokens: 1400 });
        const validation = params.voiceMatcher.validateVoice(ai.text);
        const score = validation.score ?? 0;

        if (score >= 0.45) {
          await recordUsage({
            userId: params.userId,
            units: estimatedUnits,
            reason,
            modelId: ai.modelId,
          });
          return {
            content: ai.text,
            inferenceMode: ai.provider,
            modelId: ai.modelId,
            voiceScore: score,
            voiceValid: validation.isValid ?? score >= 0.6,
          };
        }
        console.warn(`[inference] improve voice score ${score} below threshold; template fallback`);
      } catch (err) {
        console.warn(`[inference] improve ${provider} failed; template fallback`, err);
      }
    }
  }

  const content = improveTemplateBody(params);
  const validation = params.voiceMatcher.validateVoice(content);
  return {
    content,
    inferenceMode: 'template',
    modelId: 'voice-framework-template',
    voiceScore: validation.score ?? 0,
    voiceValid: validation.isValid ?? false,
  };
}
