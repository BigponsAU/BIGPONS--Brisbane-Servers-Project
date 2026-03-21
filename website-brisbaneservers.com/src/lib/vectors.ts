/**
 * Legacy 1D score vectors (contributions / compatibility).
 * Semantic retrieval uses `semantic/chunk-index` and `semantic-index.json`.
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '../../../../');
const VECTORS_FILE = path.join(projectRoot, 'voice-framework', 'storage', 'vectors.json');

export interface VectorEntry {
  id: string;
  kind: 'resource' | 'contribution';
  refId: string;
  values: number[];
  createdAt: string;
}

async function ensureVectorsFile(): Promise<void> {
  try {
    await fs.access(VECTORS_FILE);
  } catch {
    await fs.mkdir(path.dirname(VECTORS_FILE), { recursive: true });
    await fs.writeFile(VECTORS_FILE, JSON.stringify([], null, 2));
  }
}

export async function loadVectors(): Promise<VectorEntry[]> {
  await ensureVectorsFile();
  const data = await fs.readFile(VECTORS_FILE, 'utf-8');
  try {
    const items = JSON.parse(data);
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

export async function saveVectors(entries: VectorEntry[]): Promise<void> {
  await fs.writeFile(VECTORS_FILE, JSON.stringify(entries, null, 2));
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

