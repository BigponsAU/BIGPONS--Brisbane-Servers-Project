/**
 * Lightweight portal navigation tracker (legacy markov-chain-tracker parity).
 * Client-only — summarizes panel transitions in Voice lab.
 */

const STORAGE_KEY = 'bs-portal-markov-v1';
const MAX_CHAIN = 200;
const DEFAULT_PANEL = 'dashboard';

type TransitionMap = Record<string, Record<string, number>>;

interface MarkovState {
  current: string;
  chain: string[];
  transitions: TransitionMap;
}

function loadState(): MarkovState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { current: DEFAULT_PANEL, chain: [DEFAULT_PANEL], transitions: {} };
    }
    const parsed = JSON.parse(raw) as MarkovState;
    const current = parsed.current === 'overview' ? DEFAULT_PANEL : (parsed.current || DEFAULT_PANEL);
    const chain = Array.isArray(parsed.chain)
      ? parsed.chain.map((step) => (step === 'overview' ? DEFAULT_PANEL : step))
      : [DEFAULT_PANEL];
    return {
      current,
      chain,
      transitions: parsed.transitions || {},
    };
  } catch {
    return { current: DEFAULT_PANEL, chain: [DEFAULT_PANEL], transitions: {} };
  }
}

function saveState(state: MarkovState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota */
  }
}

export function trackPortalPanel(panelId: string): void {
  const next = panelId.replace(/-panel$/, '') || panelId;
  const state = loadState();
  const from = state.current;
  if (from === next) return;

  state.current = next;
  state.chain.push(next);
  if (state.chain.length > MAX_CHAIN) {
    state.chain = state.chain.slice(-MAX_CHAIN);
  }

  if (!state.transitions[from]) {
    state.transitions[from] = {};
  }
  state.transitions[from][next] = (state.transitions[from][next] ?? 0) + 1;
  saveState(state);
}

export function getPortalMarkovSummary(): string {
  const state = loadState();
  const lines: string[] = [
    `Current panel: ${state.current}`,
    `Steps recorded: ${state.chain.length}`,
    '',
    'Top transitions:',
  ];

  const pairs: Array<{ from: string; to: string; count: number }> = [];
  for (const [from, toMap] of Object.entries(state.transitions)) {
    for (const [to, count] of Object.entries(toMap)) {
      pairs.push({ from, to, count });
    }
  }

  pairs.sort((a, b) => b.count - a.count);
  if (!pairs.length) {
    lines.push('  (navigate the workspace to collect flow data)');
  } else {
    for (const row of pairs.slice(0, 12)) {
      lines.push(`  ${row.from} → ${row.to}: ${row.count}`);
    }
  }

  const recent = state.chain.slice(-8);
  lines.push('', `Recent path: ${recent.join(' → ')}`);
  return lines.join('\n');
}

export function renderPortalMarkovIntoVoiceLab(): void {
  const el = document.getElementById('voice-lab-markov-summary');
  if (!el) return;
  el.textContent = getPortalMarkovSummary();
}

export function exportPortalMarkovData(): void {
  const state = loadState();
  const payload = {
    exportedAt: new Date().toISOString(),
    ...state,
    summary: getPortalMarkovSummary(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `portal-markov-flow-${Date.now()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function resetPortalMarkovTracker(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  renderPortalMarkovIntoVoiceLab();
}
