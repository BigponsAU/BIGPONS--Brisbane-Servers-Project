#!/usr/bin/env npx tsx
/**
 * Prebuild sync for static public SEO assets (Pages CI + local hosted builds).
 *
 * - PAGES_BUILD_EXPORT_ON_BUILD=1 → one API read → voice-framework/storage/resources.json
 * - Always regenerates public/search-index.json from corpus file
 */
import { spawnSync } from 'node:child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { writeSearchIndex } from './generate-search-index';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');

function shouldExportCorpus(): boolean {
  if (process.env.PAGES_BUILD_EXPORT_ON_BUILD !== '1') return false;
  if (process.env.SKIP_HOSTED_API_CHECK === 'true' && process.env.PAGES_BUILD_USE_GIT_CORPUS === '1') {
    return false;
  }
  return true;
}

async function main(): Promise<void> {
  if (shouldExportCorpus()) {
    const api =
      process.env.EXPORT_API_BASE_URL ??
      process.env.INTERNAL_API_BASE_URL ??
      process.env.PUBLIC_API_BASE_URL ??
      'https://api.brisbaneservers.com/api';
    console.log('[prebuild] Exporting published corpus from API (one read)...');
    const result = spawnSync('npx', ['tsx', 'scripts/export-corpus-for-pages-build.ts', '--api', api], {
      cwd: projectRoot,
      stdio: 'inherit',
      shell: true,
    });
    if (result.status !== 0) {
      throw new Error('export-corpus-for-pages-build failed');
    }
  } else {
    console.log('[prebuild] Skipping API corpus export (use PAGES_BUILD_EXPORT_ON_BUILD=1 on Pages CI).');
  }

  const count = await writeSearchIndex();
  console.log(`[prebuild] search-index.json updated (${count} items).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
