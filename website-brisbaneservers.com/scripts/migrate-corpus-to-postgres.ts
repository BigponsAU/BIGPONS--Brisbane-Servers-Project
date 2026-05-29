#!/usr/bin/env npx tsx
/**
 * One-shot: import voice-framework/storage JSON files into Postgres corpus_documents.
 * Requires DATABASE_URL (Neon / Supabase / any Postgres).
 */
import * as path from 'path';
import { CORPUS_DOC_KEYS, migrateAllCorpusFilesFromDisk } from '../src/lib/corpus-store';
import { usePostgres } from '../src/lib/db/pg-pool';
import { voiceFrameworkStorageDir } from '../src/lib/monorepo-root';

async function main(): Promise<void> {
  if (!usePostgres()) {
    console.error('Set DATABASE_URL to a Postgres connection string (e.g. Neon).');
    process.exit(1);
  }

  const dir = voiceFrameworkStorageDir();
  const entries = Object.values(CORPUS_DOC_KEYS).map((key) => ({
    key,
    filePath: path.join(dir, `${key}.json`),
  }));

  const migrated = await migrateAllCorpusFilesFromDisk(entries);
  console.log(`Migrated ${migrated} document(s) into corpus_documents.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
