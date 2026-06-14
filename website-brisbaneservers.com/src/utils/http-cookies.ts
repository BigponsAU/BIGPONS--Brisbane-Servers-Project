/**
 * HttpOnly auth cookie helpers — Secure on HTTPS (and in production when served over HTTPS).
 */

function useSecureCookie(request: Request): boolean {
  try {
    const { protocol } = new URL(request.url);
    if (protocol === 'https:') return true;
  } catch {
    /* ignore */
  }
  return process.env.NODE_ENV === 'production';
}

/** Same-site subdomain (api.brisbaneservers.com) can use Lax; cross-site hosts need None. */
function authCookieSameSite(request: Request): 'Strict' | 'Lax' | 'None' {
  try {
    const { hostname } = new URL(request.url);
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'Lax';
    }
    if (hostname === 'brisbaneservers.com' || hostname.endsWith('.brisbaneservers.com')) {
      return 'Lax';
    }
    if (process.env.NODE_ENV === 'production') {
      return 'None';
    }
  } catch {
    /* ignore */
  }
  return 'Strict';
}

function authCookieDomain(request: Request): string | null {
  try {
    const { hostname } = new URL(request.url);
    if (hostname === 'brisbaneservers.com' || hostname.endsWith('.brisbaneservers.com')) {
      return '.brisbaneservers.com';
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function authTokenSetCookie(token: string, maxAgeSeconds: number, request: Request): string {
  const secure = useSecureCookie(request);
  const sameSite = authCookieSameSite(request);
  const domain = authCookieDomain(request);
  const parts = [
    `authToken=${token}`,
    'HttpOnly',
    `SameSite=${sameSite}`,
    'Path=/',
    `Max-Age=${maxAgeSeconds}`
  ];
  if (domain) parts.push(`Domain=${domain}`);
  if (secure || sameSite === 'None') parts.push('Secure');
  return parts.join('; ');
}

/** Clear auth cookie (same flags as set). */
export function authTokenClearCookie(request: Request): string {
  const secure = useSecureCookie(request);
  const sameSite = authCookieSameSite(request);
  const domain = authCookieDomain(request);
  const parts = ['authToken=', 'HttpOnly', `SameSite=${sameSite}`, 'Path=/', 'Max-Age=0'];
  if (domain) parts.push(`Domain=${domain}`);
  if (secure || sameSite === 'None') parts.push('Secure');
  return parts.join('; ');
}

const OAUTH_STATE_COOKIE = 'oauth_state';
const OAUTH_STATE_MAX_AGE = 600;

/** Cookie-backed OAuth state (Workers have no shared in-memory store between requests). */
export function oauthStateSetCookie(state: string, request: Request): string {
  const secure = useSecureCookie(request);
  const sameSite = authCookieSameSite(request);
  const domain = authCookieDomain(request);
  const parts = [
    `${OAUTH_STATE_COOKIE}=${encodeURIComponent(state)}`,
    'HttpOnly',
    `SameSite=${sameSite}`,
    'Path=/api/auth/oauth',
    `Max-Age=${OAUTH_STATE_MAX_AGE}`,
  ];
  if (domain) parts.push(`Domain=${domain}`);
  if (secure || sameSite === 'None') parts.push('Secure');
  return parts.join('; ');
}

export function oauthStateClearCookie(request: Request): string {
  const secure = useSecureCookie(request);
  const sameSite = authCookieSameSite(request);
  const domain = authCookieDomain(request);
  const parts = [
    `${OAUTH_STATE_COOKIE}=`,
    'HttpOnly',
    `SameSite=${sameSite}`,
    'Path=/api/auth/oauth',
    'Max-Age=0',
  ];
  if (domain) parts.push(`Domain=${domain}`);
  if (secure || sameSite === 'None') parts.push('Secure');
  return parts.join('; ');
}

export function readOAuthStateCookie(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === OAUTH_STATE_COOKIE && rest.length) {
      try {
        return decodeURIComponent(rest.join('='));
      } catch {
        return rest.join('=');
      }
    }
  }
  return null;
}
