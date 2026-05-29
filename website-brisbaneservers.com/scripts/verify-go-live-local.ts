#!/usr/bin/env npx tsx
/**
 * Phase 0 — local production gates (repo readiness before deploy).
 *
 * Usage:
 *   npm run verify:go-live
 *   npm run verify:go-live -- --api https://brisbane-servers-api.onrender.com
 */
import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

type Step = { name: string; command: string; env?: Record<string, string> };

const args = process.argv.slice(2);
const apiFlag = args.indexOf('--api');
const apiOrigin =
  apiFlag >= 0 && args[apiFlag + 1]
    ? args[apiFlag + 1].replace(/\/+$/, '')
    : process.env.API_ORIGIN?.replace(/\/+$/, '');

const steps: Step[] = [
  { name: 'Vitest', command: 'npm test' },
  { name: 'TypeScript', command: 'npm run typecheck' },
  {
    name: 'Production build (pre-build 7/7 + post-build 6/6)',
    command: 'npm run build',
    env: { SKIP_HOSTED_API_CHECK: '1' },
  },
];

function runStep(step: Step): { ok: boolean; detail: string } {
  try {
    execSync(step.command, {
      cwd: projectRoot,
      stdio: 'pipe',
      env: { ...process.env, ...step.env },
    });
    return { ok: true, detail: 'OK' };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'command failed';
    const tail = message.split('\n').slice(-8).join('\n');
    return { ok: false, detail: tail || 'failed' };
  }
}

async function runProductionApiChecks(): Promise<number> {
  if (!apiOrigin) return 0;
  try {
    execSync(`npx tsx scripts/verify-production-api.ts --api ${apiOrigin}`, {
      cwd: projectRoot,
      stdio: 'inherit',
    });
    return 0;
  } catch {
    return 1;
  }
}

async function main(): Promise<void> {
  console.log('Go-live local gates (Phase 0)\n');

  let failed = 0;
  for (const step of steps) {
    const result = runStep(step);
    const mark = result.ok ? 'PASS' : 'FAIL';
    console.log(`[${mark}] ${step.name} — ${result.ok ? result.detail : '\n' + result.detail}`);
    if (!result.ok) failed += 1;
  }

  if (apiOrigin) {
    console.log('\nRemote API checks (Phase 1)…\n');
    const apiFailed = await runProductionApiChecks();
    failed += apiFailed;
  }

  console.log('\n--- Deploy next (operator) ---');
  console.log('1. Render Blueprint → render.yaml → brisbane-servers-api + Postgres + disk');
  console.log('2. npm run seed:admin (once) · npm run verify:production -- --api <host>');
  console.log('3. Cloudflare Pages → env from cloudflare-pages.env.example');
  console.log('4. /account on domain → ACCOUNT_DOMAIN_VERIFICATION.md');
  console.log('Tracker: docs/operations/PRODUCTION_GO_LIVE_STATUS.md');

  if (failed > 0) {
    console.error(`\n${failed} gate(s) failed.`);
    process.exit(1);
  }

  console.log('\nAll local go-live gates passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
