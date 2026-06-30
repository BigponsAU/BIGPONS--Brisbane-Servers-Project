/**
 * Portal navigation + action tracker (legacy markov-chain-tracker parity).
 * Client-only — summarizes panel transitions and workspace actions in Voice lab.
 */

const STORAGE_KEY = 'bs-portal-markov-v2';
const LEGACY_STORAGE_KEY = 'bs-portal-markov-v1';
const MAX_CHAIN = 300;
const DEFAULT_PANEL = 'dashboard';

type TransitionMap = Record<string, Record<string, number>>;

export type PortalChainEntry = {
  state: string;
  from?: string;
  timestamp: number;
  type: 'panel' | 'action' | 'error';
  panel?: string;
  error?: string;
};

export type PortalFunctionUsage = {
  count: number;
  errors: number;
  lastCall: number | null;
};

export type PortalErrorEntry = {
  functionName: string;
  message: string;
  timestamp: number;
  panel: string;
  state: string;
};

interface MarkovState {
  current: string;
  chain: PortalChainEntry[];
  transitions: TransitionMap;
  errorTransitions: Record<string, number>;
  functionUsage: Record<string, PortalFunctionUsage>;
  errorLog: PortalErrorEntry[];
  startTime: number;
}

function normalizePanelId(panelId: string): string {
  const next = panelId.replace(/-panel$/, '') || panelId;
  return next === 'overview' ? DEFAULT_PANEL : next;
}

function emptyState(): MarkovState {
  const now = Date.now();
  return {
    current: DEFAULT_PANEL,
    chain: [{ state: DEFAULT_PANEL, timestamp: now, type: 'panel', panel: DEFAULT_PANEL }],
    transitions: {},
    errorTransitions: {},
    functionUsage: {},
    errorLog: [],
    startTime: now,
  };
}

function migrateLegacyV1(): MarkovState | null {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      current?: string;
      chain?: string[];
      transitions?: TransitionMap;
    };
    const state = emptyState();
    state.current = normalizePanelId(parsed.current || DEFAULT_PANEL);
    if (Array.isArray(parsed.chain)) {
      for (const step of parsed.chain) {
        const panel = normalizePanelId(step);
        state.chain.push({ state: panel, timestamp: Date.now(), type: 'panel', panel });
      }
    }
    state.transitions = parsed.transitions || {};
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return state;
  } catch {
    return null;
  }
}

function loadState(): MarkovState {
  try {
    const migrated = migrateLegacyV1();
    if (migrated) {
      saveState(migrated);
      return migrated;
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as MarkovState;
    return {
      current: normalizePanelId(parsed.current || DEFAULT_PANEL),
      chain: Array.isArray(parsed.chain) ? parsed.chain : emptyState().chain,
      transitions: parsed.transitions || {},
      errorTransitions: parsed.errorTransitions || {},
      functionUsage: parsed.functionUsage || {},
      errorLog: Array.isArray(parsed.errorLog) ? parsed.errorLog : [],
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

function pushChain(state: MarkovState, entry: PortalChainEntry): void {
  state.chain.push(entry);
  if (state.chain.length > MAX_CHAIN) {
    state.chain = state.chain.slice(-MAX_CHAIN);
  }
}

function getCurrentPanel(): string {
  if (typeof document === 'undefined') return DEFAULT_PANEL;
  const active = document.querySelector('.portal-panel.active, .portal-panel[style*="display: block"]');
  const id = active?.id?.replace(/-panel$/, '');
  return id ? normalizePanelId(id) : DEFAULT_PANEL;
}

export function trackPortalPanel(panelId: string): void {
  const next = normalizePanelId(panelId);
  const state = loadState();
  const from = state.current;
  if (from === next) return;

  state.current = next;
  pushChain(state, {
    state: next,
    from,
    timestamp: Date.now(),
    type: 'panel',
    panel: next,
  });
  recordTransition(state, from, next);
  saveState(state);
}

export function registerPortalFunction(functionName: string): void {
  const state = loadState();
  if (!state.functionUsage[functionName]) {
    state.functionUsage[functionName] = { count: 0, errors: 0, lastCall: null };
    saveState(state);
  }
}

export function trackPortalAction(functionName: string, context: { panel?: string } = {}): void {
  const state = loadState();
  const panel = context.panel ?? getCurrentPanel();
  const from = state.current;

  if (!state.functionUsage[functionName]) {
    state.functionUsage[functionName] = { count: 0, errors: 0, lastCall: null };
  }
  const usage = state.functionUsage[functionName];
  usage.count += 1;
  usage.lastCall = Date.now();

  pushChain(state, {
    state: functionName,
    from,
    timestamp: Date.now(),
    type: 'action',
    panel,
  });
  recordTransition(state, from, functionName);
  state.current = functionName;
  saveState(state);
}

export function trackPortalError(
  functionName: string,
  error: unknown,
  context: { panel?: string } = {},
): void {
  const state = loadState();
  const panel = context.panel ?? getCurrentPanel();
  const message = error instanceof Error ? error.message : String(error);

  if (!state.functionUsage[functionName]) {
    state.functionUsage[functionName] = { count: 0, errors: 0, lastCall: null };
  }
  state.functionUsage[functionName].errors += 1;

  const from = state.current;
  const to = `error:${functionName}`;
  const errorKey = `${from} → ${to}`;
  state.errorTransitions[errorKey] = (state.errorTransitions[errorKey] ?? 0) + 1;

  const entry: PortalErrorEntry = {
    functionName,
    message,
    timestamp: Date.now(),
    panel,
    state: state.current,
  };
  state.errorLog.push(entry);
  if (state.errorLog.length > 100) {
    state.errorLog = state.errorLog.slice(-100);
  }

  pushChain(state, {
    state: `error:${functionName}`,
    from: state.current,
    timestamp: Date.now(),
    type: 'error',
    panel,
    error: message,
  });
  recordTransition(state, state.current, `error:${functionName}`);
  saveState(state);
}

/** Wrap async workspace handlers for Markov action + error tracking. */
export function wrapPortalAction<T extends (...args: never[]) => unknown>(
  functionName: string,
  fn: T,
): T {
  registerPortalFunction(functionName);
  return ((...args: Parameters<T>) => {
    trackPortalAction(functionName);
    try {
      const result = fn(...args);
      if (result instanceof Promise) {
        return result.catch((error: unknown) => {
          trackPortalError(functionName, error);
          throw error;
        });
      }
      return result;
    } catch (error) {
      trackPortalError(functionName, error);
      throw error;
    }
  }) as T;
}

function topTransitions(transitions: TransitionMap, limit = 12): string[] {
  const pairs: Array<{ from: string; to: string; count: number }> = [];
  for (const [from, toMap] of Object.entries(transitions)) {
    for (const [to, count] of Object.entries(toMap)) {
      pairs.push({ from, to, count });
    }
  }
  pairs.sort((a, b) => b.count - a.count);
  if (!pairs.length) return ['  (navigate the workspace to collect flow data)'];
  return pairs.slice(0, limit).map((row) => `  ${row.from} → ${row.to}: ${row.count}`);
}

export function getPortalMarkovAnalysisReport(): {
  summary: Record<string, string | number>;
  unusedFunctions: string[];
  functionsWithErrors: Array<{ name: string; count: number; errors: number; errorRate: string }>;
  errorProneTransitions: Array<{ transition: string; errorCount: number }>;
  recentErrors: PortalErrorEntry[];
} {
  const state = loadState();
  const registered = Object.keys(state.functionUsage);
  const unusedFunctions = registered.filter((name) => state.functionUsage[name].count === 0);
  const functionsWithErrors = registered
    .filter((name) => state.functionUsage[name].errors > 0)
    .map((name) => {
      const usage = state.functionUsage[name];
      const rate = usage.count > 0 ? ((usage.errors / usage.count) * 100).toFixed(1) : '100.0';
      return { name, count: usage.count, errors: usage.errors, errorRate: `${rate}%` };
    })
    .sort((a, b) => b.errors - a.errors);

  const errorProneTransitions = Object.entries(state.errorTransitions)
    .map(([transition, errorCount]) => ({ transition, errorCount }))
    .sort((a, b) => b.errorCount - a.errorCount);

  const totalCalls = registered.reduce((sum, name) => sum + state.functionUsage[name].count, 0);
  const totalErrors = state.errorLog.length;
  const sessionSeconds = Math.round((Date.now() - state.startTime) / 1000);

  return {
    summary: {
      currentPanel: state.current,
      chainLength: state.chain.length,
      registeredFunctions: registered.length,
      totalCalls,
      totalErrors,
      errorRate: totalCalls > 0 ? `${((totalErrors / totalCalls) * 100).toFixed(1)}%` : '0%',
      sessionSeconds,
    },
    unusedFunctions,
    functionsWithErrors,
    errorProneTransitions,
    recentErrors: state.errorLog.slice(-8),
  };
}

export function getPortalMarkovSummary(): string {
  const state = loadState();
  const report = getPortalMarkovAnalysisReport();
  const lines: string[] = [
    `Current panel: ${state.current}`,
    `Steps recorded: ${state.chain.length}`,
    `Actions tracked: ${report.summary.totalCalls}`,
    `Errors: ${report.summary.totalErrors}`,
    '',
    'Top transitions:',
    ...topTransitions(state.transitions),
  ];

  const recent = state.chain.slice(-8).map((e) => e.state);
  lines.push('', `Recent path: ${recent.join(' → ')}`);
  return lines.join('\n');
}

export function debugFromPortalMarkov(): string {
  const report = getPortalMarkovAnalysisReport();
  const lines: string[] = [
    '=== Portal flow debug ===',
    `Session: ${report.summary.sessionSeconds}s`,
    `Chain length: ${report.summary.chainLength}`,
    `Registered functions: ${report.summary.registeredFunctions}`,
    `Total action calls: ${report.summary.totalCalls}`,
    `Error rate: ${report.summary.errorRate}`,
    '',
  ];

  if (report.unusedFunctions.length) {
    lines.push('Registered but never called:', ...report.unusedFunctions.map((n) => `  • ${n}`), '');
  } else {
    lines.push('All registered functions have been called at least once.', '');
  }

  if (report.functionsWithErrors.length) {
    lines.push('Functions with errors:');
    for (const row of report.functionsWithErrors.slice(0, 10)) {
      lines.push(`  • ${row.name}: ${row.errors} error(s) / ${row.count} call(s) (${row.errorRate})`);
    }
    lines.push('');
  } else {
    lines.push('No function errors recorded.', '');
  }

  if (report.errorProneTransitions.length) {
    lines.push('Error-prone transitions:');
    for (const row of report.errorProneTransitions.slice(0, 8)) {
      lines.push(`  • ${row.transition}: ${row.errorCount} error(s)`);
    }
    lines.push('');
  }

  if (report.recentErrors.length) {
    lines.push('Recent errors:');
    for (const err of report.recentErrors) {
      lines.push(`  • ${err.functionName} @ ${err.panel}: ${err.message}`);
    }
  } else {
    lines.push('No recent errors.');
  }

  return lines.join('\n');
}

export function buildMarkovExtrapolationPrompt(): string {
  const state = loadState();
  const report = getPortalMarkovAnalysisReport();
  const lines: string[] = [
    'Markov Chain Analysis Summary for Brisbane Servers portal debugging:',
    '',
    `Current panel/state: ${state.current}`,
    `Chain length: ${state.chain.length}`,
    `Registered functions: ${report.summary.registeredFunctions}`,
    `Total action calls: ${report.summary.totalCalls}`,
    `Total errors: ${report.summary.totalErrors}`,
    `Error rate: ${report.summary.errorRate}`,
    '',
  ];

  if (report.functionsWithErrors.length) {
    lines.push('Functions with errors:');
    for (const row of report.functionsWithErrors.slice(0, 6)) {
      lines.push(`- ${row.name}: ${row.errors} errors (${row.errorRate})`);
    }
    lines.push('');
  }

  if (report.errorProneTransitions.length) {
    lines.push('Error-prone transitions:');
    for (const row of report.errorProneTransitions.slice(0, 6)) {
      lines.push(`- ${row.transition}: ${row.errorCount} error(s)`);
    }
    lines.push('');
  }

  if (report.unusedFunctions.length) {
    lines.push('Registered but unused functions:');
    for (const name of report.unusedFunctions.slice(0, 8)) {
      lines.push(`- ${name}`);
    }
    lines.push('');
  }

  const recentPath = state.chain.slice(-12).map((e) => e.state).join(' → ');
  lines.push(`Recent navigation path: ${recentPath}`);
  lines.push('');
  lines.push(
    'Based on this portal flow data, list likely UX wiring issues, missing error handlers, and suggested fixes for the account workspace. Be specific and actionable.'
  );
  return lines.join('\n');
}

export async function extrapolatePortalMarkovIssues(
  apiPost: (path: string, body: unknown) => Promise<{ ok: boolean; text?: string; error?: string }>
): Promise<string> {
  const prompt = buildMarkovExtrapolationPrompt();
  const result = await apiPost('/voice/extrapolate', {
    text: prompt,
    options: { expansionLevel: 'moderate', addExamples: true, addDetails: true },
  });
  if (!result.ok || !result.text) {
    return result.error || 'Extrapolation failed.';
  }
  return result.text;
}

export function renderPortalMarkovIntoVoiceLab(): void {
  if (typeof document === 'undefined') return;
  const summaryEl = document.getElementById('voice-lab-markov-summary');
  if (summaryEl) summaryEl.textContent = getPortalMarkovSummary();
  const debugEl = document.getElementById('voice-lab-markov-debug');
  if (debugEl && !debugEl.dataset.userTriggered) {
    debugEl.textContent = 'Click “Debug insights” to analyze function errors and unused registrations.';
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
    ...state,
    summary: getPortalMarkovSummary(),
    analysis: getPortalMarkovAnalysisReport(),
    debug: debugFromPortalMarkov(),
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
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  if (typeof document !== 'undefined') {
    const debugEl = document.getElementById('voice-lab-markov-debug');
    if (debugEl) delete debugEl.dataset.userTriggered;
  }
  renderPortalMarkovIntoVoiceLab();
}

/** Register core workspace loaders for debug “unused function” reporting. */
export function registerPortalWorkspaceFunctions(): void {
  const names = [
    'loadDashboardData',
    'loadResources',
    'loadProfiles',
    'loadAnalytics',
    'loadVoiceMap',
    'loadLibraryGrowthPanel',
    'loadModerationQueue',
    'loadSiteReviewSections',
    'loadAdminUsersPanel',
    'loadAdminOpsPanel',
    'saveResource',
    'generateResource',
    'uploadResource',
    'improveResource',
    'deleteResource',
    'restoreResource',
    'runLibraryGrowthCycle',
    'bootstrapVoiceCorpus',
    'moderateContributionApprove',
    'moderateContributionReject',
    'startBillingCheckout',
    'grantAiUsageUnits',
    'extrapolateMarkovIssues',
  ];
  for (const name of names) registerPortalFunction(name);
}
