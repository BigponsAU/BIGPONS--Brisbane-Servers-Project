#!/usr/bin/env npx tsx
/**
 * One-shot: pull published resources from the live API into git-tracked storage.
 * Use before push when PAGES_BUILD_USE_GIT_CORPUS=1 (zero Neon egress on Pages build).
 *
 *   npx tsx scripts/export-corpus-for-pages-build.ts
 *   npx tsx scripts/export-corpus-for-pages-build.ts --api https://api.brisbaneservers.com/api
 */
import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { Resource } from '../src/lib/resource-types';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '../..');
const resourcesFile = path.join(repoRoot, 'voice-framework/storage/resources.json');

function apiBase(): string {
  const flag = process.argv.indexOf('--api');
  if (flag >= 0 && process.argv[flag + 1]) {
    return process.argv[flag + 1].replace(/\/+$/, '');
  }
  return (
    process.env.EXPORT_API_BASE_URL ??
    process.env.PUBLIC_API_BASE_URL ??
    'https://api.brisbaneservers.com/api'
  ).replace(/\/+$/, '');
}

async function main(): Promise<void> {
  const base = apiBase();
  const url = `${base}/resources/public`;
  console.log(`Fetching published resources (one Neon read): ${url}`);

  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as { resources?: Resource[] };
  const published = Array.isArray(data.resources) ? data.resources : [];

  const existingRaw = await fs.readFile(resourcesFile, 'utf-8').catch(() => '[]');
  const existing = JSON.parse(existingRaw) as Resource[];
  const publishedIds = new Set(published.map((r) => r.id));

  // API wins on id collision; keep git-tracked published resources not yet in Neon/API.
  const merged = [
    ...published,
    ...existing.filter((r) => !publishedIds.has(r.id)),
  ];

  await fs.mkdir(path.dirname(resourcesFile), { recursive: true });
  await fs.writeFile(resourcesFile, JSON.stringify(merged, null, 2), 'utf-8');

  console.log(
    `Wrote ${published.length} from API + ${merged.length - published.length} retained from git → ${resourcesFile}`,
  );
  console.log('Commit voice-framework/storage/resources.json then push (Pages build will skip API when PAGES_BUILD_USE_GIT_CORPUS=1).');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
