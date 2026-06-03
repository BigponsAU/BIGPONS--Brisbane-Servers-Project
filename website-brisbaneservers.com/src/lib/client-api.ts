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
  setInMemorySessionToken(null);
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

export function setAccountNavSignedIn(signedIn: boolean): void {
  document.querySelectorAll('[data-account-link="true"]').forEach((link) => {
    const anchor = link as HTMLAnchorElement;
    anchor.href = '/account/';
    anchor.textContent = signedIn ? 'Workspace' : 'Sign in';
    anchor.setAttribute(
      'aria-label',
      signedIn ? 'Open your account workspace' : 'Sign in to your account'
    );
    anchor.classList.toggle('nav-account-cta--signed-in', signedIn);
  });
}
