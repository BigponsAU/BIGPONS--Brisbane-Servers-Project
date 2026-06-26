/**
 * Inference provider selection: NVIDIA NIM (dev), Workers AI (edge free tier), or template fallback.
 */

import { getRuntimeEnv } from '../../utils/runtime-env';
import { completeWithNvidia, isNvidiaConfigured } from './nvidia-ai-client';
import {
  completeWithWorkersAI,
  isWorkersAIConfigured,
  type WorkersAICompleteParams,
  type WorkersAICompleteResult,
} from './workers-ai-client';

export type InferenceProviderId = 'nvidia' | 'workers-ai' | 'template';

export type InferenceCompleteResult = WorkersAICompleteResult | Awaited<ReturnType<typeof completeWithNvidia>>;

export function getInferenceProvider(): InferenceProviderId {
  const requested = getRuntimeEnv('INFERENCE_PROVIDER')?.trim().toLowerCase();

  if (requested === 'template' || requested === 'off' || requested === 'none') {
    return 'template';
  }

  const order: Array<'nvidia' | 'workers-ai'> =
    requested === 'nvidia'
      ? ['nvidia', 'workers-ai']
      : requested === 'workers-ai'
        ? ['workers-ai', 'nvidia']
        : ['workers-ai', 'nvidia'];

  for (const id of order) {
    if (id === 'nvidia' && isNvidiaConfigured()) return 'nvidia';
    if (id === 'workers-ai' && isWorkersAIConfigured()) return 'workers-ai';
  }

  return 'template';
}

export async function completeInference(
  params: WorkersAICompleteParams
): Promise<InferenceCompleteResult> {
  const provider = getInferenceProvider();
  if (provider === 'nvidia') return completeWithNvidia(params);
  if (provider === 'workers-ai') return completeWithWorkersAI(params);
  throw new Error('INFERENCE_NOT_CONFIGURED');
}
