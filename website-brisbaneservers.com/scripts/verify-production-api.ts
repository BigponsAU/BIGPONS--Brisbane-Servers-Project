#!/usr/bin/env npx tsx
/**
 * Production API smoke checks (Phase 1 / go-live).
 *
 * Usage:
 *   npm run verify:production -- --api https://api.brisbaneservers.com
 *   npm run verify:production -- --api https://brisbane-servers-api.onrender.com
 */
const args = process.argv.slice(2);
const apiFlag = args.indexOf('--api');
const apiOrigin =
  apiFlag >= 0 && args[apiFlag + 1]
    ? args[apiFlag + 1].replace(/\/+$/, '')
    : process.env.API_ORIGIN?.replace(/\/+$/, '');

if (!apiOrigin) {
  console.error('Usage: npm run verify:production -- --api https://<api-host>');
  process.exit(1);
}

const apiBase = `${apiOrigin}/api`;

type CheckResult = { name: string; ok: boolean; detail: string };

async function fetchJson(path: string): Promise<{ ok: boolean; status: number; body: unknown }> {
  const url = `${apiBase}${path.startsWith('/') ? path : `/${path}`}`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    return { ok: res.ok, status: res.status, body };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      body: error instanceof Error ? error.message : 'fetch failed',
    };
  }
}

async function main(): Promise<void> {
  const results: CheckResult[] = [];

  const health = await fetchJson('/health');
  results.push({
    name: 'GET /api/health',
    ok: health.ok,
    detail: health.ok ? 'OK' : `HTTP ${health.status} — ${JSON.stringify(health.body)}`,
  });

  const persistence =
    health.ok &&
    typeof health.body === 'object' &&
    health.body !== null &&
    'persistence' in (health.body as object)
      ? (health.body as { persistence?: { databaseProvider?: string; durable?: boolean } }).persistence
      : undefined;
  if (persistence?.databaseProvider) {
    const neonOk = persistence.databaseProvider === 'neon';
    results.push({
      name: 'Database provider (Neon expected)',
      ok: neonOk,
      detail: neonOk
        ? 'neon'
        : `${persistence.databaseProvider} — run npm run configure:neon-database`,
    });
  }

  const pub = await fetchJson('/resources/public');
  const pubOk =
    pub.ok &&
    typeof pub.body === 'object' &&
    pub.body !== null &&
    'success' in (pub.body as object);
  results.push({
    name: 'GET /api/resources/public',
    ok: pubOk,
    detail: pubOk ? 'OK' : `HTTP ${pub.status}`,
  });

  let cronStatus = 0;
  try {
    const cronRes = await fetch(`${apiBase}/cron/library-growth`, {
      method: 'POST',
      headers: { Authorization: 'Bearer invalid', Accept: 'application/json' },
    });
    cronStatus = cronRes.status;
  } catch {
    cronStatus = 0;
  }
  results.push({
    name: 'POST /api/cron/library-growth (expect 401 without valid secret)',
    ok: cronStatus === 401 || cronStatus === 503,
    detail: `HTTP ${cronStatus} (401 unauthorized or 503 if CRON_SECRET unset is OK)`,
  });

  let failed = 0;
  for (const r of results) {
    const mark = r.ok ? 'PASS' : 'FAIL';
    console.log(`[${mark}] ${r.name} — ${r.detail}`);
    if (!r.ok) failed += 1;
  }

  console.log(`\nAPI base: ${apiBase}`);
  if (failed > 0) {
    console.error(`\n${failed} check(s) failed.`);
    process.exit(1);
  }
  console.log('\nAll production API checks passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
