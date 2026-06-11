import type { AuthUser } from './types';
import { getSessionUser, withSql } from './db';
import type { HyperdriveBinding } from './db';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export function getTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === 'authToken' && rest.length) {
      return rest.join('=');
    }
  }
  return null;
}

export async function requireAuth(
  request: Request,
  hyperdrive: HyperdriveBinding
): Promise<{ user: AuthUser } | { error: string; code: string }> {
  const token = getTokenFromRequest(request);
  if (!token) {
    return { error: 'Authentication required', code: 'UNAUTHORIZED' };
  }

  const user = await withSql(hyperdrive, (sql) => getSessionUser(sql, token));
  if (!user) {
    return { error: 'Invalid or expired token', code: 'INVALID_TOKEN' };
  }
  return { user };
}

export function getClientKey(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}
