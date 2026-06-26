/**
 * Enhance pasted or uploaded content via RAG + inference (same stack as Improve).
 */

import type { Extrapolator } from '@voice-framework/generators/extrapolator';
import type { VoiceMatcher } from '@voice-framework/generators/voice-matcher';
import type { AuthRole } from '../../utils/auth';
import type { Resource } from '../resource-types';
import type { ResolvedResourceVoiceProfile } from '../resource-voice-profile';
import { buildRagContext } from '../semantic/rag';
import { improveResourceBody, type ImproveBodyResult } from './resource-improve';

export async function enhanceIngestedContent(params: {
  content: string;
  title: string;
  industry: string;
  topic: string;
  userId: string;
  userRole: AuthRole;
  resolved: ResolvedResourceVoiceProfile;
  extrapolator: Extrapolator;
  voiceMatcher: VoiceMatcher;
}): Promise<ImproveBodyResult> {
  const rag = await buildRagContext(params.content.slice(0, 1500), {
    topK: 6,
  });

  const stub: Resource = {
    id: 'ingest-pending',
    industry: params.industry,
    topic: params.topic,
    title: params.title,
    description: '',
    content: params.content,
    generatedAt: new Date().toISOString(),
    version: 1,
    status: 'draft',
  };

  return improveResourceBody({
    resource: stub,
    ragContextText: rag.contextText,
    userId: params.userId,
    userRole: params.userRole,
    resolved: params.resolved,
    extrapolator: params.extrapolator,
    voiceMatcher: params.voiceMatcher,
    reason: 'inference_process',
  });
}
