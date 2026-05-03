import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { ProfileBuilder } from '../../builders/profile-builder';
import { ProfileManager, type ProfileMetadata } from '../../storage/profile-manager';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RESOURCES_FILE = path.join(__dirname, '../../storage/resources.json');

export interface CorpusResource {
  id: string;
  title?: string;
  description?: string;
  content?: string;
  isStarterBlock?: boolean;
  status?: 'draft' | 'published' | 'archived' | string;
  visibility?: 'public' | 'private' | 'starter' | string;
  metadata?: {
    voiceProfileId?: string;
    profileId?: string;
    semanticLevel?: 'high' | 'medium' | 'normal' | string;
  };
}

export interface ProfileCorpusSummary {
  profileId: string;
  profileName?: string;
  resourceIds: string[];
  resourceCount: number;
  indexedCount: number;
  lastBuiltAt?: string;
}

function isSeedResource(resource: CorpusResource): boolean {
  if (resource.status === 'archived') return false;
  if (resource.isStarterBlock === true) return true;
  if (resource.status !== 'published') return false;
  return (
    resource.visibility === undefined ||
    resource.visibility === 'public' ||
    resource.visibility === 'starter'
  );
}

function toSampleText(resource: CorpusResource): string {
  return [resource.title, resource.description, resource.content]
    .filter((part) => typeof part === 'string' && part.trim().length > 0)
    .join('\n\n')
    .trim();
}

function uniqueIds(ids: string[]): string[] {
  return Array.from(new Set(ids.filter(Boolean)));
}

function countIndexed(resources: CorpusResource[], ids: string[]): number {
  const set = new Set(ids);
  return resources.filter((resource) => set.has(resource.id) && (resource.metadata?.semanticLevel || '').length > 0).length;
}

export async function loadDashboardResources(): Promise<CorpusResource[]> {
  try {
    await fs.access(RESOURCES_FILE);
  } catch {
    await fs.writeFile(RESOURCES_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
  const fileData = await fs.readFile(RESOURCES_FILE, 'utf-8');
  const parsed = JSON.parse(fileData);
  return Array.isArray(parsed) ? parsed : [];
}

export function buildCorpusSummary(
  metadata: ProfileMetadata,
  resources: CorpusResource[]
): ProfileCorpusSummary {
  const resourceIds = uniqueIds(metadata.corpusResourceIds || []);
  return {
    profileId: metadata.id,
    profileName: metadata.name,
    resourceIds,
    resourceCount: resourceIds.length,
    indexedCount: countIndexed(resources, resourceIds),
    lastBuiltAt: metadata.corpusLastBuiltAt,
  };
}

export async function attachResourceToProfileCorpus(
  profileManager: ProfileManager,
  profileId: string,
  resourceId: string,
  resources?: CorpusResource[]
): Promise<ProfileCorpusSummary> {
  const currentResources = resources || (await loadDashboardResources());
  const metadata = profileManager.getAllProfiles().find((profile) => profile.id === profileId);
  if (!metadata) {
    throw new Error(`Profile not found: ${profileId}`);
  }
  const nextIds = uniqueIds([...(metadata.corpusResourceIds || []), resourceId]);
  await profileManager.updateProfile(profileId, {}, {
    corpusResourceIds: nextIds,
    corpusResourceCount: nextIds.length,
    corpusIndexedCount: countIndexed(currentResources, nextIds),
  });

  const nextMetadata = profileManager.getAllProfiles().find((profile) => profile.id === profileId) || metadata;
  return buildCorpusSummary(nextMetadata, currentResources);
}

export async function rebuildProfileFromCorpus(
  profileManager: ProfileManager,
  profileBuilder: ProfileBuilder,
  profileId: string,
  resources?: CorpusResource[]
): Promise<{ metadata: ProfileMetadata; summary: ProfileCorpusSummary }> {
  const currentResources = resources || (await loadDashboardResources());
  const metadata = profileManager.getAllProfiles().find((profile) => profile.id === profileId);
  if (!metadata) {
    throw new Error(`Profile not found: ${profileId}`);
  }

  const corpusIds = uniqueIds(metadata.corpusResourceIds || []);
  const corpusResources = currentResources.filter((resource) => corpusIds.includes(resource.id));
  const samples = corpusResources.map(toSampleText).filter((text) => text.length > 0);
  if (samples.length < 3) {
    throw new Error('Profile corpus needs at least 3 resources with text content');
  }

  const builtProfile = await profileBuilder.buildFromSamples(samples, {
    name: metadata.name,
    description: metadata.description || `Profile rebuilt from ${samples.length} corpus resources.`,
  });

  await profileManager.updateProfile(profileId, builtProfile, {
    corpusResourceIds: corpusIds,
    corpusResourceCount: corpusIds.length,
    corpusIndexedCount: countIndexed(currentResources, corpusIds),
    corpusLastBuiltAt: new Date().toISOString(),
  });

  const updatedMetadata = profileManager.getAllProfiles().find((profile) => profile.id === profileId);
  if (!updatedMetadata) {
    throw new Error(`Profile not found after rebuild: ${profileId}`);
  }
  return {
    metadata: updatedMetadata,
    summary: buildCorpusSummary(updatedMetadata, currentResources),
  };
}

export async function syncDefaultBigponsCorpus(
  profileManager: ProfileManager,
  profileBuilder: ProfileBuilder,
  resources?: CorpusResource[]
): Promise<{ metadata: ProfileMetadata; summary: ProfileCorpusSummary }> {
  const currentResources = resources || (await loadDashboardResources());
  const seedResources = currentResources.filter(isSeedResource);
  const seedIds = uniqueIds(seedResources.map((resource) => resource.id));
  const samples = seedResources.map(toSampleText).filter((text) => text.length > 0);
  if (samples.length < 3) {
    throw new Error('BIGPONS corpus needs at least 3 public website resources with text content');
  }

  const builtProfile = await profileBuilder.buildFromSamples(samples, {
    name: 'BIGPONS (Brisbane Servers)',
    description: 'Default Brisbane Servers voice profile compiled from the current public website resource library.',
  });

  const profiles = profileManager.getAllProfiles();
  const existing = profiles.find((profile) =>
    (profile.tags || []).some((tag) => /bigpons|bifpons|brisbane/i.test(tag)) ||
    /bigpons|brisbane servers/i.test(profile.name || '')
  );

  let profileId: string;
  if (existing) {
    profileId = existing.id;
    await profileManager.updateProfile(profileId, builtProfile, {
      name: 'BIGPONS (Brisbane Servers)',
      description: 'Default Brisbane Servers voice profile compiled from the current public website resource library.',
      tags: uniqueIds([...(existing.tags || []), 'bigpons-default', 'brisbane-servers', 'bifpons-site-corpus']),
      corpusResourceIds: seedIds,
      corpusResourceCount: seedIds.length,
      corpusIndexedCount: countIndexed(currentResources, seedIds),
      corpusLastBuiltAt: new Date().toISOString(),
      isDefault: true,
    });
  } else {
    const created = await profileManager.createProfile(builtProfile, {
      name: 'BIGPONS (Brisbane Servers)',
      description: 'Default Brisbane Servers voice profile compiled from the current public website resource library.',
      version: '1.0.0',
      tags: ['bigpons-default', 'brisbane-servers', 'bifpons-site-corpus'],
      isDefault: true,
      corpusResourceIds: seedIds,
      corpusResourceCount: seedIds.length,
      corpusIndexedCount: countIndexed(currentResources, seedIds),
      corpusLastBuiltAt: new Date().toISOString(),
    });
    profileId = created.id;
  }

  await profileManager.setDefaultProfile(profileId);
  const metadata = profileManager.getAllProfiles().find((profile) => profile.id === profileId);
  if (!metadata) {
    throw new Error('Failed to resolve BIGPONS profile metadata after sync');
  }

  return {
    metadata,
    summary: buildCorpusSummary(metadata, currentResources),
  };
}
