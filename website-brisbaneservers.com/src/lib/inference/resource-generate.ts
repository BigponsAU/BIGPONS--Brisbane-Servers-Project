/**
 * Resource body generation: Workers AI (free tier) with template fallback.
 */

import type { TextGenerator } from '@voice-framework/generators/text-generator';
import type { Extrapolator } from '@voice-framework/generators/extrapolator';
import type { VoiceMatcher } from '@voice-framework/generators/voice-matcher';
import type { AuthRole } from '../../utils/auth';
import type { ResolvedResourceVoiceProfile } from '../resource-voice-profile';
import { buildInferenceSystemPrompt, buildInferenceUserPrompt } from './prompt-builder';
import {
  checkUsageCap,
  recordUsage,
  unitsForGenerate,
  type UsageReason,
} from './usage-ledger';
import { completeWithWorkersAI, getInferenceProvider } from './workers-ai-client';

export type InferenceMode = 'workers-ai' | 'template';

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
    length?: 'short' | 'medium' | 'long';
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
}

async function generateTemplateBody(params: GenerateBodyParams): Promise<string> {
  const { textGenerator, extrapolator, seedText, options } = params;
  const generated = textGenerator.generateText(seedText, {
    length: options?.length || 'long',
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

export async function generateResourceBody(params: GenerateBodyParams): Promise<GenerateBodyResult> {
  const provider = getInferenceProvider();
  const reason = params.reason ?? 'inference_generate';

  if (provider === 'workers-ai') {
    const estimatedUnits = unitsForGenerate(params.seedText.length + 2000);
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
        });
        const ai = await completeWithWorkersAI({ system, user, maxTokens: 1800 });
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
            inferenceMode: 'workers-ai',
            modelId: ai.modelId,
            voiceScore: score,
            voiceValid: validation.isValid ?? score >= 0.6,
          };
        }
        console.warn(`[inference] voice score ${score} below threshold; template fallback`);
      } catch (err) {
        console.warn('[inference] Workers AI failed; template fallback', err);
      }
    }
  }

  const content = await generateTemplateBody(params);
  const validation = params.voiceMatcher.validateVoice(content);
  return {
    content,
    inferenceMode: 'template',
    modelId: 'voice-framework-template',
    voiceScore: validation.score ?? 0,
    voiceValid: validation.isValid ?? false,
  };
}
