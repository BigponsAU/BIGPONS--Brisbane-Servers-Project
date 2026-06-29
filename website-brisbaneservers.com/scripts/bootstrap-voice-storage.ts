#!/usr/bin/env npx tsx
/**
 * Bootstrap voice-framework/storage on the API host.
 * - With DATABASE_URL (Neon): migrate git seed JSON into Postgres corpus_documents if missing.
 * - Without Postgres: copy seed files when targets are missing.
 */
import * as path from 'path';
import {
  CORPUS_DOC_KEYS,
  exportCorpusToFile,
  migrateAllCorpusFilesFromDisk,
  type CorpusDocKey,
} from '../src/lib/corpus-store';
import { usePostgres } from '../src/lib/db/pg-pool';
import {
  voiceFrameworkSeedStorageDir,
  voiceFrameworkStorageDir,
} from '../src/lib/monorepo-root';

const CORPUS_FILE_NAMES: Record<CorpusDocKey, string> = {
  [CORPUS_DOC_KEYS.RESOURCES]: 'resources.json',
  [CORPUS_DOC_KEYS.PROFILES]: 'profiles.json',
  [CORPUS_DOC_KEYS.TEXT_STORAGE]: 'text-storage.json',
  [CORPUS_DOC_KEYS.SEMANTIC_INDEX]: 'semantic-index.json',
  [CORPUS_DOC_KEYS.GROWTH_PROPOSALS]: 'growth-proposals.json',
  [CORPUS_DOC_KEYS.LIBRARY_GROWTH_CONFIG]: 'library-growth-config.json',
  [CORPUS_DOC_KEYS.PIPELINE_CONFIG]: 'pipeline-config.json',
  [CORPUS_DOC_KEYS.CONTRIBUTIONS]: 'contributions.json',
  [CORPUS_DOC_KEYS.TOKEN_LEDGER]: 'token-ledger.json',
  [CORPUS_DOC_KEYS.USAGE_LEDGER]: 'usage-ledger.json',
  [CORPUS_DOC_KEYS.AI_DAILY_BONUSES]: 'ai-daily-bonuses.json',
  [CORPUS_DOC_KEYS.TOKEN_REDEMPTION_QUEUE]: 'token-redemption-queue.json',
  [CORPUS_DOC_KEYS.GROWTH_USAGE_LEDGER]: 'growth-usage-ledger.json',
  [CORPUS_DOC_KEYS.CASE_STUDY_DRAFTS]: 'case-study-drafts.json',
};

function corpusEntries(storageDir: string): Array<{ key: CorpusDocKey; filePath: string }> {
  return Object.entries(CORPUS_FILE_NAMES).map(([key, name]) => ({
    key: key as CorpusDocKey,
    filePath: path.join(storageDir, name),
  }));
}

async function main(): Promise<void> {
  const storageDir = voiceFrameworkStorageDir();
  const seedDir = voiceFrameworkSeedStorageDir();
  const entries = corpusEntries(storageDir);

  if (usePostgres()) {
    const migrated = await migrateAllCorpusFilesFromDisk(
      entries.map(({ key, filePath }) => ({
        key,
        filePath: path.join(seedDir, path.basename(filePath)),
      })),
    );
    for (const { key, filePath } of entries) {
      await exportCorpusToFile(key, filePath);
    }
    console.log(
      `[bootstrap-storage] Postgres corpus ready (migrated ${migrated} seed doc(s)); files mirrored for voice-framework`,
    );
    return;
  }

  const { copyFile, mkdir, access } = await import('fs/promises');
  await mkdir(storageDir, { recursive: true });
  let copied = 0;
  for (const name of Object.values(CORPUS_FILE_NAMES)) {
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

const isCli = process.argv[1]?.includes('bootstrap-voice-storage');

main().catch((error) => {
  console.error('[bootstrap-storage] failed:', error);
  if (isCli) {
    process.exit(1);
  }
});
