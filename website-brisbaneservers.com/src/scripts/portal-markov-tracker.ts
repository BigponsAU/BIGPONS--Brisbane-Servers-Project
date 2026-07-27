/**
 * Resource-lineage Markov tracker.
 *
 * Models creation of resources from other resources (starter blocks, RAG parents,
 * generated/improved copies) and which voice profile matched on each hop — not
 * portal navigation / UI click flow.
 */

const STORAGE_KEY = 'bs-resource-markov-v1';
const LEGACY_PORTAL_KEYS = ['bs-portal-markov-v2', 'bs-portal-markov-v1'] as const;
const MAX_CHAIN = 400;
const SEED_NODE = 'seed:blank';

export type ResourceMarkovSourceKind =
  | 'starter'
  | 'resource'
  | 'generate'
  | 'improve'
  | 'upload'
  | 'growth'
  | 'rag';

export type ResourceMarkovEdge = {
  fromResourceId: string;
  fromLabel?: string;
  toResourceId: string;
  toLabel?: string;
  sourceKind: ResourceMarkovSourceKind;
  voiceProfileId: string | null;
  voiceScore: number;
  timestamp: number;
};

type TransitionMap = Record<string, Record<string, number>>;

interface MarkovState {
  chain: ResourceMarkovEdge[];
  /** fromResourceId → toResourceId → count */
  transitions: TransitionMap;
  /** voiceProfileId → hop count */
  voiceCounts: Record<string, number>;
  /** voiceProfileId → sum of voice scores */
  voiceScoreSums: Record<string, number>;
  startTime: number;
}

export type TrackResourceCreationInput = {
  fromResourceId?: string | null;
  fromLabel?: string;
  /** Extra parents (RAG multi-source); primary remains fromResourceId. */
  fromResourceIds?: string[];
  toResourceId: string;
  toLabel?: string;
  sourceKind: ResourceMarkovSourceKind;
  voiceProfileId?: string | null;
  voiceScore?: number;
};

function emptyState(): MarkovState {
  return {
    chain: [],
    transitions: {},
    voiceCounts: {},
    voiceScoreSums: {},
    startTime: Date.now(),
  };
}

function clearLegacyPortalKeys(): void {
  try {
    for (const key of LEGACY_PORTAL_KEYS) {
      localStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
}

function loadState(): MarkovState {
  try {
    clearLegacyPortalKeys();
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as MarkovState;
    return {
      chain: Array.isArray(parsed.chain) ? parsed.chain : [],
      transitions: parsed.transitions || {},
      voiceCounts: parsed.voiceCounts || {},
      voiceScoreSums: parsed.voiceScoreSums || {},
      startTime: parsed.startTime || Date.now(),
    };
  } catch {
    return emptyState();
  }
}

function saveState(state: MarkovState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota */
  }
}

function recordTransition(state: MarkovState, from: string, to: string): void {
  if (!state.transitions[from]) state.transitions[from] = {};
  state.transitions[from][to] = (state.transitions[from][to] ?? 0) + 1;
}

function pushEdge(state: MarkovState, edge: ResourceMarkovEdge): void {
  const dup = state.chain.some(
    (e) =>
      e.toResourceId === edge.toResourceId &&
      e.fromResourceId === edge.fromResourceId &&
      e.sourceKind === edge.sourceKind
  );
  if (dup) return;

  state.chain.push(edge);
  if (state.chain.length > MAX_CHAIN) {
    state.chain = state.chain.slice(-MAX_CHAIN);
  }
  recordTransition(state, edge.fromResourceId, edge.toResourceId);

  const voiceKey = normalizeVoiceKey(edge.voiceProfileId);
  state.voiceCounts[voiceKey] = (state.voiceCounts[voiceKey] ?? 0) + 1;
  state.voiceScoreSums[voiceKey] = (state.voiceScoreSums[voiceKey] ?? 0) + edge.voiceScore;
}

function shortId(id: string): string {
  if (id === SEED_NODE) return 'Blank seed';
  if (id.length <= 28) return id;
  return `${id.slice(0, 12)}…${id.slice(-8)}`;
}

function normalizeVoiceKey(voiceProfileId: string | null | undefined): string {
  const raw = typeof voiceProfileId === 'string' ? voiceProfileId.trim() : '';
  if (!raw || raw === 'undefined' || raw === 'null' || raw === 'NaN') return 'unspecified';
  return raw;
}

function humanizeResourceId(id: string): string {
  if (id === SEED_NODE) return 'Blank seed';
  let s = id
    .replace(/^starter-block[-_]?/i, '')
    .replace(/[-_]?\d{10,}$/g, '')
    .replace(/[-_]+/g, ' ')
    .trim();
  if (!s) return shortId(id);
  return s.replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function labelFor(id: string, label?: string): string {
  if (label?.trim()) return label.trim();
  return humanizeResourceId(id);
}

function buildResourceLabelIndex(state: MarkovState): Map<string, string> {
  const map = new Map<string, string>();
  for (const edge of state.chain) {
    if (edge.fromLabel?.trim()) map.set(edge.fromResourceId, edge.fromLabel.trim());
    if (edge.toLabel?.trim()) map.set(edge.toResourceId, edge.toLabel.trim());
  }
  return map;
}

function resolveResourceLabel(id: string, labels: Map<string, string>): string {
  return labels.get(id) || humanizeResourceId(id);
}

function resolveVoiceLabel(voiceProfileId: string): string {
  const key = normalizeVoiceKey(voiceProfileId);
  if (key === 'unspecified') return 'Unspecified voice';
  try {
    const profiles = (
      window as unknown as {
        allProfiles?: Array<{ id?: string; name?: string; voiceName?: string }>;
      }
    ).allProfiles;
    const hit = profiles?.find((p) => p.id === key);
    if (hit) return String(hit.name || hit.voiceName || key);
  } catch {
    /* ignore */
  }
  if (/brisbane/i.test(key)) return 'Brisbane';
  return shortId(key);
}

function scorePct(score: number): string {
  return `${Math.round(Math.max(0, Math.min(1, score)) * 100)}%`;
}

/** Record one resource→resource creation hop (Markov edge). */
export function trackResourceCreation(input: TrackResourceCreationInput): void {
  if (typeof localStorage === 'undefined') return;
  const toId = input.toResourceId?.trim();
  if (!toId) return;

  const parents = [
    input.fromResourceId,
    ...(input.fromResourceIds || []),
  ]
    .map((id) => (typeof id === 'string' ? id.trim() : ''))
    .filter(Boolean);

  const uniqueParents = [...new Set(parents)];
  const fromIds = uniqueParents.length ? uniqueParents : [SEED_NODE];
  const voiceScore =
    typeof input.voiceScore === 'number' && Number.isFinite(input.voiceScore)
      ? Math.max(0, Math.min(1, input.voiceScore))
      : 0;
  const voiceKey = normalizeVoiceKey(input.voiceProfileId);
  const voiceProfileId = voiceKey === 'unspecified' ? null : voiceKey;
  const state = loadState();
  const now = Date.now();

  for (const fromId of fromIds) {
    pushEdge(state, {
      fromResourceId: fromId,
      fromLabel: fromId === input.fromResourceId ? input.fromLabel : undefined,
      toResourceId: toId,
      toLabel: input.toLabel,
      sourceKind: input.sourceKind,
      voiceProfileId,
      voiceScore,
      timestamp: now,
    });
  }

  saveState(state);
}

/** Hydrate Markov from persisted resource lineage metadata. */
export function ingestResourcesIntoMarkov(
  resources: Array<{
    id: string;
    title?: string;
    isStarterBlock?: boolean;
    metadata?: {
      sourceResourceId?: string;
      sourceResourceIds?: string[];
      sourceKind?: ResourceMarkovSourceKind;
      voiceProfileId?: string;
      voiceScore?: number;
    };
  }>
): void {
  if (typeof localStorage === 'undefined' || !Array.isArray(resources)) return;
  const byId = new Map(resources.map((r) => [r.id, r]));

  for (const resource of resources) {
    const meta = resource.metadata;
    if (!meta?.sourceResourceId && !meta?.sourceResourceIds?.length) continue;
    if (resource.isStarterBlock) continue;

    const fromId = meta.sourceResourceId || meta.sourceResourceIds?.[0] || SEED_NODE;
    const from = byId.get(fromId);
    trackResourceCreation({
      fromResourceId: fromId === SEED_NODE ? null : fromId,
      fromLabel: from?.title,
      fromResourceIds: meta.sourceResourceIds,
      toResourceId: resource.id,
      toLabel: resource.title,
      sourceKind: meta.sourceKind || (from?.isStarterBlock ? 'starter' : 'resource'),
      voiceProfileId: meta.voiceProfileId ?? null,
      voiceScore: meta.voiceScore ?? 0,
    });
  }
}

function topTransitions(transitions: TransitionMap, limit = 12): string[] {
  const pairs: Array<{ from: string; to: string; count: number }> = [];
  for (const [from, toMap] of Object.entries(transitions)) {
    for (const [to, count] of Object.entries(toMap)) {
      pairs.push({ from, to, count });
    }
  }
  pairs.sort((a, b) => b.count - a.count);
  if (!pairs.length) {
    return ['  (create or generate a resource from a starter / parent to collect lineage)'];
  }
  return pairs
    .slice(0, limit)
    .map((row) => `  ${shortId(row.from)} → ${shortId(row.to)}: ${row.count}`);
}

function voiceMatchBreakdown(state: MarkovState): Array<{
  voiceProfileId: string;
  hops: number;
  sharePercent: number;
  avgMatchPercent: number;
}> {
  // Merge legacy bad keys ("undefined") into unspecified when reading.
  const counts: Record<string, number> = {};
  const sums: Record<string, number> = {};
  for (const [rawKey, hops] of Object.entries(state.voiceCounts)) {
    const key = normalizeVoiceKey(rawKey);
    counts[key] = (counts[key] ?? 0) + hops;
    sums[key] = (sums[key] ?? 0) + (state.voiceScoreSums[rawKey] ?? 0);
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (!total) return [];
  return Object.keys(counts)
    .map((voiceProfileId) => {
      const hops = counts[voiceProfileId] ?? 0;
      const sum = sums[voiceProfileId] ?? 0;
      return {
        voiceProfileId,
        hops,
        sharePercent: Math.round((hops / total) * 1000) / 10,
        avgMatchPercent: hops > 0 ? Math.round((sum / hops) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => b.hops - a.hops || b.avgMatchPercent - a.avgMatchPercent);
}

export function getPortalMarkovAnalysisReport(): {
  summary: Record<string, string | number>;
  voiceShares: Array<{
    voiceProfileId: string;
    hops: number;
    sharePercent: number;
    avgMatchPercent: number;
  }>;
  topTransitions: Array<{ from: string; to: string; count: number }>;
  recentEdges: ResourceMarkovEdge[];
  /** @deprecated portal-flow fields kept empty for old callers */
  unusedFunctions: string[];
  functionsWithErrors: Array<{ name: string; count: number; errors: number; errorRate: string }>;
  errorProneTransitions: Array<{ transition: string; errorCount: number }>;
  recentErrors: never[];
} {
  const state = loadState();
  const voiceShares = voiceMatchBreakdown(state);
  const pairs: Array<{ from: string; to: string; count: number }> = [];
  for (const [from, toMap] of Object.entries(state.transitions)) {
    for (const [to, count] of Object.entries(toMap)) {
      pairs.push({ from, to, count });
    }
  }
  pairs.sort((a, b) => b.count - a.count);

  const avgScore =
    state.chain.length > 0
      ? state.chain.reduce((s, e) => s + e.voiceScore, 0) / state.chain.length
      : 0;
  const topVoice = voiceShares[0];

  return {
    summary: {
      lineageHops: state.chain.length,
      distinctSources: Object.keys(state.transitions).length,
      distinctVoices: Object.keys(state.voiceCounts).length,
      avgVoiceMatchPercent: Math.round(avgScore * 1000) / 10,
      dominantVoice: topVoice ? resolveVoiceLabel(topVoice.voiceProfileId) : '—',
      dominantVoiceId: topVoice?.voiceProfileId || 'unspecified',
      dominantVoiceSharePercent: topVoice?.sharePercent ?? 0,
      sessionSeconds: Math.round((Date.now() - state.startTime) / 1000),
    },
    voiceShares,
    topTransitions: pairs.slice(0, 20),
    recentEdges: state.chain.slice(-12),
    unusedFunctions: [],
    functionsWithErrors: [],
    errorProneTransitions: [],
    recentErrors: [],
  };
}

export function getPortalMarkovSummary(): string {
  const state = loadState();
  const report = getPortalMarkovAnalysisReport();
  const labels = buildResourceLabelIndex(state);
  const lines: string[] = [
    `Lineage hops: ${report.summary.lineageHops}`,
    `Avg voice match: ${report.summary.avgVoiceMatchPercent}%`,
    `Dominant voice: ${report.summary.dominantVoice} (${report.summary.dominantVoiceSharePercent}% of hops)`,
    '',
    'Voice match share (which voice the chain matches most):',
  ];

  if (!report.voiceShares.length) {
    lines.push('  (none yet)');
  } else {
    for (const row of report.voiceShares.slice(0, 8)) {
      lines.push(
        `  ${resolveVoiceLabel(row.voiceProfileId)}: ${row.sharePercent}% of hops · avg match ${row.avgMatchPercent}%`
      );
    }
  }

  lines.push('', 'Top resource → resource transitions:');
  if (!report.topTransitions.length) {
    lines.push('  (create or generate a resource from a starter / parent to collect lineage)');
  } else {
    for (const row of report.topTransitions.slice(0, 12)) {
      lines.push(
        `  ${resolveResourceLabel(row.from, labels)} → ${resolveResourceLabel(row.to, labels)}: ${row.count}`
      );
    }
  }

  const recent = state.chain.slice(-6).map((e) => {
    const match = scorePct(e.voiceScore);
    return `${labelFor(e.fromResourceId, e.fromLabel)} → ${labelFor(e.toResourceId, e.toLabel)} [${e.sourceKind}, ${match}]`;
  });
  if (recent.length) {
    lines.push('', 'Recent lineage:', ...recent.map((r) => `  ${r}`));
  }
  return lines.join('\n');
}

function escapeMarkovHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Rich HTML summary for Voice lab — bars + stats instead of plain pre text. */
export function renderPortalMarkovSummaryHtml(): string {
  const state = loadState();
  const report = getPortalMarkovAnalysisReport();
  const labels = buildResourceLabelIndex(state);
  const hops = Number(report.summary.lineageHops) || 0;
  const avg = Number(report.summary.avgVoiceMatchPercent) || 0;
  const dominantId = String(report.summary.dominantVoiceId || report.summary.dominantVoice || 'unspecified');
  const dominant = resolveVoiceLabel(dominantId);
  const dominantShare = Number(report.summary.dominantVoiceSharePercent) || 0;

  const shareRows = report.voiceShares.length
    ? report.voiceShares
        .slice(0, 6)
        .map((row) => {
          const width = Math.max(4, Math.min(100, row.sharePercent));
          const name = resolveVoiceLabel(row.voiceProfileId);
          return `<div class="markov-share-row">
            <div class="markov-share-row__label">
              <span title="${escapeMarkovHtml(row.voiceProfileId)}">${escapeMarkovHtml(name)}</span>
              <span class="markov-share-row__meta">${row.sharePercent}% · avg ${row.avgMatchPercent}%</span>
            </div>
            <div class="markov-share-row__track" aria-hidden="true">
              <span class="markov-share-row__fill" style="width:${width}%"></span>
            </div>
          </div>`;
        })
        .join('')
    : `<p class="markov-empty-hint">No creation hops yet — generate or improve a resource from a starter to start the chain.</p>`;

  const transitionRows = report.topTransitions.length
    ? `<ul class="markov-transition-list">${report.topTransitions
        .slice(0, 5)
        .map((t) => {
          const from = resolveResourceLabel(t.from, labels);
          const to = resolveResourceLabel(t.to, labels);
          return `<li><span class="markov-transition-list__edge" title="${escapeMarkovHtml(t.from)} → ${escapeMarkovHtml(t.to)}">${escapeMarkovHtml(from)} → ${escapeMarkovHtml(to)}</span><span class="markov-transition-list__count">${t.count}</span></li>`;
        })
        .join('')}</ul>`
    : '';

  return `<div class="markov-dashboard">
    <div class="markov-stat-grid">
      <div class="markov-stat">
        <span class="markov-stat__label">Lineage hops</span>
        <span class="markov-stat__value">${hops}</span>
      </div>
      <div class="markov-stat">
        <span class="markov-stat__label">Avg voice match</span>
        <span class="markov-stat__value">${avg}%</span>
        <span class="markov-stat__meter" style="--markov-meter:${Math.max(0, Math.min(100, avg))}%" aria-hidden="true"></span>
      </div>
      <div class="markov-stat markov-stat--wide">
        <span class="markov-stat__label">Dominant voice</span>
        <span class="markov-stat__value markov-stat__value--sm" title="${escapeMarkovHtml(dominantId)}">${escapeMarkovHtml(dominant)}</span>
        <span class="markov-stat__meta">${dominantShare}% of hops</span>
      </div>
    </div>
    <div class="markov-panel">
      <h4 class="markov-panel__title">Voice match share</h4>
      ${shareRows}
    </div>
    ${
      transitionRows
        ? `<div class="markov-panel">
      <h4 class="markov-panel__title">Top creation transitions</h4>
      ${transitionRows}
    </div>`
        : ''
    }
  </div>`;
}

export function debugFromPortalMarkov(): string {
  const state = loadState();
  const report = getPortalMarkovAnalysisReport();
  const labels = buildResourceLabelIndex(state);
  const lines: string[] = [
    '=== Resource lineage Markov ===',
    `Hops: ${report.summary.lineageHops}`,
    `Sources: ${report.summary.distinctSources}`,
    `Voices: ${report.summary.distinctVoices}`,
    `Avg voice match: ${report.summary.avgVoiceMatchPercent}%`,
    `Dominant voice: ${report.summary.dominantVoice} (${report.summary.dominantVoiceSharePercent}%)`,
    '',
    'Voice share across Markov hops:',
  ];

  if (!report.voiceShares.length) {
    lines.push('  No creation hops recorded yet.');
  } else {
    for (const row of report.voiceShares) {
      lines.push(
        `  • ${resolveVoiceLabel(row.voiceProfileId)}: ${row.hops} hop(s), ${row.sharePercent}% of chain, avg match ${row.avgMatchPercent}%`
      );
    }
  }

  lines.push('', 'Recent edges:');
  if (!report.recentEdges.length) {
    lines.push('  (none)');
  } else {
    for (const e of report.recentEdges) {
      lines.push(
        `  • ${resolveResourceLabel(e.fromResourceId, labels)} → ${resolveResourceLabel(e.toResourceId, labels)} · ${e.sourceKind} · voice ${resolveVoiceLabel(e.voiceProfileId || 'unspecified')} · match ${scorePct(e.voiceScore)}`
      );
    }
  }

  return lines.join('\n');
}

export function buildMarkovExtrapolationPrompt(): string {
  const report = getPortalMarkovAnalysisReport();
  const lines: string[] = [
    'Markov Chain Analysis — resource lineage and voice match for Brisbane Servers:',
    '',
    `Lineage hops: ${report.summary.lineageHops}`,
    `Avg voice match: ${report.summary.avgVoiceMatchPercent}%`,
    `Dominant voice: ${report.summary.dominantVoice} (${report.summary.dominantVoiceSharePercent}% of hops)`,
    '',
  ];

  if (report.voiceShares.length) {
    lines.push('Voice share (% of creation hops matching each voice):');
    for (const row of report.voiceShares.slice(0, 8)) {
      lines.push(
        `- ${resolveVoiceLabel(row.voiceProfileId)}: ${row.sharePercent}% of hops, avg match ${row.avgMatchPercent}%`
      );
    }
    lines.push('');
  }

  if (report.topTransitions.length) {
    const state = loadState();
    const labels = buildResourceLabelIndex(state);
    lines.push('Top resource → resource creation transitions:');
    for (const row of report.topTransitions.slice(0, 10)) {
      lines.push(
        `- ${resolveResourceLabel(row.from, labels)} → ${resolveResourceLabel(row.to, labels)}: ${row.count}`
      );
    }
    lines.push('');
  }

  lines.push(
    'Based on this lineage and voice-match distribution, suggest which starter/source resources and voice profiles to reuse next, and where voice match is drifting. Be specific and actionable.'
  );
  return lines.join('\n');
}

export async function extrapolatePortalMarkovIssues(
  apiPost: (
    path: string,
    body: unknown
  ) => Promise<{ ok: boolean; text?: string; error?: string; warnings?: string[] }>
): Promise<{ text: string; warnings?: string[] }> {
  const prompt = buildMarkovExtrapolationPrompt();
  const result = await apiPost('/voice/extrapolate', {
    text: prompt,
    options: { expansionLevel: 'moderate', addExamples: true, addDetails: true },
  });
  if (!result.ok || !result.text) {
    throw new Error(result.error || 'Extrapolation failed.');
  }
  return { text: result.text, warnings: result.warnings };
}

export function renderPortalMarkovIntoVoiceLab(): void {
  if (typeof document === 'undefined') return;
  const summaryEl = document.getElementById('voice-lab-markov-summary');
  if (summaryEl) {
    summaryEl.classList.add('markov-summary-host');
    summaryEl.innerHTML = renderPortalMarkovSummaryHtml();
  }
  const debugEl = document.getElementById('voice-lab-markov-debug');
  if (debugEl && !debugEl.dataset.userTriggered) {
    debugEl.textContent =
      'Click “Debug insights” for voice-share breakdown across resource creation hops.';
  }
}

export function renderPortalMarkovDebug(): void {
  if (typeof document === 'undefined') return;
  const debugEl = document.getElementById('voice-lab-markov-debug');
  if (!debugEl) return;
  debugEl.dataset.userTriggered = 'true';
  debugEl.textContent = debugFromPortalMarkov();
}

export function exportPortalMarkovData(): void {
  const state = loadState();
  const payload = {
    exportedAt: new Date().toISOString(),
    kind: 'resource-lineage-markov',
    ...state,
    summary: getPortalMarkovSummary(),
    analysis: getPortalMarkovAnalysisReport(),
    debug: debugFromPortalMarkov(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `resource-markov-lineage-${Date.now()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function resetPortalMarkovTracker(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    clearLegacyPortalKeys();
  } catch {
    /* ignore */
  }
  if (typeof document !== 'undefined') {
    const debugEl = document.getElementById('voice-lab-markov-debug');
    if (debugEl) delete debugEl.dataset.userTriggered;
  }
  renderPortalMarkovIntoVoiceLab();
}

/** @deprecated Portal nav is not Markov — no-op kept for call-site compatibility. */
export function trackPortalPanel(_panelId: string): void {}

/** @deprecated Portal actions are not Markov — no-op kept for call-site compatibility. */
export function registerPortalFunction(_functionName: string): void {}

/** @deprecated Portal actions are not Markov — no-op kept for call-site compatibility. */
export function trackPortalAction(_functionName: string, _context: { panel?: string } = {}): void {}

/** @deprecated Portal errors are not Markov — no-op kept for call-site compatibility. */
export function trackPortalError(
  _functionName: string,
  _error: unknown,
  _context: { panel?: string } = {}
): void {}

/** @deprecated */
export function wrapPortalAction<T extends (...args: never[]) => unknown>(
  _functionName: string,
  fn: T
): T {
  return fn;
}

/** @deprecated */
export function registerPortalWorkspaceFunctions(): void {}
