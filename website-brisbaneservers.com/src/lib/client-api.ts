/**
 * Browser API client — HttpOnly cookie when same-origin; in-memory Bearer for cross-subdomain API.
 * Never persist auth tokens in localStorage.
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

/** Tab-scoped session for cross-origin API (Render). HttpOnly cookie preferred when API is on *.brisbaneservers.com. */
export function restorePersistedSessionToken(): boolean {
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

export function persistSessionToken(token: string | null | undefined): void {
  if (!token?.trim()) {
    clearPersistedSession();
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

const PRODUCTION_API_FALLBACKS = [
  'https://api.brisbaneservers.com/api',
  'https://brisbane-servers-api.onrender.com/api',
] as const;

function isUsableAbsoluteApiBase(value: string): boolean {
  if (!/^https?:\/\//i.test(value)) return false;
  if (/\/api1(\/|$)/i.test(value) || /api1\./i.test(value)) return false;
  return true;
}

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
    return PRODUCTION_API_FALLBACKS[0];
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
