/**
 * Legacy 1D score vectors (contributions / compatibility).
 * Semantic retrieval uses `semantic/chunk-index` and `semantic-index.json`.
 */

import { promises as fs } from 'fs';
import { isLimitedFsRuntime } from '@voice-framework/utils/fs-safe';
import { getVectorsFile } from './storage-paths';

export interface VectorEntry {
  id: string;
  kind: 'resource' | 'contribution';
  refId: string;
  values: number[];
  createdAt: string;
}

async function readVectorsFile(): Promise<VectorEntry[]> {
  try {
    const data = await fs.readFile(getVectorsFile(), 'utf-8');
    const items = JSON.parse(data);
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

async function ensureVectorsFile(): Promise<void> {
  const vectorsFile = getVectorsFile();
  try {
    await fs.readFile(vectorsFile, 'utf-8');
  } catch {
    try {
      await fs.writeFile(vectorsFile, JSON.stringify([], null, 2));
    } catch {
      /* Workers may not persist legacy vectors — semantic index is canonical */
    }
  }
}

export async function loadVectors(): Promise<VectorEntry[]> {
  if (isLimitedFsRuntime()) {
    return readVectorsFile();
  }
  await ensureVectorsFile();
  return readVectorsFile();
}

export async function saveVectors(entries: VectorEntry[]): Promise<void> {
  if (isLimitedFsRuntime()) {
    try {
      await fs.writeFile(getVectorsFile(), JSON.stringify(entries, null, 2));
    } catch {
      /* ephemeral /tmp only on edge */
    }
    return;
  }
  await fs.writeFile(getVectorsFile(), JSON.stringify(entries, null, 2));
}

export async function addVector(
  kind: VectorEntry['kind'],
  refId: string,
  values: number[]
): Promise<VectorEntry> {
  const entries = await loadVectors();
  const entry: VectorEntry = {
    id: `vec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    refId,
    values,
    createdAt: new Date().toISOString()
  };
  entries.push(entry);
  await saveVectors(entries);
  return entry;
}

