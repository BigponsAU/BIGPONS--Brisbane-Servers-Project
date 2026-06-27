#!/usr/bin/env npx tsx
/**
 * Dashboard API route probe — every endpoint the /account workspace calls.
 * Expects route to exist (not 404). Auth routes may return 401/403 without a session.
 *
 * Usage:
 *   npm run verify:dashboard-api -- --api https://api.brisbaneservers.com
 */
const dashArgs = process.argv.slice(2);
const dashApiFlag = dashArgs.indexOf('--api');
const dashApiOrigin =
  dashApiFlag >= 0 && dashArgs[dashApiFlag + 1]
    ? dashArgs[dashApiFlag + 1].replace(/\/+$/, '')
    : process.env.API_ORIGIN?.replace(/\/+$/, '') ?? 'https://api.brisbaneservers.com';

const dashBase = dashApiOrigin.endsWith('/api') ? dashApiOrigin : `${dashApiOrigin}/api`;

type Probe = {
  panel: string;
  method: string;
  path: string;
  /** Acceptable status codes when unauthenticated */
  expect: number[];
};

const probes: Probe[] = [
  // —— Core (session + API reachability) ——
  { panel: 'core', method: 'GET', path: '/health', expect: [200] },
  { panel: 'core', method: 'GET', path: '/auth/me', expect: [401] },
  { panel: 'core', method: 'GET', path: '/auth/oauth/status', expect: [200] },
  { panel: 'core', method: 'GET', path: '/auth/passkey/credentials', expect: [401] },
  { panel: 'core', method: 'POST', path: '/auth/passkey/register-options', expect: [401] },
  { panel: 'core', method: 'POST', path: '/auth/passkey/login-options', expect: [400, 401, 404, 503] },

  // —— Overview (dashboard) ——
  { panel: 'overview', method: 'GET', path: '/tokens/me', expect: [401] },
  { panel: 'overview', method: 'GET', path: '/tokens/perks', expect: [200] },
  { panel: 'overview', method: 'POST', path: '/tokens/redeem', expect: [401] },
  { panel: 'overview', method: 'GET', path: '/community/my-contributions', expect: [401] },

  // —— Resources ——
  { panel: 'resources', method: 'GET', path: '/resources/starter-blocks', expect: [200, 401] },
  { panel: 'resources', method: 'GET', path: '/resources?includeStarterBlocks=true', expect: [200, 401] },
  { panel: 'resources', method: 'POST', path: '/resources/generate', expect: [400, 401, 403] },
  { panel: 'resources', method: 'POST', path: '/resources/upload', expect: [400, 401, 403] },
  { panel: 'resources', method: 'POST', path: '/documents/extract', expect: [400, 401, 403] },
  { panel: 'resources', method: 'POST', path: '/documents/rewrite', expect: [400, 401, 403] },
  { panel: 'resources', method: 'GET', path: '/documents/costs', expect: [401, 403] },

  // —— Profiles ——
  { panel: 'profiles', method: 'GET', path: '/profiles', expect: [200, 401] },
  { panel: 'profiles', method: 'GET', path: '/profiles/default', expect: [200, 401] },
  { panel: 'profiles', method: 'POST', path: '/profiles/create-base', expect: [401, 403] },

  // —— Analytics ——
  { panel: 'analytics', method: 'GET', path: '/analytics/suggestions', expect: [200, 401, 403] },
  { panel: 'analytics', method: 'PATCH', path: '/admin/pipeline-config', expect: [401, 403, 405] },

  // —— Voice lab / voice map ——
  { panel: 'voice-lab', method: 'POST', path: '/voice/analyze', expect: [400, 401, 403] },
  { panel: 'voice-map', method: 'GET', path: '/voice-map/corpus?layer=resources', expect: [200, 401, 403] },
  { panel: 'voice-map', method: 'GET', path: '/voice-map/principles', expect: [200, 401, 403] },
  { panel: 'voice-map', method: 'POST', path: '/admin/bootstrap-voice-corpus', expect: [401, 403] },

  // —— Library growth (admin) ——
  { panel: 'library-growth', method: 'GET', path: '/admin/library-growth', expect: [401, 403] },
  { panel: 'library-growth', method: 'GET', path: '/admin/growth-proposals?status=pending', expect: [401, 403] },
  { panel: 'library-growth', method: 'POST', path: '/admin/growth-proposals', expect: [401, 403] },

  // —— Moderation (admin) ——
  { panel: 'moderation', method: 'GET', path: '/community/contributions', expect: [401, 403] },
  { panel: 'moderation', method: 'POST', path: '/community/approve', expect: [401, 403] },
  { panel: 'moderation', method: 'POST', path: '/community/reject', expect: [401, 403] },

  // —— Site review + hosting email (admin / super-admin UI) ——
  { panel: 'site-review', method: 'GET', path: '/admin/site-sections', expect: [401, 403] },
  { panel: 'site-review', method: 'GET', path: '/admin/hosting-status', expect: [401, 403] },
  {
    panel: 'site-review',
    method: 'POST',
    path: '/admin/email-hosting-checklist',
    expect: [401, 403],
  },

  // —— Users (admin) ——
  { panel: 'admin-users', method: 'GET', path: '/admin/users', expect: [401, 403] },
  { panel: 'admin-users', method: 'GET', path: '/admin/auth-audit?limit=100', expect: [401, 403] },
  { panel: 'admin-users', method: 'GET', path: '/admin/vectors-summary', expect: [401, 403] },
  { panel: 'admin-users', method: 'PATCH', path: '/admin/users/00000000-0000-0000-0000-000000000000', expect: [401, 403, 404] },

  // —— Ops (admin) ——
  { panel: 'admin-ops', method: 'GET', path: '/usage/me', expect: [401] },
  { panel: 'admin-ops', method: 'GET', path: '/admin/token-redemptions', expect: [401, 403] },
  { panel: 'admin-ops', method: 'POST', path: '/admin/token-redemptions/fulfill', expect: [401, 403, 400] },
  { panel: 'admin-ops', method: 'GET', path: '/admin/search-corpus', expect: [401, 403] },
];

async function main(): Promise<void> {
  let failed = 0;
  let passed = 0;

  console.log(`\nDashboard API probe: ${dashBase}\n`);

  for (const probe of probes) {
    const url = `${dashBase}${probe.path}`;
    try {
      const init: RequestInit = { method: probe.method, headers: { Accept: 'application/json' } };
      if (probe.method === 'POST') {
        init.headers = { ...init.headers, 'Content-Type': 'application/json' };
        init.body = JSON.stringify(
          probe.path.includes('voice/analyze')
            ? { text: 'short' }
            : probe.path.includes('email-hosting-checklist')
              ? { fromMailbox: 'support', toMailbox: 'bigpons' }
              : probe.path.includes('growth-proposals')
                ? { action: 'reject', proposalId: 'probe' }
                : probe.path.includes('token-redemptions/fulfill')
                  ? { id: 'probe' }
                  : probe.path.includes('community/approve') || probe.path.includes('community/reject')
                    ? { contributionId: 'probe' }
                    : probe.path.includes('passkey')
                      ? { email: 'probe@brisbaneservers.com' }
                      : probe.path.includes('resources/generate')
                        ? { prompt: 'probe' }
                        : probe.path.includes('resources/upload')
                          ? {}
                          : probe.path.includes('profiles/create-base')
                            ? {}
                            : { perkId: 'ai-boost' },
        );
      }
      if (probe.method === 'PATCH') {
        init.headers = { ...init.headers, 'Content-Type': 'application/json' };
        init.body = JSON.stringify(
          probe.path.includes('pipeline-config')
            ? { publicSearchEnabled: true }
            : { workspaceEnabled: true },
        );
      }
      const res = await fetch(url, init);
      const ok = probe.expect.includes(res.status);
      const tag = ok ? 'PASS' : 'FAIL';
      if (ok) passed++;
      else failed++;
      console.log(
        `[${tag}] ${probe.panel.padEnd(14)} ${probe.method.padEnd(4)} ${probe.path} → ${res.status}${ok ? '' : ` (expected ${probe.expect.join('|')})`}`
      );
      if (res.status === 404) {
        console.log('       ^ Route missing on worker — check route-manifest + deploy');
      }
    } catch (error) {
      failed++;
      const msg = error instanceof Error ? error.message : String(error);
      console.log(`[FAIL] ${probe.panel.padEnd(14)} ${probe.method.padEnd(4)} ${probe.path} → ${msg}`);
    }
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

void main();

export {};
