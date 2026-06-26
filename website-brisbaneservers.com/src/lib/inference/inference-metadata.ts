import type { VoiceProfileResolutionKind } from '../resource-types';
import type { InferenceMode } from './resource-generate';

export interface InferenceMetadataInput {
  inferenceMode?: InferenceMode;
  modelId?: string;
  voiceScore: number;
  voiceProfileId?: string;
  voiceProfileResolution?: VoiceProfileResolutionKind;
  wordCount?: number;
  semanticLevel?: 'high' | 'medium' | 'normal';
  growthKind?: 'case_study';
}

export function mergeInferenceMetadata(
  base: Record<string, unknown> | undefined,
  input: InferenceMetadataInput
): Record<string, unknown> {
  return {
    ...base,
    wordCount: input.wordCount ?? base?.wordCount,
    semanticLevel: input.semanticLevel ?? base?.semanticLevel ?? 'high',
    voiceScore: input.voiceScore,
    voiceProfileId: input.voiceProfileId ?? base?.voiceProfileId,
    voiceProfileResolution: input.voiceProfileResolution ?? base?.voiceProfileResolution,
    inferenceMode: input.inferenceMode,
    inferenceModelId: input.inferenceMode ? (input.modelId ?? null) : base?.inferenceModelId,
    ...(input.growthKind ? { growthKind: input.growthKind } : {}),
  };
}

export function formatInferenceLabel(metadata?: {
  inferenceMode?: string;
  inferenceModelId?: string | null;
}): string | null {
  if (!metadata?.inferenceMode) return null;
  const mode = metadata.inferenceMode;
  const model = metadata.inferenceModelId;
  if (model && model !== 'voice-framework-template') {
    const short = model.includes('/') ? model.split('/').pop() : model;
    return `${mode} · ${short}`;
  }
  return mode === 'template' ? 'template' : mode;
}
