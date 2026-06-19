/**
 * Canonical filesystem paths for local Node-backed storage.
 * Lazy getters — safe on Cloudflare Workers (no module-init path.join).
 */

import * as path from 'path';
import { getMonorepoRoot, voiceFrameworkStorageDir } from './monorepo-root';

function storageDir(): string {
  return voiceFrameworkStorageDir();
}

export function getResourcesFile(): string {
  return path.join(storageDir(), 'resources.json');
}

export function getSemanticIndexFile(): string {
  return path.join(storageDir(), 'semantic-index.json');
}

export function getProfilesFile(): string {
  return path.join(storageDir(), 'profiles.json');
}

export function getTextStorageFile(): string {
  return path.join(storageDir(), 'text-storage.json');
}

export function getDefaultVoiceProfileFile(): string {
  return path.join(getMonorepoRoot(), 'voice-framework', 'voice-profile.json');
}

export function getVectorsFile(): string {
  return path.join(storageDir(), 'vectors.json');
}

export function getUsersJsonFile(): string {
  return path.join(storageDir(), 'users.json');
}

export function getSessionsJsonFile(): string {
  return path.join(storageDir(), 'sessions.json');
}

export function getAuthTokensJsonFile(): string {
  return path.join(storageDir(), 'auth-tokens.json');
}
