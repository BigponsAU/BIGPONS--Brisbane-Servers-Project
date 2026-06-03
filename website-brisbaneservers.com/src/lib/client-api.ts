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
