/**
 * NVIDIA NIM hosted API (Developer Program — prototyping / dev use).
 * OpenAI-compatible chat completions at integrate.api.nvidia.com.
 *
 * @see https://build.nvidia.com
 * @see docs/operations/INFERENCE_WORKERS_AI.md
 */

import { getRuntimeEnv } from '../../utils/runtime-env';

/** Fast default; override with NVIDIA_MODEL (e.g. qwen/qwen3.5-397b-a17b). */
export const NVIDIA_DEFAULT_MODEL = 'stepfun-ai/step-3.7-flash';

const NVIDIA_CHAT_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

export interface NvidiaCompleteParams {
  system: string;
  user: string;
  maxTokens?: number;
}

export interface NvidiaCompleteResult {
  text: string;
  modelId: string;
  provider: 'nvidia';
}

export function isNvidiaConfigured(): boolean {
  return Boolean(getRuntimeEnv('NVIDIA_API_KEY')?.trim());
}

export function getNvidiaModelId(): string {
  return getRuntimeEnv('NVIDIA_MODEL')?.trim() || NVIDIA_DEFAULT_MODEL;
}

export async function completeWithNvidia(
  params: NvidiaCompleteParams
): Promise<NvidiaCompleteResult> {
  const apiKey = getRuntimeEnv('NVIDIA_API_KEY')?.trim();
  if (!apiKey) {
    throw new Error('NVIDIA_API_KEY not set');
  }

  const model = getNvidiaModelId();
  const res = await fetch(NVIDIA_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: params.system },
        { role: 'user', content: params.user },
      ],
      max_tokens: params.maxTokens ?? 1800,
      temperature: 0.6,
      top_p: 0.95,
      stream: false,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string | null } }>;
  };

  if (!res.ok) {
    const errMsg =
      data.error?.message ||
      (typeof data === 'object' ? JSON.stringify(data) : res.statusText);
    throw new Error(`NVIDIA NIM error (${res.status}): ${errMsg}`);
  }

  const text = (data.choices?.[0]?.message?.content ?? '').trim();
  if (!text) {
    throw new Error('NVIDIA NIM returned empty response');
  }

  return { text, modelId: model, provider: 'nvidia' };
}
