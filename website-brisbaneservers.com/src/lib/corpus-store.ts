/**
 * Corpus persistence: Postgres JSONB (Neon/Supabase) when DATABASE_URL is set, else filesystem.
 * One row per logical document (resources, semantic index, growth queue, etc.).
 */
import { promises as fs } from 'fs';
import * as path from 'path';
import { pid, platform } from 'node:process';
import { getSharedPool, usePostgres } from './db/pg-pool';
import { getRuntimeEnv } from '../utils/runtime-env';

function shouldSkipFileMirror(): boolean {
  return getRuntimeEnv('CORPUS_SKIP_FILE_MIRROR') === '1';
}

export const CORPUS_DOC_KEYS = {
  RESOURCES: 'resources',
  SEMANTIC_INDEX: 'semantic-index',
  GROWTH_PROPOSALS: 'growth-proposals',
  LIBRARY_GROWTH_CONFIG: 'library-growth-config',
  PIPELINE_CONFIG: 'pipeline-config',
  CONTRIBUTIONS: 'contributions',
  TOKEN_LEDGER: 'token-ledger',
  USAGE_LEDGER: 'usage-ledger',
  GROWTH_USAGE_LEDGER: 'growth-usage-ledger',
  CASE_STUDY_DRAFTS: 'case-study-drafts',
  PROFILES: 'profiles',
  TEXT_STORAGE: 'text-storage',
} as const;

export type CorpusDocKey = (typeof CORPUS_DOC_KEYS)[keyof typeof CORPUS_DOC_KEYS];

let schemaReady: Promise<void> | null = null;

async function ensureCorpusSchema(): Promise<void> {
  if (!usePostgres()) return;
  if (!schemaReady) {
    schemaReady = (async () => {
      const pool = getSharedPool();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS corpus_documents (
          doc_key TEXT PRIMARY KEY NOT NULL,
          payload JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_corpus_documents_updated_at ON corpus_documents(updated_at);
      `);
    })();
  }
  await schemaReady;
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeJsonFileAtomic(filePath: string, data: unknown): Promise<void> {
  if (shouldSkipFileMirror()) {
    return;
  }
  const dir = path.dirname(filePath);
  const base = path.basename(filePath);
  const tmp = path.join(dir, `.${base}.${pid}.${Date.now()}.tmp`);
  const payload = JSON.stringify(data, null, 2);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(tmp, payload, 'utf-8');
  try {
    if (platform === 'win32') {
      try {
        await fs.rename(tmp, filePath);
      } catch {
        await fs.rm(filePath, { force: true });
        await fs.rename(tmp, filePath);
      }
    } else {
      await fs.rename(tmp, filePath);
    }
  } catch (e) {
    await fs.unlink(tmp).catch(() => {});
    throw e;
  }
}

async function loadFromPostgres<T>(key: CorpusDocKey): Promise<T | null> {
  await ensureCorpusSchema();
  const pool = getSharedPool();
  const { rows } = await pool.query<{ payload: T }>(
    'SELECT payload FROM corpus_documents WHERE doc_key = $1',
    [key],
  );
  return rows[0]?.payload ?? null;
}

async function saveToPostgres(key: CorpusDocKey, data: unknown): Promise<void> {
  await ensureCorpusSchema();
  const pool = getSharedPool();
  await pool.query(
    `INSERT INTO corpus_documents (doc_key, payload, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (doc_key) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
    [key, JSON.stringify(data)],
  );
}

/**
 * Read JSON document — Postgres first, migrate from file if row missing, else default.
 */
export async function readCorpusJson<T>(
  key: CorpusDocKey,
  filePath: string,
  defaultValue: T,
): Promise<T> {
  if (usePostgres()) {
    const fromPg = await loadFromPostgres<T>(key);
    if (fromPg !== null) {
      return fromPg;
    }
    const fromFile = await readJsonFile<T>(filePath);
    if (fromFile !== null) {
      await saveToPostgres(key, fromFile);
      return fromFile;
    }
    return defaultValue;
  }

  const fromFile = await readJsonFile<T>(filePath);
  return fromFile ?? defaultValue;
}

/**
 * Write JSON document — Postgres + mirror to file (keeps ProfileManager / legacy readers in sync).
 */
export async function saveCorpusJson<T>(
  key: CorpusDocKey,
  filePath: string,
  data: T,
): Promise<void> {
  if (usePostgres()) {
    await saveToPostgres(key, data);
  }
  await writeJsonFileAtomic(filePath, data);
}

/** After legacy code writes a file directly, import into Postgres. */
export async function importFileToCorpus(key: CorpusDocKey, filePath: string): Promise<void> {
  if (!usePostgres()) return;
  const data = await readJsonFile(filePath);
  if (data === null) return;
  await saveToPostgres(key, data);
}

/** Export Postgres document to filesystem (e.g. before ProfileManager init). */
export async function exportCorpusToFile(key: CorpusDocKey, filePath: string): Promise<boolean> {
  if (!usePostgres()) return false;
  const data = await loadFromPostgres(key);
  if (data === null) return false;
  await writeJsonFileAtomic(filePath, data);
  return true;
}

export async function migrateAllCorpusFilesFromDisk(
  entries: Array<{ key: CorpusDocKey; filePath: string }>,
): Promise<number> {
  if (!usePostgres()) return 0;
  let migrated = 0;
  for (const { key, filePath } of entries) {
    const existing = await loadFromPostgres(key);
    if (existing !== null) continue;
    const fromFile = await readJsonFile(filePath);
    if (fromFile === null) continue;
    await saveToPostgres(key, fromFile);
    migrated += 1;
  }
  return migrated;
}
