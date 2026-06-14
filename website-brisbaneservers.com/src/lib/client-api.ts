/**
 * Browser API client — security model:
 * - Never store auth tokens in localStorage (XSS persistence risk).
 * - Prefer HttpOnly cookies when API is on *.brisbaneservers.com (same-site family).
 * - sessionStorage fallback only for cross-origin API hosts (e.g. Render) where HttpOnly cookies cannot be shared with the Pages origin.
 * - Invalid sessions cleared on failed /auth/me (see account-auth).
 */

let inMemorySessionToken: string | null = null;

export function setInMemorySessionToken(token: string | null): void {
  inMemorySessionToken = token?.trim() ? token.trim() : null;
}

export function getInMemorySessionToken(): string | null {
  return inMemorySessionToken;
}

export function clearLegacyAuthTokenStorage(): void {
  try {
    localStorage.removeItem('authToken');
  } catch {
    /* ignore */
  }
}

const SESSION_STORAGE_KEY = 'bsAccountSession';

export const PRODUCTION_API_URL = 'https://brisbane-servers-api.onrender.com/api';
export const PRODUCTION_API_CUSTOM_DOMAIN = 'https://api.brisbaneservers.com/api';

export function isUsableAbsoluteApiBase(value: string): boolean {
  if (!/^https?:\/\//i.test(value)) return false;
  if (/\/api1(\/|$)/i.test(value) || /api1\./i.test(value)) return false;
  return true;
}

export function isBrisbaneServersApiHost(apiBaseUrl: string): boolean {
  try {
    const normalized = apiBaseUrl.replace(/\/+$/, '');
    const host = new URL(normalized.startsWith('http') ? normalized : `https://${normalized}`).hostname;
    return host === 'brisbaneservers.com' || host.endsWith('.brisbaneservers.com');
  } catch {
    return false;
  }
}

/** HttpOnly cookie auth — API on *.brisbaneservers.com; browser sends cookie via credentials: include. */
export function usesHttpOnlyCookieAuth(apiBaseUrl: string): boolean {
  return isBrisbaneServersApiHost(apiBaseUrl);
}

/** Tab-scoped bearer fallback for cross-origin API (Render hostname). */
export function usesSessionStorageAuth(apiBaseUrl: string): boolean {
  return !usesHttpOnlyCookieAuth(apiBaseUrl);
}

export function restorePersistedSessionToken(apiBaseUrl?: string): boolean {
  if (apiBaseUrl && usesHttpOnlyCookieAuth(apiBaseUrl)) {
    return false;
  }
  try {
    const token = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (token?.trim()) {
      setInMemorySessionToken(token.trim());
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

export function persistSessionToken(token: string | null | undefined, apiBaseUrl?: string): void {
  if (!token?.trim()) {
    clearPersistedSession();
    return;
  }

  if (apiBaseUrl && usesHttpOnlyCookieAuth(apiBaseUrl)) {
    setInMemorySessionToken(null);
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    return;
  }

  setInMemorySessionToken(token.trim());
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, token.trim());
  } catch {
    /* ignore */
  }
}

export function clearPersistedSession(): void {
  setInMemorySessionToken(null);
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function workspaceFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (inMemorySessionToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${inMemorySessionToken}`);
  }
  return fetch(input, {
    ...init,
    credentials: 'include',
    headers,
  });
}

export async function hasActiveSession(apiBaseUrl: string): Promise<boolean> {
  try {
    const response = await workspaceFetch(`${apiBaseUrl.replace(/\/$/, '')}/auth/me`);
    return response.ok;
  } catch {
    return false;
  }
}

const PRODUCTION_API_FALLBACKS = [PRODUCTION_API_CUSTOM_DOMAIN] as const;

/** Resolve API base for header nav + account page (matches workspace failover). */
export function resolveNavApiBaseUrl(): string {
  const root = document.getElementById('admin-portal');
  const configured = root?.dataset?.publicApiBaseUrl?.trim() ?? '';
  if (configured && isUsableAbsoluteApiBase(configured)) {
    return configured.replace(/\/+$/, '');
  }

  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const isProdSite = host === 'brisbaneservers.com' || host.endsWith('.pages.dev');
  if (isProdSite) {
    return PRODUCTION_API_CUSTOM_DOMAIN.replace(/\/+$/, '');
  }

  return (configured || '/api').replace(/\/+$/, '');
}

function setAccountLinkLabel(anchor: HTMLAnchorElement, label: string, ariaLabel: string): void {
  anchor.href = '/account/';
  anchor.setAttribute('aria-label', ariaLabel);
  const semantic = anchor.querySelector('.semantic-text');
  if (semantic) {
    semantic.textContent = label;
  } else {
    anchor.textContent = label;
  }
}

export function setAccountNavSignedIn(signedIn: boolean): void {
  const label = signedIn ? 'Workspace' : 'Sign in';
  const ariaLabel = signedIn ? 'Open your account workspace' : 'Sign in to your account';
  document.querySelectorAll('[data-account-link="true"]').forEach((link) => {
    setAccountLinkLabel(link as HTMLAnchorElement, label, ariaLabel);
    link.classList.toggle('nav-account-cta--signed-in', signedIn);
  });
}
