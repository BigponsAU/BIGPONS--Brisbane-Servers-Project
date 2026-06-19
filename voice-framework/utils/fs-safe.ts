/**
 * Filesystem helpers safe on Cloudflare Workers (unenv: no sync fs, partial async fs).
 */
import { promises as fs } from 'fs';

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

function isUnenvFsError(error: unknown): boolean {
  const msg = errorMessage(error);
  return msg.includes('[unenv]') || msg.includes('not implemented');
}

/** True when running on the edge API worker or file mirror is disabled. */
export function isLimitedFsRuntime(): boolean {
  return process.env.EDGE_WORKER === '1' || process.env.CORPUS_SKIP_FILE_MIRROR === '1';
}

/**
 * Create a directory if needed. No-ops when Workers unenv cannot mkdir (e.g. parent /tmp already exists).
 */
export async function ensureDirExists(dir: string): Promise<void> {
  const normalized = dir.replace(/\\/g, '/');
  if (!normalized || normalized === '.' || normalized === '/') return;

  // Workers unenv: mkdir is not implemented; corpus files live directly under /tmp.
  if (isLimitedFsRuntime()) return;

  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error: unknown) {
    if (isUnenvFsError(error)) return;
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
    if (code === 'EEXIST') return;
    throw error;
  }
}
