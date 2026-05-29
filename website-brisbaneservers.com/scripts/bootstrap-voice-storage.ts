#!/usr/bin/env npx tsx
/**
 * Bootstrap voice-framework/storage on the API host.
 * - With DATABASE_URL (Neon): migrate git seed JSON into Postgres corpus_documents if missing.
 * - Without Postgres: copy seed files when targets are missing (ephemeral Render free).
 */
import * as path from 'path';
import {
  CORPUS_DOC_KEYS,
  exportCorpusToFile,
  migrateAllCorpusFilesFromDisk,
} from '../src/lib/corpus-store';
import { usePostgres } from '../src/lib/db/pg-pool';
import { getMonorepoRoot, voiceFrameworkStorageDir } from '../src/lib/monorepo-root';

async function main(): Promise<void> {
  const storageDir = voiceFrameworkStorageDir();
  const seedDir = path.join(getMonorepoRoot(), 'voice-framework', 'storage');

  const entries = [
    { key: CORPUS_DOC_KEYS.RESOURCES, filePath: path.join(storageDir, 'resources.json') },
    { key: CORPUS_DOC_KEYS.PROFILES, filePath: path.join(storageDir, 'profiles.json') },
    { key: CORPUS_DOC_KEYS.TEXT_STORAGE, filePath: path.join(storageDir, 'text-storage.json') },
    { key: CORPUS_DOC_KEYS.SEMANTIC_INDEX, filePath: path.join(storageDir, 'semantic-index.json') },
    {
      key: CORPUS_DOC_KEYS.GROWTH_PROPOSALS,
      filePath: path.join(storageDir, 'growth-proposals.json'),
    },
    {
      key: CORPUS_DOC_KEYS.LIBRARY_GROWTH_CONFIG,
      filePath: path.join(storageDir, 'library-growth-config.json'),
    },
    { key: CORPUS_DOC_KEYS.PIPELINE_CONFIG, filePath: path.join(storageDir, 'pipeline-config.json') },
    { key: CORPUS_DOC_KEYS.CONTRIBUTIONS, filePath: path.join(storageDir, 'contributions.json') },
    { key: CORPUS_DOC_KEYS.TOKEN_LEDGER, filePath: path.join(storageDir, 'token-ledger.json') },
    {
      key: CORPUS_DOC_KEYS.CASE_STUDY_DRAFTS,
      filePath: path.join(storageDir, 'case-study-drafts.json'),
    },
  ];

  if (usePostgres()) {
    const migrated = await migrateAllCorpusFilesFromDisk(
      entries.map(({ key, filePath }) => ({
        key,
        filePath: path.join(seedDir, path.basename(filePath)),
      }))
    );
  for (const { key, filePath } of entries) {
      await exportCorpusToFile(key, filePath);
    }
    console.log(
      `[bootstrap-storage] Postgres corpus ready (migrated ${migrated} seed doc(s)); files mirrored for voice-framework`
    );
    return;
  }

  const { copyFile, mkdir, access } = await import('fs/promises');
  await mkdir(storageDir, { recursive: true });
  const seedNames = [
    'resources.json',
    'profiles.json',
    'text-storage.json',
    'vector-storage.json',
  ];
  let copied = 0;
  for (const name of seedNames) {
    const target = path.join(storageDir, name);
    const seed = path.join(seedDir, name);
    try {
      await access(target);
      continue;
    } catch {
      /* missing */
    }
    try {
      await access(seed);
      await copyFile(seed, target);
      copied += 1;
      console.log(`[bootstrap-storage] seeded ${name}`);
    } catch {
      /* no seed */
    }
  }
  console.log(`[bootstrap-storage] filesystem mode storage=${storageDir} copied=${copied}`);
}

main().catch((error) => {
  console.error('[bootstrap-storage] failed:', error);
  process.exit(1);
});
