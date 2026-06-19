import { existsSync } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

function isCloudflareWorkerRuntime(): boolean {
  try {
    return typeof navigator !== 'undefined' && /Cloudflare-Workers/i.test(navigator.userAgent ?? '');
  } catch {
    return false;
  }
}

function resolveWebsitePackageRoot(): string {
  if (isCloudflareWorkerRuntime()) {
    return '/tmp/brisbane-website';
  }
  try {
    const __filename = fileURLToPath(import.meta.url);
    return path.resolve(path.dirname(__filename), '../..');
  } catch {
    return process.env.WEBSITE_PACKAGE_ROOT?.trim() || '/tmp/brisbane-website';
  }
}

/** website-brisbaneservers.com package root */
export const websitePackageRoot = resolveWebsitePackageRoot();

/**
 * Repository root (O1/) containing `voice-framework/storage`.
 * Override with MONOREPO_ROOT for one-off scripts (migrate, bootstrap).
 */
export function getMonorepoRoot(): string {
  const envRoot = process.env.MONOREPO_ROOT?.trim();
  if (envRoot) {
    return path.resolve(envRoot);
  }

  if (isCloudflareWorkerRuntime() || process.env.EDGE_WORKER === '1') {
    return '/tmp/brisbane-monorepo';
  }

  const candidates = [path.resolve(websitePackageRoot, '..'), websitePackageRoot];

  for (const root of candidates) {
    if (existsSync(path.join(root, 'voice-framework', 'storage'))) {
      return root;
    }
  }

  return path.resolve(websitePackageRoot, '..');
}

/** Git-tracked seed JSON used by bootstrap/migration scripts. */
export function voiceFrameworkSeedStorageDir(): string {
  return path.join(getMonorepoRoot(), 'voice-framework', 'storage');
}

/**
 * Writable corpus mirror for ProfileManager / TextStorage.
 * On the edge worker, Postgres is source of truth; /tmp is a read shim only.
 */
export function voiceFrameworkStorageDir(): string {
  const override = process.env.VOICE_STORAGE_DIR?.trim();
  if (override) {
    return path.resolve(override);
  }
  if (isCloudflareWorkerRuntime() || process.env.EDGE_WORKER === '1') {
    return '/tmp';
  }
  return voiceFrameworkSeedStorageDir();
}
