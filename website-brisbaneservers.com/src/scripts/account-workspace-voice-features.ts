/**
 * Voice lab + voice map client handlers for /account panels.
 */
import { workspaceFetch } from '../lib/client-api';
import { showConfirmDialog } from './portal-confirm-dialog';
import { trackPortalAction, trackPortalError } from './portal-markov-tracker';

type MapNode = {
  id: string;
  label?: string;
  x: number;
  y: number;
  z?: number;
  kind?: string;
  industry?: string;
};
type MapEdge = { sourceId: string; targetId: string; strength?: number; kind?: string };

let voiceMapDepthMode = false;
let voiceMap3dMode = false;
let voiceMapCache: {
  nodes: MapNode[];
  edges: MapEdge[];
  meta: string;
  routeNodeIds?: Set<string>;
} | null = null;
let voiceMapWebGl: { render: () => void; destroy: () => void } | null = null;

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

function nodeDepthZ(node: MapNode): number {
  if (typeof node.z === 'number') return node.z;
  if (node.kind === 'profile') return 24;
  if (node.kind === 'resource') return 12;
  if (node.kind === 'principle') return 18;
  return 6;
}

function projectToSvg(
  nodes: MapNode[],
  width: number,
  height: number,
  depthMode: boolean
): Map<string, { cx: number; cy: number; z: number; scale: number }> {
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
  const positions = new Map<string, { cx: number; cy: number; z: number; scale: number }>();

  for (const node of nodes) {
    const nx = (node.x - minX) / spanX;
    const ny = (node.y - minY) / spanY;
    const z = nodeDepthZ(node);

    if (!depthMode) {
      const cx = pad + nx * (width - pad * 2);
      const cy = pad + ny * (height - pad * 2);
      positions.set(node.id, { cx, cy, z, scale: 1 });
      continue;
    }

    // Isometric depth: same layout math as 2D, lifted on Y by z (no WebGL — stays fast).
    const cx = pad + nx * (width - pad * 2);
    const cy = pad + ny * (height - pad * 2) - z * 1.4;
    const scale = 0.75 + (z / 40) * 0.45;
    positions.set(node.id, { cx, cy, z, scale });
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

function applyVoiceMapViewMode(): void {
  const svg = document.getElementById('voice-map-svg') as SVGSVGElement | null;
  const canvas = document.getElementById('voice-map-canvas') as HTMLCanvasElement | null;
  const stage = svg?.closest('.voice-map-stage');
  stage?.classList.toggle('voice-map-stage--depth', voiceMapDepthMode && !voiceMap3dMode);
  if (svg) {
    if (voiceMap3dMode) svg.setAttribute('hidden', '');
    else svg.removeAttribute('hidden');
  }
  if (canvas) {
    if (voiceMap3dMode) canvas.removeAttribute('hidden');
    else canvas.setAttribute('hidden', '');
  }
}

function destroyVoiceMapWebGl(): void {
  if (voiceMapWebGl) {
    voiceMapWebGl.destroy();
    voiceMapWebGl = null;
  }
}

async function renderVoiceMap3d(nodes: MapNode[], edges: MapEdge[]): Promise<void> {
  const canvas = document.getElementById('voice-map-canvas') as HTMLCanvasElement | null;
  if (!canvas) return;
  destroyVoiceMapWebGl();
  try {
    const { mountVoiceMapWebGl } = await import('./voice-map-webgl');
    voiceMapWebGl = mountVoiceMapWebGl(canvas, nodes, edges);
  } catch (err) {
    const metaEl = document.getElementById('voice-map-meta');
    if (metaEl) {
      metaEl.textContent = `3D view unavailable: ${err instanceof Error ? err.message : 'WebGL error'}`;
    }
    voiceMap3dMode = false;
    applyVoiceMapViewMode();
  }
}

function renderVoiceMapSvg(
  svg: SVGSVGElement,
  nodes: MapNode[],
  edges: MapEdge[],
  meta: string,
  routeNodeIds?: Set<string>
): void {
  const width = 800;
  const height = 480;
  applyVoiceMapViewMode();

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

  const positions = projectToSvg(nodes, width, height, voiceMapDepthMode);

  const sortedEdges = [...edges].sort((a, b) => {
    const za = positions.get(a.sourceId)?.z ?? 0;
    const zb = positions.get(b.sourceId)?.z ?? 0;
    return za - zb;
  });

  for (const edge of sortedEdges) {
    const a = positions.get(edge.sourceId);
    const b = positions.get(edge.targetId);
    if (!a || !b) continue;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(a.cx));
    line.setAttribute('y1', String(a.cy));
    line.setAttribute('x2', String(b.cx));
    line.setAttribute('y2', String(b.cy));
    line.setAttribute('class', edge.kind === 'route' ? 'voice-map-edge voice-map-edge--route' : 'voice-map-edge');
    line.setAttribute('stroke-opacity', String(Math.min(0.6, edge.strength ?? 0.35)));
    svg.appendChild(line);
  }

  const sortedNodes = [...nodes].sort(
    (a, b) => (positions.get(a.id)?.z ?? 0) - (positions.get(b.id)?.z ?? 0)
  );

  for (const node of sortedNodes) {
    const pos = positions.get(node.id);
    if (!pos) continue;
    const isProfile = node.kind === 'profile';
    const baseR = isProfile ? 12 : node.kind === 'resource' ? 7 : 4;
    const r = baseR * pos.scale;
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', String(pos.cx));
    circle.setAttribute('cy', String(pos.cy));
    circle.setAttribute('r', String(r));
    circle.setAttribute('fill', nodeColor(node));
    if (voiceMapDepthMode) {
      circle.setAttribute('opacity', String(0.65 + Math.min(0.35, pos.z / 40)));
    }
    const isRoute = routeNodeIds?.has(node.id);
    circle.setAttribute(
      'class',
      isRoute
        ? 'voice-map-node voice-map-node--route'
        : isProfile
          ? 'voice-map-node voice-map-node--profile'
          : 'voice-map-node'
    );
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = node.label || node.id;
    circle.appendChild(title);
    svg.appendChild(circle);
  }

  const metaEl = document.getElementById('voice-map-meta');
  if (metaEl) metaEl.textContent = meta;
}

function mapApiPath(view: string, semanticQuery?: string): string {
  if (view === 'principles') return '/voice-map/principles';
  if (view === 'corpus-chunks') return '/voice-map/corpus?layer=chunks';
  if (view === 'semantic') {
    const q = semanticQuery?.trim();
    return q && q.length >= 3
      ? `/voice-map/semantic?limit=120&query=${encodeURIComponent(q)}`
      : '/voice-map/semantic?limit=120';
  }
  return '/voice-map/corpus?layer=resources';
}

function toggleSemanticQueryUi(view: string): void {
  const wrap = document.getElementById('voice-map-semantic-query-wrap');
  if (!wrap) return;
  wrap.classList.toggle('hidden', view !== 'semantic');
}

export async function loadVoiceMap(): Promise<void> {
  const svg = document.getElementById('voice-map-svg') as SVGSVGElement | null;
  const viewSelect = document.getElementById('voice-map-view') as HTMLSelectElement | null;
  if (!svg || !viewSelect) return;

  const view = viewSelect.value;
  toggleSemanticQueryUi(view);
  const semanticQuery =
    view === 'semantic'
      ? (document.getElementById('voice-map-semantic-query') as HTMLInputElement | null)?.value
      : undefined;
  const path = mapApiPath(view, semanticQuery);

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
    const edges: MapEdge[] = (data.edges ?? []).map(
      (e: { sourceId: string; targetId: string; strength?: number; kind?: string }) => ({
        sourceId: e.sourceId,
        targetId: e.targetId,
        strength: e.strength,
        kind: e.kind,
      })
    );
    const routeIds = Array.isArray(data.routeNodeIds) ? (data.routeNodeIds as string[]) : [];
    const routeNodeIds = routeIds.length > 0 ? new Set(routeIds) : undefined;
    const stats = data.stats;
    const brisbane = data.brisbaneProfile?.name ?? 'Brisbane';
    const viewLabel =
      view === 'semantic'
        ? 'Semantic route'
        : view.includes('chunk')
          ? 'Chunks'
          : view === 'principles'
            ? 'Principles'
            : 'Corpus';
    const metaParts = [
      `${viewLabel} — ${nodes.length} nodes`,
      view === 'semantic' && data.total != null ? `${data.total} indexed chunks` : '',
      routeIds.length > 0 ? `Route: ${routeIds.length} hops` : '',
      stats?.indexedResources != null ? `${stats.indexedResources} indexed resources` : '',
      stats?.chunksInIndex != null ? `${stats.chunksInIndex} chunks` : '',
      data.brisbaneProfile ? `Hub: ${brisbane}` : '',
    ].filter(Boolean);
    if (stats?.industries) renderLegend(stats.industries as string[]);
    else if (view === 'semantic') {
      const industries = [...new Set(nodes.map((n) => n.industry).filter(Boolean))] as string[];
      if (industries.length) renderLegend(industries);
    }
    voiceMapCache = { nodes, edges, meta: metaParts.join(' · '), routeNodeIds };
    if (voiceMap3dMode) {
      await renderVoiceMap3d(nodes, edges);
    } else {
      destroyVoiceMapWebGl();
      renderVoiceMapSvg(svg, nodes, edges, voiceMapCache.meta, routeNodeIds);
    }
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
  document.getElementById('voice-map-semantic-route-btn')?.addEventListener('click', () => void loadVoiceMap());
  document.getElementById('voice-map-semantic-query')?.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter') void loadVoiceMap();
  });
  document.getElementById('voice-map-view-mode')?.addEventListener('click', () => {
    if (voiceMap3dMode) return;
    voiceMapDepthMode = !voiceMapDepthMode;
    const btn = document.getElementById('voice-map-view-mode');
    if (btn) {
      btn.setAttribute('aria-pressed', voiceMapDepthMode ? 'true' : 'false');
      btn.textContent = voiceMapDepthMode ? 'Flat view' : 'Depth view';
    }
    const svg = document.getElementById('voice-map-svg') as SVGSVGElement | null;
    if (svg && voiceMapCache) {
      renderVoiceMapSvg(svg, voiceMapCache.nodes, voiceMapCache.edges, voiceMapCache.meta, voiceMapCache.routeNodeIds);
    }
  });
  document.getElementById('voice-map-3d-btn')?.addEventListener('click', () => {
    voiceMap3dMode = !voiceMap3dMode;
    if (voiceMap3dMode) voiceMapDepthMode = false;
    const btn3d = document.getElementById('voice-map-3d-btn');
    if (btn3d) {
      btn3d.setAttribute('aria-pressed', voiceMap3dMode ? 'true' : 'false');
      btn3d.textContent = voiceMap3dMode ? '2D view' : '3D view';
    }
    const depthBtn = document.getElementById('voice-map-view-mode');
    if (depthBtn && voiceMap3dMode) {
      depthBtn.setAttribute('aria-pressed', 'false');
      depthBtn.textContent = 'Depth view';
    }
    applyVoiceMapViewMode();
    if (voiceMapCache) {
      if (voiceMap3dMode) {
        void renderVoiceMap3d(voiceMapCache.nodes, voiceMapCache.edges);
      } else {
        destroyVoiceMapWebGl();
        const svg = document.getElementById('voice-map-svg') as SVGSVGElement | null;
        if (svg) renderVoiceMapSvg(svg, voiceMapCache.nodes, voiceMapCache.edges, voiceMapCache.meta, voiceMapCache.routeNodeIds);
      }
    }
  });
  document.getElementById('voice-map-bootstrap-btn')?.addEventListener('click', () => {
    void (async () => {
      const ok = await showConfirmDialog({
        title: 'Reindex voice corpus',
        message: 'Rebuild semantic chunks and the Brisbane site voice profile from published resources?',
        details: 'This may take a minute on large libraries. Voice map layers refresh when complete.',
        confirmLabel: 'Reindex',
        variant: 'primary',
      });
      if (!ok) return;
      trackPortalAction('bootstrapVoiceCorpus');
      void bootstrapVoiceCorpus();
    })();
  });
  document.getElementById('voice-lab-analyze-btn')?.addEventListener('click', () => void runVoiceLab('tone'));
  document.getElementById('voice-lab-patterns-btn')?.addEventListener('click', () => void runVoiceLab('patterns'));
  document.getElementById('voice-lab-markov-refresh')?.addEventListener('click', () => {
    void import('./portal-markov-tracker').then((m) => m.renderPortalMarkovIntoVoiceLab());
  });
  document.getElementById('voice-lab-markov-debug')?.addEventListener('click', () => {
    void import('./portal-markov-tracker').then((m) => m.renderPortalMarkovDebug());
  });
  document.getElementById('voice-lab-markov-extrapolate')?.addEventListener('click', () => {
    const debugEl = document.getElementById('voice-lab-markov-debug');
    if (debugEl) {
      debugEl.dataset.userTriggered = 'true';
      debugEl.textContent = 'Extrapolating issues from Markov chain…';
    }
    trackPortalAction('extrapolateMarkovIssues');
    void import('./portal-markov-tracker').then((m) =>
      m
        .extrapolatePortalMarkovIssues(async (path, body) => {
          const res = await workspaceJsonFetch(path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            return { ok: false, error: data.error || 'Extrapolation failed' };
          }
          return { ok: true, text: data.text as string };
        })
        .then((text) => {
          if (debugEl) debugEl.textContent = text;
        })
        .catch((err) => {
          trackPortalError('extrapolateMarkovIssues', err);
          if (debugEl) debugEl.textContent = 'Network error during extrapolation.';
        })
    );
  });
  document.getElementById('voice-lab-markov-export')?.addEventListener('click', () => {
    void import('./portal-markov-tracker').then((m) => m.exportPortalMarkovData());
  });
  document.getElementById('voice-lab-markov-reset')?.addEventListener('click', () => {
    void (async () => {
      const ok = await showConfirmDialog({
        title: 'Reset flow tracking',
        message: 'Reset all portal flow tracking data for this browser?',
        details: 'Markov navigation stats will be cleared locally. This cannot be undone.',
        confirmLabel: 'Reset',
        variant: 'danger',
      });
      if (!ok) return;
      void import('./portal-markov-tracker').then((m) => m.resetPortalMarkovTracker());
    })();
  });
}

export function onVoicePanelShown(panelName: string): void {
  if (panelName === 'voice-map') void loadVoiceMap();
  if (panelName === 'voice-lab') {
    void import('./portal-markov-tracker').then((m) => m.renderPortalMarkovIntoVoiceLab());
  }
}
