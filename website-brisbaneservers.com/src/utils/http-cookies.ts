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

export function authTokenSetCookie(token: string, maxAgeSeconds: number, request: Request): string {
  const secure = useSecureCookie(request);
  const parts = [
    `authToken=${token}`,
    'HttpOnly',
    'SameSite=Strict',
    'Path=/',
    `Max-Age=${maxAgeSeconds}`
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

/** Clear auth cookie (same flags as set). */
export function authTokenClearCookie(request: Request): string {
  const secure = useSecureCookie(request);
  const parts = ['authToken=', 'HttpOnly', 'SameSite=Strict', 'Path=/', 'Max-Age=0'];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}
