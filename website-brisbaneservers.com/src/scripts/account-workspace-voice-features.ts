/**
 * Voice lab + voice map client handlers for /account panels.
 */
import { workspaceFetch } from '../lib/client-api';

type MapNode = {
  id: string;
  label?: string;
  x: number;
  y: number;
  kind?: string;
  industry?: string;
};
type MapEdge = { sourceId: string; targetId: string; strength?: number; kind?: string };

const INDUSTRY_COLORS: Record<string, string> = {
  profile: 'rgba(249, 115, 22, 0.95)',
  healthcare: 'rgba(34, 197, 94, 0.85)',
  hospitality: 'rgba(168, 85, 247, 0.85)',
  retail: 'rgba(59, 130, 246, 0.85)',
  'professional-services': 'rgba(14, 116, 218, 0.85)',
  manufacturing: 'rgba(100, 116, 139, 0.85)',
  finance: 'rgba(22, 163, 74, 0.85)',
  construction: 'rgba(234, 88, 12, 0.85)',
  general: 'rgba(148, 163, 184, 0.85)',
};

function getApiBase(): string {
  const bridge = (window as unknown as { __portalBridge?: { apiBaseUrl?: string } }).__portalBridge;
  return (bridge?.apiBaseUrl ?? '').replace(/\/+$/, '');
}

async function workspaceJsonFetch(path: string, init?: RequestInit): Promise<Response> {
  return workspaceFetch(`${getApiBase()}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
}

function nodeColor(node: MapNode): string {
  if (node.kind === 'profile') return INDUSTRY_COLORS.profile;
  const key = (node.industry ?? 'general').toLowerCase().replace(/\s+/g, '-');
  return INDUSTRY_COLORS[key] ?? INDUSTRY_COLORS.general;
}

function projectToSvg(nodes: MapNode[], width: number, height: number): Map<string, { cx: number; cy: number }> {
  if (nodes.length === 0) return new Map();
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const pad = 48;
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const positions = new Map<string, { cx: number; cy: number }>();
  for (const node of nodes) {
    const cx = pad + ((node.x - minX) / spanX) * (width - pad * 2);
    const cy = pad + ((node.y - minY) / spanY) * (height - pad * 2);
    positions.set(node.id, { cx, cy });
  }
  return positions;
}

function renderLegend(industries: string[]): void {
  const legend = document.getElementById('voice-map-legend');
  if (!legend) return;
  const items = ['profile:Brisbane hub', ...industries.map((i) => `${i}:${i}`)];
  legend.innerHTML = items
    .slice(0, 12)
    .map((item) => {
      const [key, label] = item.split(':');
      const color = INDUSTRY_COLORS[key] ?? INDUSTRY_COLORS.general;
      return `<span class="voice-map-legend-item"><span class="voice-map-legend-swatch" style="background:${color}"></span>${label || key}</span>`;
    })
    .join('');
}

function renderVoiceMapSvg(svg: SVGSVGElement, nodes: MapNode[], edges: MapEdge[], meta: string): void {
  const width = 800;
  const height = 480;
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.innerHTML = '';

  if (nodes.length === 0) {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', String(width / 2));
    text.setAttribute('y', String(height / 2));
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('class', 'voice-map-placeholder');
    text.textContent = 'No map data — run Reindex corpus (admin) or publish resources.';
    svg.appendChild(text);
    const metaEl = document.getElementById('voice-map-meta');
    if (metaEl) metaEl.textContent = meta;
    return;
  }

  const positions = projectToSvg(nodes, width, height);

  for (const edge of edges) {
    const a = positions.get(edge.sourceId);
    const b = positions.get(edge.targetId);
    if (!a || !b) continue;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(a.cx));
    line.setAttribute('y1', String(a.cy));
    line.setAttribute('x2', String(b.cx));
    line.setAttribute('y2', String(b.cy));
    line.setAttribute('class', 'voice-map-edge');
    line.setAttribute('stroke-opacity', String(Math.min(0.6, edge.strength ?? 0.35)));
    svg.appendChild(line);
  }

  for (const node of nodes) {
    const pos = positions.get(node.id);
    if (!pos) continue;
    const isProfile = node.kind === 'profile';
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', String(pos.cx));
    circle.setAttribute('cy', String(pos.cy));
    circle.setAttribute('r', isProfile ? '12' : node.kind === 'resource' ? '7' : '4');
    circle.setAttribute('fill', nodeColor(node));
    circle.setAttribute('class', isProfile ? 'voice-map-node voice-map-node--profile' : 'voice-map-node');
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = node.label || node.id;
    circle.appendChild(title);
    svg.appendChild(circle);
  }

  const metaEl = document.getElementById('voice-map-meta');
  if (metaEl) metaEl.textContent = meta;
}

function mapApiPath(view: string): string {
  if (view === 'principles') return '/voice-map/principles';
  if (view === 'corpus-chunks') return '/voice-map/corpus?layer=chunks';
  return '/voice-map/corpus?layer=resources';
}

export async function loadVoiceMap(): Promise<void> {
  const svg = document.getElementById('voice-map-svg') as SVGSVGElement | null;
  const viewSelect = document.getElementById('voice-map-view') as HTMLSelectElement | null;
  if (!svg || !viewSelect) return;

  const view = viewSelect.value;
  const path = mapApiPath(view);

  try {
    const res = await workspaceJsonFetch(path);
    const data = await res.json();
    if (!res.ok || !data.success) {
      renderVoiceMapSvg(svg, [], [], data.error || 'Could not load voice map.');
      return;
    }
    const nodes: MapNode[] = (data.nodes ?? []).map(
      (n: {
        id: string;
        label?: string;
        principle?: string;
        x: number;
        y: number;
        kind?: string;
        industry?: string;
      }) => ({
        id: n.id,
        label: n.label ?? n.principle,
        x: n.x,
        y: n.y,
        kind: n.kind,
        industry: n.industry,
      })
    );
    const edges: MapEdge[] = data.edges ?? [];
    const stats = data.stats;
    const brisbane = data.brisbaneProfile?.name ?? 'Brisbane';
    const metaParts = [
      `${view.includes('chunk') ? 'Chunks' : 'Corpus'} — ${nodes.length} nodes`,
      stats?.indexedResources != null ? `${stats.indexedResources} indexed resources` : '',
      stats?.chunksInIndex != null ? `${stats.chunksInIndex} chunks` : '',
      data.brisbaneProfile ? `Hub: ${brisbane}` : '',
    ].filter(Boolean);
    if (stats?.industries) renderLegend(stats.industries as string[]);
    renderVoiceMapSvg(svg, nodes, edges, metaParts.join(' · '));
  } catch {
    renderVoiceMapSvg(svg, [], [], 'Network error loading voice map.');
  }
}

async function bootstrapVoiceCorpus(): Promise<void> {
  const btn = document.getElementById('voice-map-bootstrap-btn') as HTMLButtonElement | null;
  const meta = document.getElementById('voice-map-meta');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Indexing…';
  }
  if (meta) meta.textContent = 'Reindexing corpus and rebuilding Brisbane profile…';
  try {
    const res = await workspaceJsonFetch('/admin/bootstrap-voice-corpus', { method: 'POST' });
    const data = await res.json();
    if (!res.ok || !data.success) {
      if (meta) meta.textContent = data.error || 'Bootstrap failed.';
      return;
    }
    if (meta) {
      meta.textContent = data.message || 'Corpus indexed.';
    }
    await loadVoiceMap();
  } catch {
    if (meta) meta.textContent = 'Network error during bootstrap.';
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Reindex corpus';
    }
  }
}

async function runVoiceLab(mode: 'tone' | 'patterns'): Promise<void> {
  const textarea = document.getElementById('voice-lab-text') as HTMLTextAreaElement | null;
  const output = document.getElementById('voice-lab-output');
  if (!textarea || !output) return;

  const text = textarea.value.trim();
  if (text.length < 10) {
    output.textContent = 'Enter at least 10 characters to analyze.';
    return;
  }

  output.textContent = 'Analyzing…';
  try {
    const res = await workspaceJsonFetch('/voice/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, mode: mode === 'patterns' ? 'patterns' : 'tone' }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      output.textContent = data.error || 'Analysis failed.';
      return;
    }
    output.textContent = JSON.stringify(data, null, 2);
  } catch {
    output.textContent = 'Network error during analysis.';
  }
}

export function bindVoiceFeaturePanels(): void {
  document.getElementById('voice-map-refresh-btn')?.addEventListener('click', () => void loadVoiceMap());
  document.getElementById('voice-map-view')?.addEventListener('change', () => void loadVoiceMap());
  document.getElementById('voice-map-bootstrap-btn')?.addEventListener('click', () => void bootstrapVoiceCorpus());
  document.getElementById('voice-lab-analyze-btn')?.addEventListener('click', () => void runVoiceLab('tone'));
  document.getElementById('voice-lab-patterns-btn')?.addEventListener('click', () => void runVoiceLab('patterns'));
}

export function onVoicePanelShown(panelName: string): void {
  if (panelName === 'voice-map') void loadVoiceMap();
  if (panelName === 'voice-lab') {
    void import('./portal-markov-tracker').then((m) => m.renderPortalMarkovIntoVoiceLab());
  }
}
