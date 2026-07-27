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
let voiceMapWebGl: {
  render: () => void;
  destroy: () => void;
  setSelectedId: (id: string | null) => void;
} | null = null;

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

const INDUSTRY_LABELS: Record<string, string> = {
  healthcare: 'Healthcare',
  hospitality: 'Hospitality',
  retail: 'Retail',
  'professional-services': 'Professional services',
  manufacturing: 'Manufacturing',
  finance: 'Finance',
  construction: 'Construction',
  general: 'General',
  platform: 'Platform',
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
  const accountCtx = (
    window as unknown as { __portalAccountCtx?: { apiBaseUrl?: string } }
  ).__portalAccountCtx;
  const fromCtx = (accountCtx?.apiBaseUrl ?? '').replace(/\/+$/, '');
  if (fromCtx) return fromCtx;

  const bridge = (window as unknown as { __portalBridge?: { apiBaseUrl?: string } }).__portalBridge;
  const fromBridge = (bridge?.apiBaseUrl ?? '').replace(/\/+$/, '');
  if (fromBridge) return fromBridge;

  const root = document.getElementById('admin-portal');
  const fromDataset = (root?.dataset?.publicApiBaseUrl ?? '').replace(/\/+$/, '');
  return fromDataset || '/api';
}

async function workspaceJsonFetch(path: string, init?: RequestInit): Promise<Response> {
  const base = getApiBase();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return workspaceFetch(`${base}${normalizedPath}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
}

async function readJsonSafe(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(
      res.ok
        ? 'Server returned a non-JSON response'
        : `Request failed (${res.status}) with a non-JSON response`
    );
  }
}

/** Prefer human labels; never trust coverage.name when it is just the slug. */
export function industryLabel(key: string, coverage?: IndustryCoverageItem[]): string {
  const normalized = key.toLowerCase().replace(/\s+/g, '-');
  const known = INDUSTRY_LABELS[normalized] || INDUSTRY_LABELS[key];
  if (known) return known;

  const fromCoverage = coverage?.find((c) => c.id === key || c.id === normalized || c.name === key);
  if (fromCoverage?.name) {
    const coverageSlug = fromCoverage.name.toLowerCase().replace(/\s+/g, '-');
    if (coverageSlug !== normalized && coverageSlug !== fromCoverage.id) {
      return fromCoverage.name;
    }
    const fromId = INDUSTRY_LABELS[fromCoverage.id] || INDUSTRY_LABELS[coverageSlug];
    if (fromId) return fromId;
    return titleCaseSlug(fromCoverage.name);
  }

  return titleCaseSlug(key);
}

function titleCaseSlug(value: string): string {
  return value
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
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

function renderLegend(industryKeys: string[], coverage?: IndustryCoverageItem[]): void {
  const legend = document.getElementById('voice-map-legend');
  if (!legend) return;

  const keys = industryKeys
    .map((k) => String(k || '').trim())
    .filter(Boolean)
    .filter((k, i, arr) => arr.indexOf(k) === i)
    .filter((k) => {
      const normalized = k.toLowerCase().replace(/\s+/g, '-');
      return normalized !== 'profile' && normalized !== 'brisbane' && normalized !== 'brisbane-voice';
    });

  const items: Array<{ key: string; label: string }> = [
    { key: 'profile', label: 'Brisbane voice' },
    ...keys.map((key) => ({
      key: key.toLowerCase().replace(/\s+/g, '-'),
      label: industryLabel(key, coverage),
    })),
  ];

  // Separators keep labels readable even if chip CSS fails to load.
  legend.innerHTML = items
    .slice(0, 12)
    .map((item, index) => {
      const color = INDUSTRY_COLORS[item.key] ?? INDUSTRY_COLORS.general;
      const sep =
        index === 0
          ? ''
          : `<span class="voice-map-legend-sep" aria-hidden="true"> · </span>`;
      return `${sep}<span class="voice-map-legend-item"><span class="voice-map-legend-swatch" style="background:${color}" aria-hidden="true"></span><span class="voice-map-legend-label">${escapeHtml(item.label)}</span></span>`;
    })
    .join('');
}

function clearVoiceMapChrome(): void {
  const legend = document.getElementById('voice-map-legend');
  if (legend) legend.innerHTML = '';
  renderCoverageGaps([]);
  renderSelectionDetail(null);
}

function renderVoiceMapError(svg: SVGSVGElement, message: string): void {
  clearVoiceMapChrome();
  const width = 800;
  const height = 480;
  applyVoiceMapViewMode();
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.innerHTML = '';

  const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  title.setAttribute('x', String(width / 2));
  title.setAttribute('y', String(height / 2 - 12));
  title.setAttribute('text-anchor', 'middle');
  title.setAttribute('class', 'voice-map-placeholder voice-map-placeholder--error');
  title.textContent = 'Could not load the map';
  svg.appendChild(title);

  const detail = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  detail.setAttribute('x', String(width / 2));
  detail.setAttribute('y', String(height / 2 + 16));
  detail.setAttribute('text-anchor', 'middle');
  detail.setAttribute('class', 'voice-map-placeholder-detail');
  detail.textContent = message.slice(0, 120);
  svg.appendChild(detail);

  const metaEl = document.getElementById('voice-map-meta');
  if (metaEl) metaEl.textContent = message;
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
  if (svg && voiceMapCache) {
    svg.querySelectorAll('.voice-map-node').forEach((el) => {
      el.classList.toggle('voice-map-node--selected', el.getAttribute('data-node-id') === nodeId);
    });
  }
  voiceMapWebGl?.setSelectedId(nodeId);
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
    voiceMapWebGl = mountVoiceMapWebGl(canvas, nodes, edges, {
      selectedId: voiceMapSelectedId,
      onSelect: (nodeId) => {
        selectMapNode(nodeId);
      },
      onActivate: (nodeId) => {
        const node = nodes.find((n) => n.id === nodeId);
        if (!node) return;
        selectMapNode(nodeId);
        const resourceId = resolveResourceId(node);
        if (resourceId) openResourceInCreate(resourceId);
        else if (node.kind === 'profile') {
          (window as Window & { navigateToPanel?: (p: string) => void }).navigateToPanel?.('profiles');
        }
      },
    });
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
    text.setAttribute('y', String(height / 2 - 10));
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('class', 'voice-map-placeholder');
    text.textContent = 'Nothing to map yet';
    svg.appendChild(text);

    const hint = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    hint.setAttribute('x', String(width / 2));
    hint.setAttribute('y', String(height / 2 + 18));
    hint.setAttribute('text-anchor', 'middle');
    hint.setAttribute('class', 'voice-map-placeholder-detail');
    hint.textContent = 'Publish guides, or ask an admin to Rebuild map.';
    svg.appendChild(hint);

    const metaEl = document.getElementById('voice-map-meta');
    if (metaEl) metaEl.textContent = meta || 'Empty corpus — publish a guide to seed the map.';
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
    metaEl.textContent = `${meta} · Click to inspect · Double-click to open`;
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
  const metaEl = document.getElementById('voice-map-meta');
  if (metaEl) metaEl.textContent = 'Loading map…';

  try {
    const res = await workspaceJsonFetch(path);
    const data = await readJsonSafe(res);
    if (!res.ok || !data.success) {
      const errMsg =
        typeof data.error === 'string' && data.error
          ? data.error
          : `Could not load the map (${res.status || 'error'}).`;
      renderVoiceMapError(svg, errMsg);
      return;
    }
    const rawNodes = (Array.isArray(data.nodes) ? data.nodes : []) as Array<{
      id: string;
      label?: string;
      principle?: string;
      x: number;
      y: number;
      kind?: string;
      industry?: string;
      resourceId?: string;
      profileId?: string;
    }>;
    const nodes: MapNode[] = rawNodes.map((n) => ({
      id: n.id,
      label: n.label ?? n.principle,
      x: n.x,
      y: n.y,
      kind: n.kind,
      industry: n.industry,
      resourceId: n.resourceId,
      profileId: n.profileId,
    }));
    const rawEdges = (Array.isArray(data.edges) ? data.edges : []) as Array<{
      sourceId: string;
      targetId: string;
      strength?: number;
      kind?: string;
    }>;
    const edges: MapEdge[] = rawEdges.map((e) => ({
      sourceId: e.sourceId,
      targetId: e.targetId,
      strength: e.strength,
      kind: e.kind,
    }));
    const routeIds = Array.isArray(data.routeNodeIds) ? (data.routeNodeIds as string[]) : [];
    const routeNodeIds = routeIds.length > 0 ? new Set(routeIds) : undefined;
    const stats = (data.stats ?? {}) as {
      industries?: string[];
      industryCoverage?: IndustryCoverageItem[];
      indexedResources?: number;
      chunksInIndex?: number;
    };
    const brisbaneProfile = data.brisbaneProfile as { name?: string } | null | undefined;
    const brisbane = brisbaneProfile?.name ?? 'Brisbane';
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
      brisbaneProfile ? `Centre: ${brisbane} voice` : '',
    ].filter(Boolean);

    if (Array.isArray(stats?.industryCoverage)) {
      voiceMapCoverage = stats.industryCoverage as IndustryCoverageItem[];
      renderCoverageGaps(voiceMapCoverage);
    } else if (view === 'corpus-resources' || view === 'corpus-chunks') {
      renderCoverageGaps([]);
    } else if (voiceMapCoverage.length) {
      renderCoverageGaps(voiceMapCoverage);
    }

    const coverage = voiceMapCoverage.length ? voiceMapCoverage : undefined;
    if (Array.isArray(stats?.industries) && stats.industries.length) {
      renderLegend(stats.industries as string[], coverage);
    } else if (coverage?.length) {
      renderLegend(
        coverage.map((c) => c.id),
        coverage
      );
                    } else if (view === 'semantic' || view === 'corpus-chunks') {
      const industryKeys = [...new Set(nodes.map((n) => n.industry).filter(Boolean))] as string[];
      if (industryKeys.length) renderLegend(industryKeys, coverage);
      else {
        const legend = document.getElementById('voice-map-legend');
        if (legend) legend.innerHTML = '';
      }
    } else if (view === 'principles') {
      const legend = document.getElementById('voice-map-legend');
      if (legend) legend.innerHTML = '';
    }

    voiceMapCache = { nodes, edges, meta: metaParts.join(' · '), routeNodeIds };
    if (voiceMap3dMode) {
      applyVoiceMapViewMode();
      await renderVoiceMap3d(nodes, edges);
      if (metaEl) {
        metaEl.textContent = `${voiceMapCache.meta} · Drag to orbit · Click to inspect · Double-click to open`;
      }
      if (voiceMapSelectedId) {
        const selected = nodes.find((n) => n.id === voiceMapSelectedId) ?? null;
        renderSelectionDetail(selected);
      }
    } else {
      destroyVoiceMapWebGl();
      renderVoiceMapSvg(svg, nodes, edges, voiceMapCache.meta, routeNodeIds);
    }
  } catch (err) {
    trackPortalError('loadVoiceMap', err);
    const detail = err instanceof Error ? err.message : 'Network error loading the map.';
    renderVoiceMapError(svg, detail);
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
    const data = await readJsonSafe(res);
    if (!res.ok || !data.success) {
      if (meta) {
        meta.textContent =
          (typeof data.error === 'string' && data.error) || `Rebuild failed (${res.status || 'error'}).`;
      }
      return;
    }
    if (meta) {
      meta.textContent = (typeof data.message === 'string' && data.message) || 'Map rebuilt.';
    }
    await loadVoiceMap();
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Unknown error';
    if (meta) meta.textContent = `Could not rebuild map: ${detail}`;
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
    const data = await readJsonSafe(res);
    if (!res.ok || !data.success) {
      output.textContent =
        (typeof data.error === 'string' && data.error) || `Analysis failed (${res.status || 'error'}).`;
      return;
    }
    const score =
      typeof data.score === 'number'
        ? data.score
        : typeof (data.tone as { overallScore?: unknown } | undefined)?.overallScore === 'number'
          ? (data.tone as { overallScore: number }).overallScore
          : typeof (data.validation as { score?: unknown } | undefined)?.score === 'number'
            ? (data.validation as { score: number }).score
            : null;
    const profileHint =
      (data.voiceProfile as { profileId?: string } | undefined)?.profileId ||
      (typeof data.profileId === 'string' ? data.profileId : null) ||
      'resolved profile';
    const lines = [
      `Voice lab analysis (${mode})`,
      `Profile: ${profileHint}`,
      score != null ? `Score: ${Math.round(Number(score) * 100)}%` : null,
      '',
      'Detail (JSON):',
      JSON.stringify(data, null, 2),
    ].filter((line) => line !== null);
    output.textContent = lines.join('\n');
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Unknown error';
    output.textContent = `Could not analyze voice: ${detail}`;
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
        applyVoiceMapViewMode();
        void renderVoiceMap3d(voiceMapCache.nodes, voiceMapCache.edges);
        const metaEl = document.getElementById('voice-map-meta');
        if (metaEl) {
          metaEl.textContent = `${voiceMapCache.meta} · Drag to orbit · Click to inspect · Double-click to open`;
        }
      } else {
        destroyVoiceMapWebGl();
        applyVoiceMapViewMode();
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
          const data = await readJsonSafe(res);
          if (!res.ok || !data.success) {
            return {
              ok: false,
              error:
                (typeof data.error === 'string' && data.error) ||
                `Extrapolation failed (${res.status || 'error'})`,
            };
          }
          return { ok: true, text: String(data.text ?? ''), warnings: data.warnings as string[] | undefined };
        })
        .then((result) => {
          if (!debugEl) return;
          const warn =
            Array.isArray(result.warnings) && result.warnings.length
              ? `${result.warnings.map((w) => `⚠ ${w}`).join('\n')}\n\n`
              : '⚠ Voice Lab debug only — not production copy.\n\n';
          debugEl.textContent = `${warn}${result.text}`;
        })
        .catch((err) => {
          trackPortalError('extrapolateMarkovIssues', err);
          const detail = err instanceof Error ? err.message : 'Unknown error';
          if (debugEl) debugEl.textContent = `Could not extrapolate lineage: ${detail}`;
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
        message: 'Reset resource lineage Markov data for this browser?',
        details: 'Voice match history and resource→resource hops stored locally will be cleared. This cannot be undone.',
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
