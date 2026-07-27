/**
 * Voice-profile document rewrite — preserve structure, rewrite prose only.
 * Fail closed: keep original when AI drifts (jargon, lost headings, low fidelity).
 */
import type { VoiceProfile } from '@voice-framework/models/voice-profile';
import type { VoiceMatcher } from '@voice-framework/generators/voice-matcher';
import type { AuthRole } from '../../utils/auth';
import { completeInference } from '../inference/inference-provider';
import { checkUsageCap, recordUsage, unitsForGenerate } from '../inference/usage-ledger';
import {
  buildDocumentRewriteSystemPrompt,
  buildDocumentRewriteUserPrompt,
} from '../inference/prompt-builder';
import {
  containsDesignSystemJargon,
  isDesignSystemVoiceProfile,
  isStructurePreserved,
  isTopicFaithful,
  scoreTopicFidelity,
  TOPIC_FIDELITY_MIN,
} from '../inference/topic-fidelity';

export async function rewriteDocumentPreservingStructure(params: {
  content: string;
  title?: string;
  profile: VoiceProfile;
  voiceMatcher: VoiceMatcher;
  userId: string;
  userRole: AuthRole;
}): Promise<{
  content: string;
  inferenceMode: string;
  modelId: string | null;
  voiceScore: number;
  voiceValid: boolean;
  topicFidelity: number;
  keptOriginal: boolean;
}> {
  const allowDesign = isDesignSystemVoiceProfile(params.profile);
  const system = buildDocumentRewriteSystemPrompt(params.profile);
  const user = buildDocumentRewriteUserPrompt({
    originalContent: params.content,
    title: params.title,
    allowDesignSystemJargon: allowDesign,
  });

  const keepOriginal = (reason: string) => {
    const validation = params.voiceMatcher.validateVoice(params.content);
    console.warn(`[documents/rewrite] keeping original: ${reason}`);
    return {
      content: params.content,
      inferenceMode: 'original',
      modelId: 'structure-fidelity-guard',
      voiceScore: validation.score ?? 0,
      voiceValid: validation.isValid ?? false,
      topicFidelity: 1,
      keptOriginal: true,
    };
  };

  let result;
  try {
    result = await completeInference({ system, user, maxTokens: 6000 });
  } catch (err) {
    console.warn('[documents/rewrite] inference failed', err);
    return keepOriginal('inference-error');
  }

  if (
    !isTopicFaithful(params.content, result.text, TOPIC_FIDELITY_MIN, {
      allowDesignSystemJargon: allowDesign,
    })
  ) {
    return keepOriginal('topic-fidelity');
  }
  if (!allowDesign && containsDesignSystemJargon(result.text)) {
    return keepOriginal('design-jargon');
  }
  if (!isStructurePreserved(params.content, result.text)) {
    return keepOriginal('structure-drift');
  }

  const validation = params.voiceMatcher.validateVoice(result.text);
  const units = unitsForGenerate(params.content.length + result.text.length);
  const cap = await checkUsageCap(params.userId, params.userRole, units);
  if (cap.ok) {
    await recordUsage({
      userId: params.userId,
      units,
      reason: 'inference_document_rewrite',
      modelId: result.modelId ?? undefined,
    });
  }

  return {
    content: result.text,
    inferenceMode: result.provider,
    modelId: result.modelId,
    voiceScore: validation.score ?? 0,
    voiceValid: validation.isValid ?? false,
    topicFidelity: scoreTopicFidelity(params.content, result.text),
    keptOriginal: false,
  };
}
