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
  const generated = textGenerator.generateText(seedText, {
    length: options?.length || 'long',
    includeExamples: options?.includeExamples !== false,
    includeStructure: true,
    style: 'descriptive',
  });
  // Design Extrapolator invents golden-ratio / cipher expansions — skip for consulting.
  if (isDesignSystemVoiceProfile(params.resolved.profile)) {
    return extrapolator.extrapolate(generated, {
      expansionLevel: 'moderate',
      addExamples: true,
      addDetails: true,
    });
  }
  return generated;
}

function minimalSeedFallback(params: GenerateBodyParams): GenerateBodyResult {
  const content = [
    `# ${params.title}`,
    '',
    `${params.topic} guidance for ${params.industry} organisations.`,
    '',
    params.userBrief?.trim() || params.seedText.trim() ||
      `Practical notes on ${params.topic} for ${params.industry} teams in Australia.`,
  ].join('\n');
  const validation = params.voiceMatcher.validateVoice(content);
  return {
    content,
    inferenceMode: 'template',
    modelId: 'topic-seed-fallback',
    voiceScore: validation.score ?? 0,
    voiceValid: validation.isValid ?? false,
    topicFidelity: scoreTopicFidelity(topicAnchor(params), content),
  };
}

export async function generateResourceBody(params: GenerateBodyParams): Promise<GenerateBodyResult> {
  const provider = getInferenceProvider();
  const reason = params.reason ?? 'inference_generate';
  const allowDesignJargon = isDesignSystemVoiceProfile(params.resolved.profile);

  if (provider === 'nvidia' || provider === 'workers-ai') {
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
          allowDesignSystemJargon: allowDesignJargon,
        });
        const ai = await completeInference({ system, user, maxTokens: 1800 });
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
          console.warn(`[inference] generate AI rejected for topic fidelity; template fallback`);
        } else {
          console.warn(`[inference] voice score ${score} below threshold; template fallback`);
        }
      } catch (err) {
        console.warn(`[inference] ${provider} failed; template fallback`, err);
      }
    }
  }

  const templateContent = await generateTemplateBody(params);
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
    `[inference] generate falling back to minimal on-topic seed for ${params.industry}/${params.topic}`
  );
  return minimalSeedFallback(params);
}
