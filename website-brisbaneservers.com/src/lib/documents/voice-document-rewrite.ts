/**
 * Voice-profile document rewrite — preserve structure, rewrite prose only.
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
}> {
  const system = buildDocumentRewriteSystemPrompt(params.profile);
  const user = buildDocumentRewriteUserPrompt({
    originalContent: params.content,
    title: params.title,
  });

  const result = await completeInference({ system, user, maxTokens: 6000 });
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
  };
}
