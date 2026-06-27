/**
 * NVIDIA NIM multimodal chat (PDF/image OCR and document understanding).
 */
import { getRuntimeEnv } from '../../utils/runtime-env';
import { NVIDIA_DEFAULT_MODEL } from './nvidia-ai-client';

const NVIDIA_CHAT_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

export const NVIDIA_DEFAULT_VISION_MODEL = 'moonshotai/kimi-k2.6';

export type NvidiaContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export function getNvidiaVisionModelId(): string {
  return getRuntimeEnv('NVIDIA_VISION_MODEL')?.trim() || NVIDIA_DEFAULT_VISION_MODEL;
}

export async function completeWithNvidiaMultimodal(params: {
  system: string;
  userParts: NvidiaContentPart[];
  modelId?: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<{ text: string; modelId: string; provider: 'nvidia' }> {
  const apiKey = getRuntimeEnv('NVIDIA_API_KEY')?.trim();
  if (!apiKey) {
    throw new Error('NVIDIA_API_KEY not set');
  }

  const model = params.modelId?.trim() || getNvidiaVisionModelId();
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
        { role: 'user', content: params.userParts },
      ],
      max_tokens: params.maxTokens ?? 8192,
      temperature: params.temperature ?? 0.2,
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
    throw new Error(`NVIDIA vision error (${res.status}): ${errMsg}`);
  }

  const text = (data.choices?.[0]?.message?.content ?? '').trim();
  if (!text) {
    throw new Error('NVIDIA vision returned empty response');
  }

  return { text, modelId: model, provider: 'nvidia' };
}

export function bytesToDataUrl(bytes: Uint8Array, mimeType: string): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  const b64 = btoa(binary);
  return `data:${mimeType};base64,${b64}`;
}

/** Fallback chat model when vision model unavailable. */
export function getNvidiaTextModelId(): string {
  return getRuntimeEnv('NVIDIA_MODEL')?.trim() || NVIDIA_DEFAULT_MODEL;
}
