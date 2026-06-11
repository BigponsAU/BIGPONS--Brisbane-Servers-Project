/**
 * Canonical filesystem paths for local Node-backed storage.
 * Lazy getters — safe on Cloudflare Workers (no module-init path.join).
 */

import * as path from 'path';
import { voiceFrameworkStorageDir } from './monorepo-root';

function storageDir(): string {
  return voiceFrameworkStorageDir();
}

export function getResourcesFile(): string {
  return path.join(storageDir(), 'resources.json');
}

export function getSemanticIndexFile(): string {
  return path.join(storageDir(), 'semantic-index.json');
}

export function getSqliteDbFile(): string {
  return path.join(storageDir(), 'resources.db');
}

export function getAuthSqliteDbFile(): string {
  return path.join(storageDir(), 'auth.db');
}
