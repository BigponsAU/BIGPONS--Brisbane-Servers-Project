export function authTokenSetCookie(token: string, maxAgeSeconds: number, request: Request): string {
  const secure = useSecureCookie(request);
  const sameSite = authCookieSameSite(request);
  const domain = authCookieDomain(request);
  const parts = [
    `authToken=${token}`,
    'HttpOnly',
    `SameSite=${sameSite}`,
    'Path=/',
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (domain) parts.push(`Domain=${domain}`);
  if (secure || sameSite === 'None') parts.push('Secure');
  return parts.join('; ');
}

export function authTokenClearCookie(request: Request): string {
  const secure = useSecureCookie(request);
  const sameSite = authCookieSameSite(request);
  const domain = authCookieDomain(request);
  const parts = ['authToken=', 'HttpOnly', `SameSite=${sameSite}`, 'Path=/', 'Max-Age=0'];
  if (domain) parts.push(`Domain=${domain}`);
  if (secure || sameSite === 'None') parts.push('Secure');
  return parts.join('; ');
}

function useSecureCookie(request: Request): boolean {
  try {
    return new URL(request.url).protocol === 'https:';
  } catch {
    return true;
  }
}

function authCookieSameSite(request: Request): 'Strict' | 'Lax' | 'None' {
  try {
    const { hostname } = new URL(request.url);
    if (hostname === 'localhost' || hostname === '127.0.0.1') return 'Lax';
    if (hostname === 'brisbaneservers.com' || hostname.endsWith('.brisbaneservers.com')) return 'Lax';
  } catch {
    /* ignore */
  }
  return 'Lax';
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
