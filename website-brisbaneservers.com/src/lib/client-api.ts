/**
 * Browser API client — HttpOnly session cookie (credentials: include).
 * Do not persist auth tokens in localStorage.
 */

export function clearLegacyAuthTokenStorage(): void {
  try {
    localStorage.removeItem('authToken');
  } catch {
    /* ignore */
  }
}

export function workspaceFetch(input: string, init: RequestInit = {}): Promise<Response> {
  return fetch(input, {
    ...init,
    credentials: 'include',
    headers: new Headers(init.headers),
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
