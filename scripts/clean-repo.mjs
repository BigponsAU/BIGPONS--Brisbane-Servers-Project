#!/usr/bin/env node

/**
 * Safe repository cleanup.
 *
 * Default mode removes generated build outputs, debug logs, and a stale nested
 * resources copy if it is still an empty placeholder. Use --include-deps to
 * also remove node_modules directories for a full reinstall.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const includeDeps = process.argv.includes('--include-deps');

const removablePaths = [
  'website-brisbaneservers.com/.astro',
  'website-brisbaneservers.com/dist',
  'voice-framework/dist',
  'voice-framework/test-results',
];

const dependencyPaths = [
  'node_modules',
  'website-brisbaneservers.com/node_modules',
  'voice-framework/node_modules',
];

const summary = {
  removed: [],
  skipped: [],
};

function resolveFromRoot(relativePath) {
  return path.join(projectRoot, relativePath);
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function removePath(relativePath) {
  const absolutePath = resolveFromRoot(relativePath);

  if (!(await pathExists(absolutePath))) {
    summary.skipped.push(`${relativePath} (missing)`);
    return;
  }

  await fs.rm(absolutePath, { recursive: true, force: true });
  summary.removed.push(relativePath);
}

async function removeMatchingFiles(relativeDir, matcher) {
  const absoluteDir = resolveFromRoot(relativeDir);

  if (!(await pathExists(absoluteDir))) {
    return;
  }

  const entries = await fs.readdir(absoluteDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile() || !matcher(entry.name)) {
      continue;
    }

    const relativePath = path.join(relativeDir, entry.name);
    await fs.rm(resolveFromRoot(relativePath), { force: true });
    summary.removed.push(relativePath);
  }
}

async function removeStaleNestedResourcesCopy() {
  const nestedResourcesPath = resolveFromRoot(
    'website-brisbaneservers.com/voice-framework/storage/resources.json'
  );

  if (!(await pathExists(nestedResourcesPath))) {
    return;
  }

  const raw = (await fs.readFile(nestedResourcesPath, 'utf8')).trim();
  let parsed;

  try {
    parsed = JSON.parse(raw);
  } catch {
    summary.skipped.push(
      'website-brisbaneservers.com/voice-framework/storage/resources.json (invalid JSON)'
    );
    return;
  }

  if (!Array.isArray(parsed) || parsed.length !== 0) {
    summary.skipped.push(
      'website-brisbaneservers.com/voice-framework/storage/resources.json (contains data)'
    );
    return;
  }

  await fs.rm(nestedResourcesPath, { force: true });
  summary.removed.push('website-brisbaneservers.com/voice-framework/storage/resources.json');

  const storageDir = resolveFromRoot('website-brisbaneservers.com/voice-framework/storage');
  const voiceFrameworkDir = resolveFromRoot('website-brisbaneservers.com/voice-framework');

  for (const dirPath of [storageDir, voiceFrameworkDir]) {
    try {
      const contents = await fs.readdir(dirPath);
      if (contents.length === 0) {
        await fs.rmdir(dirPath);
        summary.removed.push(path.relative(projectRoot, dirPath));
      }
    } catch {
      // Ignore non-empty or already-removed directories.
    }
  }
}

async function main() {
  console.log('Cleaning generated repository artifacts...\n');

  for (const relativePath of removablePaths) {
    await removePath(relativePath);
  }

  await removeMatchingFiles('.', (name) => /^debug-.*\.ndjson$/i.test(name));
  await removeMatchingFiles('.cursor', (name) => /^debug-.*\.log$/i.test(name));
  await removeMatchingFiles(
    'website-brisbaneservers.com',
    (name) => /^debug-session-.*\.ndjson$/i.test(name)
  );

  await removeStaleNestedResourcesCopy();

  if (includeDeps) {
    for (const relativePath of dependencyPaths) {
      await removePath(relativePath);
    }
  }

  console.log('Removed:');
  if (summary.removed.length === 0) {
    console.log('  - Nothing to remove');
  } else {
    for (const item of summary.removed) {
      console.log(`  - ${item}`);
    }
  }

  if (summary.skipped.length > 0) {
    console.log('\nSkipped:');
    for (const item of summary.skipped) {
      console.log(`  - ${item}`);
    }
  }

  if (includeDeps) {
    console.log('\nFull cleanup complete. Reinstall with `npm run install:all`.');
  } else {
    console.log('\nSafe cleanup complete.');
  }
}

main().catch((error) => {
  console.error('Cleanup failed:', error);
  process.exit(1);
});
