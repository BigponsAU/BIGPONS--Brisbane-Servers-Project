#!/usr/bin/env npx tsx
/**
 * Backfill ownerId on legacy user resources created before generate/upload set ownership.
 *
 * Editors only see resources where ownerId === their user id (see resource-access.ts).
 * Orphans (no ownerId, not starter/system) are invisible in the Resource Tree.
 *
 * Examples:
 *   npx tsx scripts/backfill-resource-owner-ids.ts
 *   npx tsx scripts/backfill-resource-owner-ids.ts --apply
 *   DATABASE_URL=... npx tsx scripts/backfill-resource-owner-ids.ts --apply
 *   npx tsx scripts/backfill-resource-owner-ids.ts --local
 *   npx tsx scripts/backfill-resource-owner-ids.ts --owner-id=user-123 --apply
 *   npx tsx scripts/backfill-resource-owner-ids.ts --map-file=./owner-map.json --apply
 *
 * owner-map.json: { "resource-id": "user-id", ... }
 *
 * Default is dry-run (no writes). Requires DATABASE_URL unless --local.
 */
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import type { Resource } from '../src/lib/resource-types';
import { loadUsers } from '../src/lib/db/users';
import { voiceFrameworkSeedStorageDir } from '../src/lib/monorepo-root';

type ResolutionReason = 'generatedBy' | 'map' | 'default-owner' | 'owner-id-all';

interface PlannedUpdate {
  resource: Resource;
  ownerId: string;
  reason: ResolutionReason;
  detail: string;
}

interface CliOptions {
  apply: boolean;
  local: boolean;
  ownerIdAll?: string;
  defaultOwnerId?: string;
  mapFile?: string;
  inlineMaps: Map<string, string>;
  json: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    apply: false,
    local: false,
    inlineMaps: new Map(),
    json: false,
  };

  for (const arg of argv) {
    if (arg === '--apply') opts.apply = true;
    else if (arg === '--local') opts.local = true;
    else if (arg === '--json') opts.json = true;
    else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (arg.startsWith('--owner-id=')) {
      opts.ownerIdAll = arg.slice('--owner-id='.length).trim();
    } else if (arg.startsWith('--default-owner-id=')) {
      opts.defaultOwnerId = arg.slice('--default-owner-id='.length).trim();
    } else if (arg.startsWith('--map-file=')) {
      opts.mapFile = arg.slice('--map-file='.length).trim();
    } else if (arg.startsWith('--map=')) {
      const pair = arg.slice('--map='.length);
      const sep = pair.indexOf(':');
      if (sep <= 0) {
        console.error(`Invalid --map= value (expected resourceId:userId): ${pair}`);
        process.exit(1);
      }
      opts.inlineMaps.set(pair.slice(0, sep).trim(), pair.slice(sep + 1).trim());
    } else {
      console.error(`Unknown argument: ${arg}`);
      printHelp();
      process.exit(1);
    }
  }

  return opts;
}

function printHelp(): void {
  console.log(`backfill-resource-owner-ids — assign ownerId to legacy resources

Flags:
  --apply                 Write changes (default: dry-run report only)
  --local                 Use voice-framework/storage/resources.json (no DATABASE_URL)
  --owner-id=<userId>     Assign every orphan to this user
  --default-owner-id=<id> Fallback user when generatedBy / map cannot resolve
  --map=<resourceId>:<userId>   Single explicit mapping (repeatable)
  --map-file=<path>       JSON object { "resourceId": "userId", ... }
  --json                  Machine-readable summary on stdout
  --help                  Show this help
`);
}

function isOrphanCandidate(resource: Resource): boolean {
  if (resource.ownerId) return false;
  if (resource.isStarterBlock === true) return false;
  if (resource.visibility === 'starter') return false;
  return true;
}

function skipReason(resource: Resource): string | null {
  if (resource.ownerId === 'system') return 'system corpus';
  if (resource.isStarterBlock === true) return 'starter block';
  if (resource.visibility === 'starter') return 'starter visibility';
  if (resource.ownerId) return `already owned (${resource.ownerId})`;
  return null;
}

async function loadResourcesFromStore(local: boolean): Promise<Resource[]> {
  if (local) {
    const file = path.join(voiceFrameworkSeedStorageDir(), 'resources.json');
    const raw = await fs.readFile(file, 'utf-8');
    const { asCorpusArray } = await import('../src/lib/corpus-payload-coerce');
    return asCorpusArray<Resource>(JSON.parse(raw) as unknown, []);
  }
  const { loadResources } = await import('../src/lib/resources-api');
  return loadResources();
}

async function saveResourcesLocal(resources: Resource[]): Promise<void> {
  const file = path.join(voiceFrameworkSeedStorageDir(), 'resources.json');
  await fs.writeFile(file, JSON.stringify(resources, null, 2), 'utf-8');
}

async function saveResourcesToStore(local: boolean, resources: Resource[]): Promise<void> {
  if (local) {
    await saveResourcesLocal(resources);
    return;
  }
  const { saveResources } = await import('../src/lib/resources-api');
  await saveResources(resources);
}

async function loadOwnerMap(opts: CliOptions): Promise<Map<string, string>> {
  const map = new Map(opts.inlineMaps);
  if (!opts.mapFile) return map;

  const raw = await fs.readFile(path.resolve(opts.mapFile), 'utf-8');
  const parsed = JSON.parse(raw) as Record<string, string>;
  for (const [resourceId, userId] of Object.entries(parsed)) {
    if (resourceId && userId) map.set(resourceId, userId);
  }
  return map;
}

async function buildEmailToUserId(): Promise<Map<string, string>> {
  const emailToId = new Map<string, string>();
  try {
    const users = await loadUsers();
    for (const user of users) {
      emailToId.set(user.email.trim().toLowerCase(), user.id);
    }
  } catch (error) {
    console.warn(
      '[backfill] Could not load users from DATABASE_URL — generatedBy matching disabled.',
      error instanceof Error ? error.message : error
    );
  }
  return emailToId;
}

async function planUpdates(
  resources: Resource[],
  opts: CliOptions,
  ownerMap: Map<string, string>,
  emailToUserId: Map<string, string>
): Promise<{ updates: PlannedUpdate[]; skipped: { resource: Resource; reason: string }[]; unresolved: Resource[] }> {
  const updates: PlannedUpdate[] = [];
  const skipped: { resource: Resource; reason: string }[] = [];
  const unresolved: Resource[] = [];

  for (const resource of resources) {
    const skip = skipReason(resource);
    if (skip) {
      skipped.push({ resource, reason: skip });
      continue;
    }
    if (!isOrphanCandidate(resource)) {
      skipped.push({ resource, reason: 'not an orphan candidate' });
      continue;
    }

    if (opts.ownerIdAll) {
      updates.push({
        resource,
        ownerId: opts.ownerIdAll,
        reason: 'owner-id-all',
        detail: `--owner-id=${opts.ownerIdAll}`,
      });
      continue;
    }

    const mapped = ownerMap.get(resource.id);
    if (mapped) {
      updates.push({
        resource,
        ownerId: mapped,
        reason: 'map',
        detail: `map → ${mapped}`,
      });
      continue;
    }

    const generatedBy = resource.generatedBy?.trim().toLowerCase();
    if (generatedBy && emailToUserId.has(generatedBy)) {
      const ownerId = emailToUserId.get(generatedBy)!;
      updates.push({
        resource,
        ownerId,
        reason: 'generatedBy',
        detail: `generatedBy ${generatedBy} → ${ownerId}`,
      });
      continue;
    }

    if (opts.defaultOwnerId) {
      updates.push({
        resource,
        ownerId: opts.defaultOwnerId,
        reason: 'default-owner',
        detail: `--default-owner-id=${opts.defaultOwnerId}`,
      });
      continue;
    }

    unresolved.push(resource);
  }

  return { updates, skipped, unresolved };
}

function printReport(
  opts: CliOptions,
  updates: PlannedUpdate[],
  skipped: { resource: Resource; reason: string }[],
  unresolved: Resource[]
): void {
  const mode = opts.apply ? 'APPLY' : 'DRY-RUN';
  const store = opts.local ? 'local JSON' : 'DATABASE_URL corpus';

  console.log(`\n[backfill] ${mode} — store: ${store}`);
  console.log(`[backfill] Would update: ${updates.length}`);
  console.log(`[backfill] Skipped: ${skipped.length}`);
  console.log(`[backfill] Unresolved: ${unresolved.length}\n`);

  if (updates.length > 0) {
    console.log('── Planned ownerId assignments ──');
    for (const row of updates) {
      console.log(
        `  ${row.resource.id}\n    title: ${row.resource.title || row.resource.topic}\n    → ${row.ownerId} (${row.reason}: ${row.detail})`
      );
    }
    console.log('');
  }

  if (unresolved.length > 0) {
    console.log('── Unresolved (no owner assigned) ──');
    for (const resource of unresolved) {
      console.log(
        `  ${resource.id} — ${resource.title || resource.topic}` +
          (resource.generatedBy ? ` (generatedBy: ${resource.generatedBy})` : ' (no generatedBy)')
      );
    }
    console.log('\nTip: use --map-file, --map=id:userId, --default-owner-id, or --owner-id for these.\n');
  }
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));

  if (!opts.local && !process.env.DATABASE_URL?.trim()) {
    console.error('Set DATABASE_URL (production corpus) or pass --local for voice-framework/storage/resources.json.');
    process.exit(1);
  }

  const ownerMap = await loadOwnerMap(opts);
  const emailToUserId = opts.ownerIdAll ? new Map<string, string>() : await buildEmailToUserId();

  const resources = await loadResourcesFromStore(opts.local);
  const { updates, skipped, unresolved } = await planUpdates(resources, opts, ownerMap, emailToUserId);

  if (opts.json) {
    console.log(
      JSON.stringify(
        {
          mode: opts.apply ? 'apply' : 'dry-run',
          store: opts.local ? 'local' : 'postgres',
          counts: {
            total: resources.length,
            update: updates.length,
            skipped: skipped.length,
            unresolved: unresolved.length,
          },
          updates: updates.map((u) => ({
            id: u.resource.id,
            title: u.resource.title,
            ownerId: u.ownerId,
            reason: u.reason,
            detail: u.detail,
          })),
          unresolved: unresolved.map((r) => ({
            id: r.id,
            title: r.title,
            generatedBy: r.generatedBy ?? null,
          })),
        },
        null,
        2
      )
    );
  } else {
    printReport(opts, updates, skipped, unresolved);
  }

  if (!opts.apply) {
    if (updates.length > 0 && !opts.json) {
      console.log('Re-run with --apply to persist changes.\n');
    }
    process.exit(unresolved.length > 0 && updates.length === 0 ? 2 : 0);
  }

  if (updates.length === 0) {
    console.log('[backfill] Nothing to apply.');
    process.exit(unresolved.length > 0 ? 2 : 0);
  }

  const byId = new Map(updates.map((u) => [u.resource.id, u.ownerId]));
  let applied = 0;
  const next = resources.map((resource) => {
    const ownerId = byId.get(resource.id);
    if (!ownerId) return resource;
    applied += 1;
    return { ...resource, ownerId };
  });

  await saveResourcesToStore(opts.local, next);
  console.log(`[backfill] Applied ownerId to ${applied} resource(s).`);
}

main().catch((error) => {
  console.error('[backfill] Failed:', error);
  process.exit(1);
});
