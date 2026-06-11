/**
 * Cloudflare Workers AI — free tier (~10k neurons/day on Workers Free).
 * No Grok/xAI subscription required. Uses account API token from dashboard.
 *
 * @see https://developers.cloudflare.com/workers-ai/
 */

import { getRuntimeEnv } from '../../utils/runtime-env';

export const WORKERS_AI_MODEL = '@cf/meta/llama-3.1-8b-instruct';

export interface WorkersAICompleteParams {
  system: string;
  user: string;
  maxTokens?: number;
}

export interface WorkersAICompleteResult {
  text: string;
  modelId: string;
  provider: 'workers-ai';
}

interface EdgeWorkersAiBinding {
  run(model: string, input: Record<string, unknown>): Promise<{ response?: string }>;
}

function getEdgeAiBinding(): EdgeWorkersAiBinding | undefined {
  return (globalThis as typeof globalThis & { __WORKERS_AI_BINDING__?: EdgeWorkersAiBinding })
    .__WORKERS_AI_BINDING__;
}

export function isWorkersAIConfigured(): boolean {
  if (getEdgeAiBinding()) return true;
  return Boolean(
    getRuntimeEnv('CLOUDFLARE_ACCOUNT_ID')?.trim() && getRuntimeEnv('CLOUDFLARE_API_TOKEN')?.trim()
  );
}

export function getInferenceProvider(): 'workers-ai' | 'template' {
  const p = getRuntimeEnv('INFERENCE_PROVIDER')?.trim().toLowerCase();
  if (p === 'template' || p === 'off' || p === 'none') return 'template';
  if (p === 'workers-ai' && isWorkersAIConfigured()) return 'workers-ai';
  if (isWorkersAIConfigured()) return 'workers-ai';
  return 'template';
}

export async function completeWithWorkersAI(
  params: WorkersAICompleteParams
): Promise<WorkersAICompleteResult> {
  const model = getRuntimeEnv('WORKERS_AI_MODEL')?.trim() || WORKERS_AI_MODEL;
  const edgeAi = getEdgeAiBinding();

  if (edgeAi) {
    const result = (await edgeAi.run(model, {
      messages: [
        { role: 'system', content: params.system },
        { role: 'user', content: params.user },
      ],
      max_tokens: params.maxTokens ?? 1800,
    })) as { response?: string };

    const text = (result.response ?? '').trim();
    if (!text) {
      throw new Error('Workers AI returned empty response');
    }
    return { text, modelId: model, provider: 'workers-ai' };
  }

  const accountId = getRuntimeEnv('CLOUDFLARE_ACCOUNT_ID')?.trim();
  const apiToken = getRuntimeEnv('CLOUDFLARE_API_TOKEN')?.trim();
  if (!accountId || !apiToken) {
    throw new Error('WORKERS_AI_NOT_CONFIGURED');
  }
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${encodeURIComponent(model)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: params.system },
        { role: 'user', content: params.user },
      ],
      max_tokens: params.maxTokens ?? 1800,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    errors?: Array<{ message?: string }>;
    result?: { response?: string };
  };

  if (!res.ok || data.success === false) {
    const errMsg =
      data.errors?.[0]?.message || (typeof data === 'object' ? JSON.stringify(data) : res.statusText);
    throw new Error(`Workers AI error (${res.status}): ${errMsg}`);
  }

  const text = (data.result?.response ?? '').trim();
  if (!text) {
    throw new Error('Workers AI returned empty response');
  }

  return { text, modelId: model, provider: 'workers-ai' };
}
