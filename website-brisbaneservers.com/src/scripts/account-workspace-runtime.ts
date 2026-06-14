// @ts-nocheck — shared mutable state between account-auth and account-workspace-app chunks.
import {
  workspaceFetch,
  clearLegacyAuthTokenStorage,
  getInMemorySessionToken,
  persistSessionToken,
  clearPersistedSession,
  clearStaleBearerForCookieAuth,
  usesHttpOnlyCookieAuth,
  PRODUCTION_API_CUSTOM_DOMAIN,
  isUsableAbsoluteApiBase,
} from '../lib/client-api';

export const API_PROBE_TIMEOUT_MS = 8000;
export const API_PROBE_OVERALL_MS = 12000;
export const PAGE_LOAD_PROBE_OVERALL_MS = 3500;
export const API_WAKE_ATTEMPTS = 4;
export const LOGIN_TIMEOUT_MS = 45000;

export interface AccountWorkspaceBootConfig {
  publicApiBaseUrl: string;
  accountPath: string;
  pageTitleSignedOut: string;
  pageTitleSignedIn: string;
  initialVerifyToken: string;
  initialResetToken: string;
}

export type AuthBannerVariant = 'success' | 'error' | 'info' | 'warning';

export interface PortalRuntime {
  config: AccountWorkspaceBootConfig;
  voiceApiUrl: string;
  sessionActive: boolean;
  pendingResetToken: string | null;
  accountPath: string;
  verifyToken: string;
  pageTitleSignedOut: string;
  pageTitleSignedIn: string;
  /** Set when dashboard chunk has mounted its showDashboard implementation. */
  showDashboardImpl: ((user: unknown) => void) | null;
}

let portalRuntime: PortalRuntime | null = null;

export function initPortalRuntime(config: AccountWorkspaceBootConfig): PortalRuntime {
  clearLegacyAuthTokenStorage();
  const voiceApiUrl = (config.publicApiBaseUrl || '').replace(/\/+$/, '');
  clearStaleBearerForCookieAuth(voiceApiUrl);
  portalRuntime = {
    config,
    voiceApiUrl,
    sessionActive: false,
    pendingResetToken: config.initialResetToken || null,
    accountPath: config.accountPath,
    verifyToken: config.initialVerifyToken,
    pageTitleSignedOut: config.pageTitleSignedOut,
    pageTitleSignedIn: config.pageTitleSignedIn,
    showDashboardImpl: null,
  };
  return portalRuntime;
}

export function getPortalRuntime(): PortalRuntime {
  if (!portalRuntime) {
    throw new Error('Portal runtime not initialized');
  }
  return portalRuntime;
}

export function tryGetPortalRuntime(): PortalRuntime | null {
  return portalRuntime;
}

export function applyLoginSession(token: string | null | undefined): void {
  const rt = getPortalRuntime();
  if (usesHttpOnlyCookieAuth(rt.voiceApiUrl)) {
    // HttpOnly cookie is authoritative — never send a stale bearer that overrides it server-side.
    clearStaleBearerForCookieAuth(rt.voiceApiUrl);
    rt.sessionActive = true;
    return;
  }
  if (token?.trim()) {
    persistSessionToken(token, rt.voiceApiUrl);
    rt.sessionActive = true;
  }
}

export function applySessionToken(token: string | null | undefined): void {
  if (typeof token === 'string' && token.trim()) {
    applyLoginSession(token);
    return;
  }
  if (token === 'cookie' || token === 'session') {
    persistSessionToken(null, getPortalRuntime().voiceApiUrl);
    getPortalRuntime().sessionActive = true;
  }
}

export function clearSessionToken(): void {
  clearPersistedSession();
  const rt = tryGetPortalRuntime();
  if (rt) rt.sessionActive = false;
}

export function hasWorkspaceSession(): boolean {
  return Boolean(tryGetPortalRuntime()?.sessionActive);
}

/** Central handler when API rejects the session — avoids raw "Invalid or expired token" all over the UI. */
export async function handleWorkspaceSessionExpired(message?: string): Promise<void> {
  const rt = tryGetPortalRuntime();
  clearPersistedSession();
  if (rt) rt.sessionActive = false;

  try {
    if (rt?.voiceApiUrl && usesHttpOnlyCookieAuth(rt.voiceApiUrl)) {
      await workspaceFetch(`${rt.voiceApiUrl}/auth/logout`, { method: 'POST' });
    }
  } catch {
    /* best-effort */
  }

  const bridge = (window as Window & { __portalBridge?: Record<string, unknown> }).__portalBridge;
  bridge?.showLogin?.();
  showAuthBanner(message ?? 'Your session expired. Please sign in again.', 'warning');
}

export function syncAccountPageTitle(signedIn: boolean): void {
  const rt = getPortalRuntime();
  const base = signedIn ? rt.pageTitleSignedIn : rt.pageTitleSignedOut;
  document.title = base.includes('| Brisbane Servers') ? base : `${base} | Brisbane Servers`;
}

export function setMessage(id: string, message: string, isError = false): void {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message;
  el.classList.toggle('show', Boolean(message) && el.classList.contains('error-message'));
  (el as HTMLElement).style.color = isError ? 'var(--portal-error-dark)' : '';
}

export function showAuthBanner(message: string, variant: AuthBannerVariant = 'info'): void {
  const banner = document.getElementById('auth-status-banner') as HTMLElement | null;
  if (!banner) return;
  banner.textContent = message;
  banner.style.display = 'block';
  banner.classList.remove(
    'auth-status-banner--success',
    'auth-status-banner--error',
    'auth-status-banner--info',
    'auth-status-banner--warning',
  );
  banner.classList.add(`auth-status-banner--${variant}`);
  banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

export function setResendVerificationVisibility(show: boolean): void {
  const resendForm = document.getElementById('resend-verification-form') as HTMLElement | null;
  if (!resendForm) return;
  resendForm.style.display = show ? 'flex' : 'none';
}

export function maybeAppendPreviewLink(message: string, previewUrl?: string): string {
  if (!previewUrl) return message;
  return `${message} Preview link: ${previewUrl}`;
}

export async function isApiBaseHealthy(baseUrl: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), API_PROBE_TIMEOUT_MS);
    const response = await workspaceFetch(`${baseUrl.replace(/\/+$/, '')}/health`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    window.clearTimeout(timeout);
    if (!response.ok) return false;
    const contentType = response.headers.get('content-type') ?? '';
    return contentType.includes('application/json');
  } catch {
    return false;
  }
}

export function isProductionSiteHost(): boolean {
  const host = window.location.hostname;
  return (
    host === 'brisbaneservers.com'
    || host === 'www.brisbaneservers.com'
    || host.endsWith('.brisbaneservers.com')
    || host.endsWith('.pages.dev')
  );
}

export async function ensureReachableApiBase(options?: { fast?: boolean }): Promise<void> {
  const rt = getPortalRuntime();
  if (isUsableAbsoluteApiBase(rt.voiceApiUrl)) {
    clearStaleBearerForCookieAuth(rt.voiceApiUrl);
    return;
  }

  const configuredBase = rt.voiceApiUrl || '/api';
  const candidates: string[] = [];
  const isRelativeConfigured = !/^https?:\/\//i.test(configuredBase);
  const isProdSite = isProductionSiteHost();

  if (import.meta.env.PROD && (isRelativeConfigured || isProdSite)) {
    candidates.push(PRODUCTION_API_CUSTOM_DOMAIN);
  }
  if (configuredBase && isUsableAbsoluteApiBase(configuredBase)) {
    candidates.push(configuredBase);
  }

  const usableCandidates = [...new Set(
    candidates.map((base) => base.replace(/\/+$/, '')).filter(Boolean),
  )];

  const probe = async (baseUrl: string): Promise<string | null> => {
    if (await isApiBaseHealthy(baseUrl)) return baseUrl;
    return null;
  };

  const overallTimeout = new Promise<null>((resolve) => {
    window.setTimeout(() => resolve(null), options?.fast ? PAGE_LOAD_PROBE_OVERALL_MS : API_PROBE_OVERALL_MS);
  });

  const winner = await Promise.race([
    Promise.any(usableCandidates.map((base) => probe(base))).catch(() => null),
    overallTimeout,
  ]);

  if (winner && rt.voiceApiUrl !== winner) {
    rt.voiceApiUrl = winner;
    clearStaleBearerForCookieAuth(winner);
    syncPortalBridgeApiUrl();
  } else if (!winner && isProdSite && !/^https?:\/\//i.test(rt.voiceApiUrl)) {
    rt.voiceApiUrl = PRODUCTION_API_CUSTOM_DOMAIN;
    clearStaleBearerForCookieAuth(rt.voiceApiUrl);
    syncPortalBridgeApiUrl();
  }
}

export async function wakeApiBeforeAuth(): Promise<void> {
  const rt = getPortalRuntime();
  await ensureReachableApiBase();
  for (let attempt = 0; attempt < API_WAKE_ATTEMPTS; attempt += 1) {
    if (await isApiBaseHealthy(rt.voiceApiUrl)) {
      return;
    }
    if (attempt < API_WAKE_ATTEMPTS - 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 2000 * (attempt + 1)));
    }
  }
}

export function syncPortalAccountContext(): void {
  const rt = getPortalRuntime();
  const bridge = (window as Window & { __portalBridge?: Record<string, unknown> }).__portalBridge;
  (window as Window & { __portalAccountCtx?: Record<string, unknown> }).__portalAccountCtx = {
    apiBaseUrl: rt.voiceApiUrl,
    getAuthToken: () => getInMemorySessionToken(),
    hasWorkspaceSession: () => hasWorkspaceSession(),
    setAuthToken: (token: string | null) => {
      if (!token) {
        clearSessionToken();
        return;
      }
      applySessionToken(token);
    },
    showDashboard: (user: unknown) => bridge?.showDashboard?.(user),
    showLogin: () => bridge?.showLogin?.(),
    showAuthBanner: (message: string, isError?: boolean) => bridge?.showAuthBanner?.(message, isError),
    navigateToPanel: (panel: string) => (window as Window & { navigateToPanel?: (p: string) => void }).navigateToPanel?.(panel),
    selectResource: (id: string) => (window as Window & { selectResource?: (id: string) => void }).selectResource?.(id),
  };
}

function syncPortalBridgeApiUrl(): void {
  const bridge = (window as Window & { __portalBridge?: Record<string, unknown> }).__portalBridge;
  if (bridge) {
    bridge.apiBaseUrl = getPortalRuntime().voiceApiUrl;
  }
  syncPortalAccountContext();
}

export function publishPortalBridge(partial: Record<string, unknown>): void {
  const existing = (window as Window & { __portalBridge?: Record<string, unknown> }).__portalBridge ?? {};
  (window as Window & { __portalBridge?: Record<string, unknown> }).__portalBridge = {
    ...existing,
    ...partial,
    apiBaseUrl: getPortalRuntime().voiceApiUrl,
    getAuthToken: () => getInMemorySessionToken(),
    hasWorkspaceSession: () => hasWorkspaceSession(),
    setAuthToken: (token: string | null) => {
      if (!token) {
        clearSessionToken();
        return;
      }
      applySessionToken(token);
    },
  };
  syncPortalAccountContext();
}
