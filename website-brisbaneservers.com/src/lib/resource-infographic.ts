/**
 * Positioning-model SVG wirings for generated resources — same InfographicSpec
 * shape as topic-guide GuideInfographic diagrams.
 *
 * Server-only: AI + curated lookup. Browser-safe spec helpers live in
 * resource-infographic-spec.ts so workspace scripts do not bundle Node fs.
 */

import { getInfographicSpec } from '../data/topic-guides/infographics';
import type { InfographicSpec } from '../data/topic-guides/infographic-types';
import type { AuthRole } from '../utils/auth';
import { normalizeTopicSlug } from './resource-slug';
import {
  buildFallbackInfographic,
  normalizeInfographicSpec,
} from './resource-infographic-spec';

export { buildFallbackInfographic, normalizeInfographicSpec } from './resource-infographic-spec';

function extractJsonObject(text: string): unknown | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function generateInfographicViaAi(params: {
  industry: string;
  topic: string;
  title: string;
  contentExcerpt?: string;
  userId: string;
  userRole: AuthRole;
}): Promise<InfographicSpec | null> {
  const { completeInference, getInferenceProvider } = await import('./inference/inference-provider');
  const { checkUsageCap, recordUsage, unitsForGenerate } = await import('./inference/usage-ledger');

  const provider = getInferenceProvider();
  if (provider !== 'nvidia' && provider !== 'workers-ai') return null;

  const units = unitsForGenerate(800);
  const cap = await checkUsageCap(params.userId, params.userRole, units);
  if (!cap.ok) return null;

  const system = [
    'You design compact positioning-model diagrams for Brisbane Servers resource pages.',
    'Return JSON only matching InfographicSpec: id, viewBox "0 0 800 300", title, caption, description, nodes[], edges[], optional badges[].',
    'nodes: 5–7 items with id, x (60–740), y (40–260), label (short, use \\n for 2 lines), optional sublabel, kind one of hub|node|outcome|risk|phase.',
    'edges: 4–8 items with from, to, optional label, optional dashed true.',
    'One hub near centre. Include one outcome and optionally one risk. Australian business English. No markdown.',
  ].join(' ');

  const user = [
    `Industry: ${params.industry}`,
    `Topic: ${params.topic}`,
    `Title: ${params.title}`,
    params.contentExcerpt
      ? `Article excerpt (ground the diagram):\n${params.contentExcerpt.slice(0, 1200)}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const ai = await completeInference({ system, user, maxTokens: 900 });
    const parsed = extractJsonObject(ai.text);
    const normalized = normalizeInfographicSpec(parsed, `${params.industry}-${params.topic}`);
    if (!normalized) return null;
    await recordUsage({
      userId: params.userId,
      units,
      reason: 'inference_generate',
      modelId: ai.modelId,
    });
    return normalized;
  } catch {
    return null;
  }
}

/**
 * Prefer curated topic-guide wiring, else AI, else deterministic fallback.
 */
export async function resolveResourceInfographic(params: {
  industry: string;
  topic: string;
  title: string;
  contentExcerpt?: string;
  userId: string;
  userRole: AuthRole;
}): Promise<{ spec: InfographicSpec; source: 'curated' | 'ai' | 'fallback' }> {
  const topicSlug = normalizeTopicSlug(params.topic);
  const curated = getInfographicSpec(params.industry, topicSlug);
  if (curated) {
    const cloned = normalizeInfographicSpec(
      { ...curated, id: `${curated.id}-res` },
      curated.id
    );
    if (cloned) return { spec: cloned, source: 'curated' };
  }

  const ai = await generateInfographicViaAi(params);
  if (ai) return { spec: ai, source: 'ai' };

  return {
    spec: buildFallbackInfographic({
      industry: params.industry,
      topic: topicSlug,
      title: params.title,
    }),
    source: 'fallback',
  };
}
