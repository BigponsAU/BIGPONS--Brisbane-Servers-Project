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
  resourceId?: string;
  profileId?: string;
};

type MapEdge = { sourceId: string; targetId: string; strength?: number; kind?: string };

type IndustryCoverageItem = {
  id: string;
  name: string;
  indexedCount: number;
  status: 'gap' | 'sparse' | 'covered';
};

let voiceMapDepthMode = false;
let voiceMap3dMode = false;
let voiceMapSelectedId: string | null = null;
let voiceMapCoverage: IndustryCoverageItem[] = [];
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

const LAYER_HINTS: Record<string, string> = {
  'corpus-resources':
    'Published guides clustered by industry around the Brisbane voice hub. Click a dot to inspect.',
  'corpus-chunks':
    'Finer text passages from those guides — click a passage to open its parent guide.',
  semantic: 'Type a topic to highlight a path through related content, then click a step to open it.',
  principles: 'Legacy writing-principles topology — useful for model inspection, not coverage gaps.',
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

function resolveResourceId(node: MapNode): string | null {
  if (node.resourceId) return node.resourceId;
  if (node.id.startsWith('resource:')) return node.id.slice('resource:'.length);
  return null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

    const cx = pad + nx * (width - pad * 2);
    const cy = pad + ny * (height - pad * 2) - z * 1.4;
    const scale = 0.75 + (z / 40) * 0.45;
    positions.set(node.id, { cx, cy, z, scale });
  }
  return positions;
}

function renderLegend(industryKeys: string[]): void {
  const legend = document.getElementById('voice-map-legend');
  if (!legend) return;
  const items = ['profile:Brisbane voice', ...industryKeys.map((i) => `${i}:${i}`)];
  legend.innerHTML = items
    .slice(0, 12)
    .map((item) => {
      const [key, label] = item.split(':');
      const color = INDUSTRY_COLORS[key] ?? INDUSTRY_COLORS.general;
      return `<span class="voice-map-legend-item"><span class="voice-map-legend-swatch" style="background:${color}"></span>${escapeHtml(label || key)}</span>`;
    })
    .join('');
}

function updateLayerHint(view: string): void {
  const hint = document.getElementById('voice-map-layer-hint');
  if (hint) hint.textContent = LAYER_HINTS[view] ?? LAYER_HINTS['corpus-resources'];
}

function openResourceInCreate(resourceId: string): void {
  trackPortalAction('voiceMapOpenResource');
  const navigate = (window as Window & { navigateToPanel?: (p: string) => void }).navigateToPanel;
  const select = (window as Window & { selectResource?: (id: string) => void }).selectResource;
  navigate?.('resources');
  window.setTimeout(() => select?.(resourceId), 120);
}

function openCreateForIndustry(industryId: string): void {
  trackPortalAction('voiceMapFillGap');
  const navigate = (window as Window & { navigateToPanel?: (p: string) => void }).navigateToPanel;
  const focusCreate = (
    window as Window & { focusResourceCreationSection?: (section: string) => void }
  ).focusResourceCreationSection;
  navigate?.('resources');
  window.setTimeout(() => {
    focusCreate?.('generate');
    const sel = document.getElementById('resource-industry') as HTMLSelectElement | null;
    if (sel) {
      const match = Array.from(sel.options).find(
        (o) => o.value === industryId || o.value.toLowerCase() === industryId
      );
      if (match) sel.value = match.value;
    }
  }, 250);
}

function renderCoverageGaps(coverage: IndustryCoverageItem[]): void {
  const wrap = document.getElementById('voice-map-gaps');
  const list = document.getElementById('voice-map-gaps-list');
  if (!wrap || !list) return;

  const gaps = coverage.filter((c) => c.status === 'gap' || c.status === 'sparse');
  if (gaps.length === 0) {
    wrap.hidden = true;
    list.innerHTML = '';
    return;
  }

  wrap.hidden = false;
  list.innerHTML = gaps
    .map((item) => {
      const tone = item.status === 'gap' ? 'gap' : 'sparse';
      const countLabel =
        item.status === 'gap' ? 'No guides' : `${item.indexedCount} guide${item.indexedCount === 1 ? '' : 's'}`;
      return `<button type="button" class="voice-map-gap-chip voice-map-gap-chip--${tone}" data-industry="${escapeHtml(item.id)}" title="Create content for ${escapeHtml(item.name)}">
        <span class="voice-map-gap-chip__name">${escapeHtml(item.name)}</span>
        <span class="voice-map-gap-chip__meta">${countLabel}</span>
      </button>`;
    })
    .join('');

  list.querySelectorAll<HTMLButtonElement>('[data-industry]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-industry');
      if (id) openCreateForIndustry(id);
    });
  });
}

function renderSelectionDetail(node: MapNode | null): void {
  const body = document.getElementById('voice-map-detail-body');
  if (!body) return;

  if (!node) {
    body.innerHTML = `<p class="voice-map-detail__empty">Click a guide on the map to inspect it here.</p>`;
    return;
  }

  const resourceId = resolveResourceId(node);
  const industry = node.industry
    ? `<p class="voice-map-detail__meta">Industry: <strong>${escapeHtml(node.industry)}</strong></p>`
    : '';
  const kindLabel =
    node.kind === 'profile'
      ? 'Site voice hub'
      : node.kind === 'chunk'
        ? 'Text passage'
        : node.kind === 'principle'
          ? 'Writing principle'
          : 'Published guide';

  let actions = '';
  if (resourceId) {
    actions = `<div class="voice-map-detail__actions">
      <button type="button" class="btn btn-primary btn-sm" id="voice-map-open-resource" data-resource-id="${escapeHtml(resourceId)}">Open in Create content</button>
    </div>`;
  } else if (node.kind === 'profile') {
    actions = `<div class="voice-map-detail__actions">
      <button type="button" class="btn btn-secondary btn-sm" onclick="navigateToPanel('profiles')">Open Voice profiles</button>
    </div>`;
  }

  body.innerHTML = `
    <p class="voice-map-detail__kind">${escapeHtml(kindLabel)}</p>
    <h4 class="voice-map-detail__label">${escapeHtml(node.label || node.id)}</h4>
    ${industry}
    ${actions}
  `;

  body.querySelector('#voice-map-open-resource')?.addEventListener('click', (e) => {
    const id = (e.currentTarget as HTMLElement).getAttribute('data-resource-id');
    if (id) openResourceInCreate(id);
  });
}

function selectMapNode(nodeId: string | null): void {
  voiceMapSelectedId = nodeId;
  const node = nodeId ? (voiceMapCache?.nodes.find((n) => n.id === nodeId) ?? null) : null;
  renderSelectionDetail(node);

  const svg = document.getElementById('voice-map-svg') as SVGSVGElement | null;
  if (!svg || !voiceMapCache) return;
  svg.querySelectorAll('.voice-map-node').forEach((el) => {
    el.classList.toggle('voice-map-node--selected', el.getAttribute('data-node-id') === nodeId);
  });
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
    text.textContent = 'Nothing to map yet — publish guides, or ask an admin to Rebuild map.';
    svg.appendChild(text);
    const metaEl = document.getElementById('voice-map-meta');
    if (metaEl) metaEl.textContent = meta;
    renderSelectionDetail(null);
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
    circle.setAttribute('data-node-id', node.id);
    if (voiceMapDepthMode) {
      circle.setAttribute('opacity', String(0.65 + Math.min(0.35, pos.z / 40)));
    }
    const isRoute = routeNodeIds?.has(node.id);
    const isSelected = voiceMapSelectedId === node.id;
    const classes = ['voice-map-node'];
    if (isRoute) classes.push('voice-map-node--route');
    if (isProfile) classes.push('voice-map-node--profile');
    if (isSelected) classes.push('voice-map-node--selected');
    circle.setAttribute('class', classes.join(' '));

    const canOpen = Boolean(resolveResourceId(node) || node.kind === 'profile' || node.kind === 'principle');
    if (canOpen) {
      circle.setAttribute('tabindex', '0');
      circle.setAttribute('role', 'button');
      circle.setAttribute('aria-label', node.label || node.id);
      circle.style.cursor = 'pointer';
      circle.addEventListener('click', (e) => {
        e.stopPropagation();
        selectMapNode(node.id);
      });
      circle.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        const resourceId = resolveResourceId(node);
        if (resourceId) openResourceInCreate(resourceId);
        else if (node.kind === 'profile') {
          (window as Window & { navigateToPanel?: (p: string) => void }).navigateToPanel?.('profiles');
        }
      });
      circle.addEventListener('keydown', (e) => {
        if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ') {
          e.preventDefault();
          selectMapNode(node.id);
        }
      });
    }

    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = node.label || node.id;
    circle.appendChild(title);
    svg.appendChild(circle);
  }

  const metaEl = document.getElementById('voice-map-meta');
  if (metaEl) {
    metaEl.textContent = voiceMap3dMode
      ? `${meta} · Click nodes in 2D to inspect (3D is orbit-only)`
      : `${meta} · Click to inspect · Double-click to open`;
  }

  if (voiceMapSelectedId && !nodes.some((n) => n.id === voiceMapSelectedId)) {
    selectMapNode(null);
  } else if (voiceMapSelectedId) {
    const selected = nodes.find((n) => n.id === voiceMapSelectedId) ?? null;
    renderSelectionDetail(selected);
  }
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
  updateLayerHint(view);
  const semanticQuery =
    view === 'semantic'
      ? (document.getElementById('voice-map-semantic-query') as HTMLInputElement | null)?.value
      : undefined;
  const path = mapApiPath(view, semanticQuery);

  try {
    const res = await workspaceJsonFetch(path);
    const data = await res.json();
    if (!res.ok || !data.success) {
      renderVoiceMapSvg(svg, [], [], data.error || 'Could not load the map.');
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
        resourceId?: string;
        profileId?: string;
      }) => ({
        id: n.id,
        label: n.label ?? n.principle,
        x: n.x,
        y: n.y,
        kind: n.kind,
        industry: n.industry,
        resourceId: n.resourceId,
        profileId: n.profileId,
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
        ? 'Related path'
        : view.includes('chunk')
          ? 'Text passages'
          : view === 'principles'
            ? 'Writing principles'
            : 'Content by industry';
    const metaParts = [
      `${viewLabel} — ${nodes.length} items`,
      view === 'semantic' && data.total != null ? `${data.total} passages indexed` : '',
      routeIds.length > 0 ? `Path: ${routeIds.length} steps` : '',
      stats?.indexedResources != null ? `${stats.indexedResources} guides indexed` : '',
      stats?.chunksInIndex != null ? `${stats.chunksInIndex} passages` : '',
      data.brisbaneProfile ? `Centre: ${brisbane} voice` : '',
    ].filter(Boolean);

    if (Array.isArray(stats?.industryCoverage)) {
      voiceMapCoverage = stats.industryCoverage as IndustryCoverageItem[];
      renderCoverageGaps(voiceMapCoverage);
    } else if (view === 'corpus-resources' || view === 'corpus-chunks') {
      renderCoverageGaps([]);
    } else if (voiceMapCoverage.length) {
      renderCoverageGaps(voiceMapCoverage);
    }

    if (stats?.industries) renderLegend(stats.industries as string[]);
    else if (view === 'semantic' || view === 'corpus-chunks') {
      const industryKeys = [...new Set(nodes.map((n) => n.industry).filter(Boolean))] as string[];
      if (industryKeys.length) renderLegend(industryKeys);
    } else if (view === 'principles') {
      const legend = document.getElementById('voice-map-legend');
      if (legend) legend.innerHTML = '';
    }

    voiceMapCache = { nodes, edges, meta: metaParts.join(' · '), routeNodeIds };
    if (voiceMap3dMode) {
      await renderVoiceMap3d(nodes, edges);
      const metaEl = document.getElementById('voice-map-meta');
      if (metaEl) {
        metaEl.textContent = `${voiceMapCache.meta} · Switch to 2D to click and inspect nodes`;
      }
    } else {
      destroyVoiceMapWebGl();
      renderVoiceMapSvg(svg, nodes, edges, voiceMapCache.meta, routeNodeIds);
    }
  } catch {
    renderVoiceMapSvg(svg, [], [], 'Network error loading the map.');
  }
}

async function bootstrapVoiceCorpus(): Promise<void> {
  const btn = document.getElementById('voice-map-bootstrap-btn') as HTMLButtonElement | null;
  const meta = document.getElementById('voice-map-meta');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Rebuilding…';
  }
  if (meta) meta.textContent = 'Rebuilding map from published guides and Brisbane voice…';
  try {
    const res = await workspaceJsonFetch('/admin/bootstrap-voice-corpus', { method: 'POST' });
    const data = await res.json();
    if (!res.ok || !data.success) {
      if (meta) meta.textContent = data.error || 'Rebuild failed.';
      return;
    }
    if (meta) {
      meta.textContent = data.message || 'Map rebuilt.';
    }
    await loadVoiceMap();
  } catch {
    if (meta) meta.textContent = 'Network error while rebuilding the map.';
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Rebuild map';
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
  document.getElementById('voice-map-view')?.addEventListener('change', () => {
    selectMapNode(null);
    void loadVoiceMap();
  });
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
      btn.textContent = voiceMapDepthMode ? 'Flat' : 'Depth';
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
      btn3d.textContent = voiceMap3dMode ? '2D' : '3D';
    }
    const depthBtn = document.getElementById('voice-map-view-mode');
    if (depthBtn && voiceMap3dMode) {
      depthBtn.setAttribute('aria-pressed', 'false');
      depthBtn.textContent = 'Depth';
    }
    applyVoiceMapViewMode();
    if (voiceMapCache) {
      if (voiceMap3dMode) {
        void renderVoiceMap3d(voiceMapCache.nodes, voiceMapCache.edges);
        const metaEl = document.getElementById('voice-map-meta');
        if (metaEl) {
          metaEl.textContent = `${voiceMapCache.meta} · Switch to 2D to click and inspect nodes`;
        }
      } else {
        destroyVoiceMapWebGl();
        const svg = document.getElementById('voice-map-svg') as SVGSVGElement | null;
        if (svg) {
          renderVoiceMapSvg(svg, voiceMapCache.nodes, voiceMapCache.edges, voiceMapCache.meta, voiceMapCache.routeNodeIds);
        }
      }
    }
  });
  document.getElementById('voice-map-bootstrap-btn')?.addEventListener('click', () => {
    void (async () => {
      const ok = await showConfirmDialog({
        title: 'Rebuild voice map',
        message: 'Rebuild the map from published guides and refresh the Brisbane site voice?',
        details: 'This may take a minute on large libraries. The map refreshes when complete.',
        confirmLabel: 'Rebuild map',
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
      debugEl.textContent = 'Extrapolating lineage and voice-match patterns…';
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
