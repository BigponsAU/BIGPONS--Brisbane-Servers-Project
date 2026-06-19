/**
 * Voice text-storage persistence — Postgres corpus (production) with filesystem fallback.
 */

import { CORPUS_DOC_KEYS, readCorpusJson, saveCorpusJson } from './corpus-store';
import { getTextStorageFile } from './storage-paths';

export interface TextStorageJsonData {
  samples: unknown[];
  principles: unknown[];
  archivedPrinciples: unknown[];
  relationships: unknown[];
  version: string;
  lastUpdated: string;
}

function emptyTextStorageData(): TextStorageJsonData {
  return {
    samples: [],
    principles: [],
    archivedPrinciples: [],
    relationships: [],
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
  };
}

/** Load text-storage.json document (Neon first, then disk, else empty). */
export async function loadTextStorageData(): Promise<TextStorageJsonData> {
  const data = await readCorpusJson<TextStorageJsonData>(
    CORPUS_DOC_KEYS.TEXT_STORAGE,
    getTextStorageFile(),
    emptyTextStorageData(),
  );
  return {
    ...emptyTextStorageData(),
    ...data,
    samples: Array.isArray(data.samples) ? data.samples : [],
    principles: Array.isArray(data.principles) ? data.principles : [],
    archivedPrinciples: Array.isArray(data.archivedPrinciples) ? data.archivedPrinciples : [],
    relationships: Array.isArray(data.relationships) ? data.relationships : [],
  };
}

/** Persist text-storage.json to corpus + optional filesystem mirror. */
export async function saveTextStorageData(data: TextStorageJsonData): Promise<void> {
  const payload: TextStorageJsonData = {
    ...data,
    lastUpdated: new Date().toISOString(),
  };
  await saveCorpusJson(CORPUS_DOC_KEYS.TEXT_STORAGE, getTextStorageFile(), payload);
}
