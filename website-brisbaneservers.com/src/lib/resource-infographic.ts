/**
 * Positioning-model SVG wirings for generated resources — same InfographicSpec
 * shape as topic-guide GuideInfographic diagrams.
 */

import type {
  InfographicEdge,
  InfographicNode,
  InfographicNodeKind,
  InfographicSpec,
} from '../data/topic-guides/infographic-types';
import { getInfographicSpec } from '../data/topic-guides/infographics';
import { normalizeTopicSlug } from './resource-slug';
import type { AuthRole } from '../utils/auth';

const VIEW_BOX = '0 0 800 300';
const NODE_KINDS = new Set<InfographicNodeKind>(['hub', 'node', 'outcome', 'risk', 'phase']);

function slugId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'wiring';
}

function humanizeTopic(topic: string): string {
  return topic.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function cleanLabel(raw: unknown, fallback: string): string {
  const text = String(raw ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 42);
  return text || fallback;
}

/** Normalize / validate model or curated JSON into a renderable spec. */
export function normalizeInfographicSpec(
  raw: unknown,
  fallbackId: string
): InfographicSpec | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const nodesRaw = Array.isArray(obj.nodes) ? obj.nodes : [];
  const edgesRaw = Array.isArray(obj.edges) ? obj.edges : [];
  if (nodesRaw.length < 3) return null;

  const nodes: InfographicNode[] = [];
  const seen = new Set<string>();
  for (const item of nodesRaw.slice(0, 8)) {
    if (!item || typeof item !== 'object') continue;
    const n = item as Record<string, unknown>;
    let id = String(n.id ?? '').trim().slice(0, 24);
    if (!id || seen.has(id)) id = `n${nodes.length + 1}`;
    seen.add(id);
    const kindRaw = String(n.kind ?? 'node') as InfographicNodeKind;
    const kind = NODE_KINDS.has(kindRaw) ? kindRaw : 'node';
    nodes.push({
      id,
      x: clamp(Number(n.x) || 400, 60, 740),
      y: clamp(Number(n.y) || 150, 40, 260),
      label: cleanLabel(n.label, id).replace(/\\n/g, '\n').replace(/ \/ /g, '\n'),
      ...(n.sublabel ? { sublabel: cleanLabel(n.sublabel, '').slice(0, 28) || undefined } : {}),
      kind,
    });
  }
  if (nodes.length < 3) return null;

  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges: InfographicEdge[] = [];
  for (const item of edgesRaw.slice(0, 12)) {
    if (!item || typeof item !== 'object') continue;
    const e = item as Record<string, unknown>;
    const from = String(e.from ?? '');
    const to = String(e.to ?? '');
    if (!nodeIds.has(from) || !nodeIds.has(to) || from === to) continue;
    edges.push({
      from,
      to,
      ...(e.label ? { label: cleanLabel(e.label, '').slice(0, 24) || undefined } : {}),
      ...(e.dashed ? { dashed: true } : {}),
    });
  }
  if (edges.length < 2) return null;

  const title = cleanLabel(obj.title, 'Positioning model').slice(0, 72);
  const caption = cleanLabel(obj.caption, 'How the pieces connect for this topic.').slice(0, 220);
  const description = cleanLabel(
    obj.description,
    `Diagram explaining ${title}: ${nodes.map((n) => n.label.replace(/\n/g, ' ')).join(', ')}.`
  ).slice(0, 320);

  return {
    id: slugId(String(obj.id ?? fallbackId)),
    viewBox: typeof obj.viewBox === 'string' && obj.viewBox.trim() ? obj.viewBox : VIEW_BOX,
    title,
    caption,
    description,
    nodes,
    edges,
    badges: Array.isArray(obj.badges)
      ? obj.badges.slice(0, 3).map((b, i) => {
          const badge = (b && typeof b === 'object' ? b : {}) as Record<string, unknown>;
          return {
            x: clamp(Number(badge.x) || 400, 80, 720),
            y: clamp(Number(badge.y) || 268, 240, 290),
            text: cleanLabel(badge.text, `Note ${i + 1}`).slice(0, 40),
          };
        })
      : undefined,
  };
}

/** Deterministic hub-and-spoke wiring when AI/curated specs are unavailable. */
export function buildFallbackInfographic(params: {
  industry: string;
  topic: string;
  title: string;
}): InfographicSpec {
  const topicLabel = humanizeTopic(params.topic);
  const id = slugId(`${params.industry}-${params.topic}-wiring`);
  return {
    id,
    viewBox: VIEW_BOX,
    title: `${topicLabel} spine`,
    caption: `How ${params.title} hangs together for ${humanizeTopic(params.industry)} teams — one hub, connected workstreams, a clear outcome.`,
    description: `Positioning diagram for ${params.title}: a central hub linked to supporting workstreams and a business outcome.`,
    badges: [{ x: 400, y: 268, text: 'Single operating picture' }],
    nodes: [
      { id: 'hub', x: 400, y: 150, label: topicLabel.slice(0, 28), sublabel: 'hub', kind: 'hub' },
      { id: 'a', x: 150, y: 80, label: 'Capture', kind: 'node' },
      { id: 'b', x: 650, y: 80, label: 'Process', kind: 'node' },
      { id: 'c', x: 150, y: 220, label: 'Govern', kind: 'node' },
      { id: 'd', x: 650, y: 220, label: 'Deliver', kind: 'phase' },
      { id: 'out', x: 400, y: 48, label: 'Outcome', kind: 'outcome' },
      { id: 'risk', x: 400, y: 248, label: 'Fragmentation', kind: 'risk' },
    ],
    edges: [
      { from: 'hub', to: 'a' },
      { from: 'hub', to: 'b' },
      { from: 'hub', to: 'c' },
      { from: 'hub', to: 'd' },
      { from: 'a', to: 'out' },
      { from: 'b', to: 'out' },
      { from: 'd', to: 'out' },
      { from: 'hub', to: 'risk', dashed: true },
    ],
  };
}

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
