#!/usr/bin/env npx tsx
/**
 * Production auth flow smoke checks (register → verify → login → session → logout).
 *
 * Usage:
 *   npm run verify:production-auth
 *   npm run verify:production-auth -- --api https://api.brisbaneservers.com
 *
 * Requires NEON_DATABASE_URL (or DATABASE_URL) to mark test accounts verified after register.
 */
import pg from 'pg';

const args = process.argv.slice(2);
const apiFlag = args.indexOf('--api');
const apiOrigin =
  apiFlag >= 0 && args[apiFlag + 1]
    ? args[apiFlag + 1].replace(/\/+$/, '')
    : (process.env.API_ORIGIN ?? 'https://api.brisbaneservers.com').replace(/\/+$/, '');

const siteOrigin = (process.env.PUBLIC_SITE_URL ?? 'https://brisbaneservers.com').replace(/\/+$/, '');
const apiBase = `${apiOrigin}/api`;
const databaseUrl = process.env.NEON_DATABASE_URL ?? process.env.DATABASE_URL ?? '';

type CheckResult = { name: string; ok: boolean; detail: string };

function parseSetCookie(setCookie: string | null): string | null {
  if (!setCookie) return null;
  const match = /authToken=([^;]+)/.exec(setCookie);
  return match?.[1] ?? null;
}

async function apiFetch(
  path: string,
  init: RequestInit & { cookie?: string } = {}
): Promise<{ status: number; body: unknown; setCookie: string | null }> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  headers.set('Origin', siteOrigin);
  if (init.cookie) {
    headers.set('Cookie', `authToken=${init.cookie}`);
  }

  const res = await fetch(`${apiBase}${path}`, { ...init, headers });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  const setCookie = res.headers.get('set-cookie');
  return { status: res.status, body, setCookie };
}

async function corsPreflight(path: string): Promise<boolean> {
  const res = await fetch(`${apiBase}${path}`, {
    method: 'OPTIONS',
    headers: {
      Origin: siteOrigin,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type',
    },
  });
  const allowOrigin = res.headers.get('access-control-allow-origin');
  const allowCreds = res.headers.get('access-control-allow-credentials');
  return res.status === 204 && allowOrigin === siteOrigin && allowCreds === 'true';
}

async function markUserVerified(email: string): Promise<void> {
  if (!databaseUrl) {
    throw new Error('NEON_DATABASE_URL or DATABASE_URL required for verification step');
  }
  const pool = new pg.Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  try {
    const now = new Date().toISOString();
    const result = await pool.query(
      `UPDATE users SET email_verified_at = $1, updated_at = $1 WHERE email = $2 RETURNING id`,
      [now, email.toLowerCase()]
    );
    if (result.rowCount === 0) {
      throw new Error(`User not found in database: ${email}`);
    }
  } finally {
    await pool.end();
  }
}

async function cleanupTestUser(email: string): Promise<void> {
  if (!databaseUrl) return;
  const pool = new pg.Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  try {
    const user = await pool.query(`SELECT id FROM users WHERE email = $1`, [email.toLowerCase()]);
    const userId = user.rows[0]?.id as string | undefined;
    if (!userId) return;
    await pool.query(`DELETE FROM sessions WHERE user_id = $1`, [userId]);
    await pool.query(`DELETE FROM auth_tokens WHERE user_id = $1`, [userId]);
    await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
  } catch {
    /* best-effort cleanup */
  } finally {
    await pool.end();
  }
}

async function main(): Promise<void> {
  const results: CheckResult[] = [];
  const testEmail = `auth-e2e-${Date.now()}@example.com`;
  const testPassword = `E2eTest-${Math.random().toString(36).slice(2, 10)}!`;
  let sessionCookie: string | null = null;

  try {
    results.push({
      name: 'CORS preflight POST /auth/login',
      ok: await corsPreflight('/auth/login'),
      detail: 'Origin + credentials headers',
    });

    const oauth = await apiFetch('/auth/oauth/status', { method: 'GET' });
    results.push({
      name: 'GET /auth/oauth/status',
      ok: oauth.status === 200 && typeof oauth.body === 'object' && oauth.body !== null && (oauth.body as { google?: boolean }).google === true,
      detail: oauth.status === 200 ? 'google enabled' : `HTTP ${oauth.status}`,
    });

    const register = await apiFetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    results.push({
      name: 'POST /auth/register',
      ok: register.status === 200 && (register.body as { success?: boolean })?.success === true,
      detail: register.status === 200 ? 'account created' : `HTTP ${register.status} — ${JSON.stringify(register.body)}`,
    });

    const blockedLogin = await apiFetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    results.push({
      name: 'POST /auth/login (unverified blocked)',
      ok:
        blockedLogin.status === 403 &&
        (blockedLogin.body as { code?: string })?.code === 'EMAIL_NOT_VERIFIED',
      detail: `HTTP ${blockedLogin.status}`,
    });

    if (databaseUrl) {
      await markUserVerified(testEmail);

      const login = await apiFetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, password: testPassword }),
      });
      sessionCookie = parseSetCookie(login.setCookie);
      const cookieHasDomain = login.setCookie?.includes('Domain=.brisbaneservers.com') ?? false;
      results.push({
        name: 'POST /auth/login (verified)',
        ok:
          login.status === 200 &&
          (login.body as { success?: boolean })?.success === true &&
          Boolean(sessionCookie),
        detail: login.status === 200
          ? `session cookie set${cookieHasDomain ? ', Domain=.brisbaneservers.com' : ''}`
          : `HTTP ${login.status}`,
      });

      const me = await apiFetch('/auth/me', { method: 'GET', cookie: sessionCookie ?? undefined });
      results.push({
        name: 'GET /auth/me (cookie session)',
        ok:
          me.status === 200 &&
          (me.body as { success?: boolean })?.success === true &&
          (me.body as { user?: { email?: string } })?.user?.email === testEmail.toLowerCase(),
        detail: me.status === 200 ? 'session valid' : `HTTP ${me.status}`,
      });

      const logout = await apiFetch('/auth/logout', {
        method: 'POST',
        cookie: sessionCookie ?? undefined,
      });
      const cleared = logout.setCookie?.includes('Max-Age=0') ?? false;
      results.push({
        name: 'POST /auth/logout',
        ok: logout.status === 200 && (logout.body as { success?: boolean })?.success === true && cleared,
        detail: logout.status === 200 ? 'cookie cleared' : `HTTP ${logout.status}`,
      });

      const meAfter = await apiFetch('/auth/me', { method: 'GET', cookie: sessionCookie ?? undefined });
      results.push({
        name: 'GET /auth/me (after logout)',
        ok: meAfter.status === 401,
        detail: `HTTP ${meAfter.status} (expect 401)`,
      });
    } else {
      results.push({
        name: 'Full session round-trip (skipped)',
        ok: true,
        detail: 'Set NEON_DATABASE_URL to enable login/session/logout checks',
      });
    }
  } finally {
    await cleanupTestUser(testEmail);
  }

  let failed = 0;
  for (const r of results) {
    const mark = r.ok ? 'PASS' : 'FAIL';
    console.log(`[${mark}] ${r.name} — ${r.detail}`);
    if (!r.ok) failed += 1;
  }

  console.log(`\nAPI base: ${apiBase}`);
  console.log(`Site origin: ${siteOrigin}`);
  if (failed > 0) {
    console.error(`\n${failed} auth check(s) failed.`);
    process.exit(1);
  }
  console.log('\nAll production auth checks passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
