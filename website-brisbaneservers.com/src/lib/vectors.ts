/**
 * Legacy 1D score vectors (contributions / compatibility).
 * Semantic retrieval uses `semantic/chunk-index` and `semantic-index.json`.
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { getVectorsFile } from './storage-paths';

export interface VectorEntry {
  id: string;
  kind: 'resource' | 'contribution';
  refId: string;
  values: number[];
  createdAt: string;
}

async function ensureVectorsFile(): Promise<void> {
  const vectorsFile = getVectorsFile();
  try {
    await fs.access(vectorsFile);
  } catch {
    await fs.mkdir(path.dirname(vectorsFile), { recursive: true });
    await fs.writeFile(vectorsFile, JSON.stringify([], null, 2));
  }
}

export async function loadVectors(): Promise<VectorEntry[]> {
  await ensureVectorsFile();
  const data = await fs.readFile(getVectorsFile(), 'utf-8');
  try {
    const items = JSON.parse(data);
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

export async function saveVectors(entries: VectorEntry[]): Promise<void> {
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

