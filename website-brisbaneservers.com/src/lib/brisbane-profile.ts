/**
 * Brisbane — site-wide default voice profile every account inherits.
 * Built from published resources, guides, starters, and case studies.
 */

import type { ProfileBuilder } from '@voice-framework/builders/profile-builder';
import type { ProfileManager } from '@voice-framework/storage/profile-manager';
import type { ProfileMetadata } from '@voice-framework/storage/profile-manager';
import { loadResources, saveResources, type Resource } from './resources-api';
import { resourcesForSiteVoiceCorpus } from './resource-voice-profile';
import { runIndexPipeline } from './semantic/pipeline';
import { syncCaseStudiesToResources } from './case-study-corpus';
import { syncTopicGuidesToResources } from './topic-guide-corpus';

export const BRISBANE_PROFILE_NAME = 'Brisbane';
export const BRISBANE_PROFILE_TAG = 'brisbane-user-default';
export const LEGACY_BIGPONS_TAG = 'bigpons-default';

export function resourcesForVoiceMapIndex(resources: Resource[]): Resource[] {
  const byId = new Map<string, Resource>();
  for (const r of resources) {
    if (!r.content?.trim()) continue;
    if (r.status === 'archived') continue;
    if (r.isStarterBlock) {
      byId.set(r.id, r);
      continue;
    }
    if (r.status === 'published') {
      byId.set(r.id, r);
    }
  }
  return [...byId.values()];
}

/** Minimal fields used to detect the site default Brisbane profile. */
export type BrisbaneProfileLookup = {
  id: string;
  name: string;
  tags?: string[];
  isDefault?: boolean;
  corpusResourceIds?: string[];
};

export function findBrisbaneProfileMeta(
  profiles: BrisbaneProfileLookup[]
): BrisbaneProfileLookup | undefined {
  return profiles.find(
    (p) =>
      p.tags?.includes(BRISBANE_PROFILE_TAG) ||
      p.tags?.includes(LEGACY_BIGPONS_TAG) ||
      p.name === BRISBANE_PROFILE_NAME ||
      p.name === 'BIGPONS (Brisbane Servers)' ||
      p.name === 'Brisbane Servers Base Profile'
  );
}

export interface EnsureBrisbaneProfileResult {
  profile: ProfileMetadata;
  created: boolean;
  corpusCount: number;
  corpusResourceIds: string[];
}

/**
 * Build or refresh the Brisbane default profile from the public site corpus.
 */
export async function ensureBrisbaneProfile(
  profileManager: ProfileManager,
  profileBuilder: ProfileBuilder,
  resources?: Resource[]
): Promise<EnsureBrisbaneProfileResult> {
  let allResources = resources;
  if (!allResources) {
    const caseSync = await syncCaseStudiesToResources();
    const guideSync = await syncTopicGuidesToResources(caseSync.resources);
    allResources = guideSync.resources;
  }
  const corpus = resourcesForSiteVoiceCorpus(allResources);

  if (corpus.length === 0) {
    throw new Error('NO_VOICE_SOURCE_CONTENT');
  }

  const corpusIds = corpus.map((r) => r.id).slice(0, 300);
  const starterCount = corpus.filter((r) => r.isStarterBlock).length;
  const caseStudyCount = corpus.filter((r) => r.metadata?.growthKind === 'case_study').length;

  const samples = corpus.map((r) => r.content);
  const profileDescription = `Brisbane site voice — ${corpus.length} resources (starters, guides, articles, case studies). Every account uses this as the base profile.`;
  const built = await profileBuilder.buildFromSamples(samples, {
    name: BRISBANE_PROFILE_NAME,
    description: profileDescription,
    sourceDocument: `brisbane-corpus:v=1;count=${corpus.length};starters=${starterCount};caseStudies=${caseStudyCount}`,
  });

  const existing = findBrisbaneProfileMeta(profileManager.getAllProfiles());
  const corpusMeta = { corpusResourceIds: corpusIds };
  const tags = [BRISBANE_PROFILE_TAG, LEGACY_BIGPONS_TAG, 'brisbane-servers', 'site-corpus', 'user-default'];

  let profileMeta: ProfileMetadata;
  let created = false;

  if (existing) {
    await profileManager.updateProfile(existing.id, built, {
      name: BRISBANE_PROFILE_NAME,
      description: profileDescription,
      sourceDocument: built.sourceDocument,
      tags,
      ...corpusMeta,
    });
    await profileManager.setDefaultProfile(existing.id);
    const refreshed = profileManager.getAllProfiles().find((p) => p.id === existing.id);
    if (!refreshed) {
      throw new Error(`Brisbane profile ${existing.id} missing after update`);
    }
    profileMeta = refreshed;
  } else {
    profileMeta = await profileManager.createProfile(built, {
      name: BRISBANE_PROFILE_NAME,
      description: profileDescription,
      sourceDocument: built.sourceDocument,
      version: '1.0.0',
      isDefault: true,
      archived: false,
      tags,
      ...corpusMeta,
    });
    await profileManager.setDefaultProfile(profileMeta.id);
    created = true;
  }

  return {
    profile: profileMeta,
    created,
    corpusCount: corpus.length,
    corpusResourceIds: corpusIds,
  };
}

export interface BootstrapVoiceCorpusResult {
  brisbane: EnsureBrisbaneProfileResult;
  caseStudies: { added: number; updated: number; totalCaseStudies: number };
  topicGuides: { added: number; updated: number; totalGuides: number };
  indexed: number;
  indexFailed: number;
  indexSkipped: number;
  chunkStats: { chunkCount: number; resourceIds: number };
}

/**
 * Reindex all publishable resources for the voice map, then rebuild Brisbane profile.
 */
export async function bootstrapVoiceCorpus(
  profileManager: ProfileManager,
  profileBuilder: ProfileBuilder
): Promise<BootstrapVoiceCorpusResult> {
  const caseStudySync = await syncCaseStudiesToResources();
  const topicGuideSync = await syncTopicGuidesToResources(caseStudySync.resources);
  let resources = topicGuideSync.resources;
  const toIndex = resourcesForVoiceMapIndex(resources);
  let indexed = 0;
  let indexFailed = 0;
  let indexSkipped = 0;

  for (let i = 0; i < resources.length; i += 1) {
    const r = resources[i];
    if (!toIndex.some((t) => t.id === r.id)) {
      indexSkipped += 1;
      continue;
    }
    const updated = await runIndexPipeline(r);
    resources[i] = updated;
    if (updated.processingStatus === 'failed') {
      indexFailed += 1;
    } else {
      indexed += 1;
    }
  }

  await saveResources(resources);

  const brisbane = await ensureBrisbaneProfile(profileManager, profileBuilder, resources);

  const { getSemanticIndexStats } = await import('./semantic/chunk-index');
  const chunkStats = await getSemanticIndexStats();

  return {
    brisbane,
    caseStudies: {
      added: caseStudySync.added,
      updated: caseStudySync.updated,
      totalCaseStudies: caseStudySync.totalCaseStudies,
    },
    topicGuides: {
      added: topicGuideSync.added,
      updated: topicGuideSync.updated,
      totalGuides: topicGuideSync.totalGuides,
    },
    indexed,
    indexFailed,
    indexSkipped,
    chunkStats: {
      chunkCount: chunkStats.chunkCount,
      resourceIds: chunkStats.resourceIds,
    },
  };
}
