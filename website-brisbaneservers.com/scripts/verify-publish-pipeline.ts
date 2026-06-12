#!/usr/bin/env npx tsx
/**
 * Verify static SEO publish pipeline (no SSR required on Pages).
 *
 * Usage:
 *   npm run verify:publish-pipeline -- --api https://api.brisbaneservers.com
 *   npm run verify:publish-pipeline -- --api https://api.brisbaneservers.com --trigger-hook
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');

function parseArgs(): { apiBase: string; triggerHook: boolean } {
  const args = process.argv.slice(2);
  let apiBase = 'https://api.brisbaneservers.com';
  let triggerHook = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--api' && args[i + 1]) {
      apiBase = args[++i].replace(/\/$/, '');
    } else if (args[i] === '--trigger-hook') {
      triggerHook = true;
    }
  }
  return { apiBase, triggerHook };
}

async function check(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`[PASS] ${name}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[FAIL] ${name} — ${msg}`);
    throw error;
  }
}

async function main(): Promise<void> {
  const { apiBase, triggerHook } = parseArgs();
  const api = apiBase.endsWith('/api') ? apiBase : `${apiBase}/api`;

  await check('GET /api/resources/public', async () => {
    const res = await fetch(`${api}/resources/public`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { resources?: unknown[] };
    if (!Array.isArray(data.resources)) throw new Error('missing resources array');
    if (data.resources.length < 1) throw new Error('no published resources');
  });

  await check('public/search-index.json exists', async () => {
    const indexPath = path.join(projectRoot, 'public', 'search-index.json');
    const raw = await readFile(indexPath, 'utf8');
    const parsed = JSON.parse(raw) as unknown[] | { items?: unknown[] };
    const items = Array.isArray(parsed) ? parsed : parsed.items;
    if (!Array.isArray(items) || items.length < 1) {
      throw new Error('search index empty — run npm run generate:search-index');
    }
  });

  await check('astro static output (SSR not required)', async () => {
    const config = await readFile(path.join(projectRoot, 'astro.config.mjs'), 'utf8');
    if (!/output:\s*['"]static['"]/.test(config)) {
      throw new Error('astro.config.mjs must use output: static for Pages SEO pipeline');
    }
  });

  const hookUrl = process.env.CLOUDFLARE_PAGES_DEPLOY_HOOK_URL?.trim();
  if (hookUrl) {
    console.log('[PASS] CLOUDFLARE_PAGES_DEPLOY_HOOK_URL is set (value hidden)');
    if (triggerHook) {
      await check('POST Pages deploy hook', async () => {
        const res = await fetch(hookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'verify-publish-pipeline', source: 'verify-script' }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      });
    }
  } else {
    console.warn('[WARN] CLOUDFLARE_PAGES_DEPLOY_HOOK_URL not in env — worker secret may still be set');
  }

  const purgeToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (purgeToken) {
    console.log('[PASS] CLOUDFLARE_API_TOKEN is set (CDN purge on publish)');
  } else {
    console.warn('[WARN] CLOUDFLARE_API_TOKEN not in env — cache purge on publish may skip');
  }

  console.log('\nPublish pipeline checks passed (static build + deploy hook).');
}

main().catch(() => process.exit(1));
