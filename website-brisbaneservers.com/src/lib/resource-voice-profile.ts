/**
 * Resolve which VoiceProfile drives resource creation and catalogue-style descriptions.
 * Mirrors public library sources (starters + public catalogue) when no default is stored.
 * The saved **BIGPONS** profile uses the public site resource corpus — see `resourcesForSiteVoiceCorpus` in this file.
 */

import { CONSULTING_FALLBACK_VOICE_PROFILE } from './consulting-voice-fallback';
import type { VoiceProfile } from '@voice-framework/models/voice-profile';
import type { ProfileManager } from '@voice-framework/storage/profile-manager';
import type { ProfileBuilder } from '@voice-framework/builders/profile-builder';
import type { Resource, VoiceProfileResolutionKind } from './resource-types';
import { isPublicResource } from './resource-types';
import { catalogDescriptionFromArticle } from './catalog-copy';

/** @deprecated Design System JSON must not drive portal resolution — use consulting fallback. */
export const BUNDLED_VOICE_PROFILE = CONSULTING_FALLBACK_VOICE_PROFILE;

export interface ResolvedResourceVoiceProfile {
  profile: VoiceProfile;
  /** Set when profile came from stored metadata (requested or default). */
  voiceProfileId?: string;
  resolution: VoiceProfileResolutionKind;
}

export interface ResolveResourceVoiceProfileParams {
  requestedProfileId?: string | null;
  profileManager: ProfileManager;
  profileBuilder: ProfileBuilder;
  resources: Resource[];
}

/**
 * Site voice corpus: starter curriculum + public website resources, deduped by id.
 * Same rules as POST /api/profiles/create-base (BIGPONS build).
 */
export function resourcesForSiteVoiceCorpus(resources: Resource[]): Resource[] {
  const byId = new Map<string, Resource>();
  for (const r of resources) {
    if (!r.content?.trim()) continue;
    if (r.status === 'archived') continue;
    if (r.isStarterBlock === true) {
      byId.set(r.id, r);
      continue;
    }
    if (isPublicResource(r)) {
      byId.set(r.id, r);
    }
  }
  return [...byId.values()];
}

/**
 * Starters + **public** published catalogue (anonymous-safe). Used for ephemeral library-derived voice
 * when no saved default exists — same public resource boundary as BIGPONS corpus (see {@link resourcesForSiteVoiceCorpus}).
 */
export function resourcesForLibraryVoiceSources(resources: Resource[]): Resource[] {
  const starterBlocks = resources.filter((r) => r.isStarterBlock === true);
  const publishedPublic = resources.filter((r) => isPublicResource(r));
  const byId = new Map<string, Resource>();
  for (const r of starterBlocks) {
    byId.set(r.id, r);
  }
  for (const r of publishedPublic) {
    byId.set(r.id, r);
  }
  return [...byId.values()].filter((r) => r.content && r.content.trim().length > 0);
}

const EPHEMERAL_MAX_SOURCES = 14;
const EPHEMERAL_MAX_CHARS = 12_000;

function librarySampleTexts(resources: Resource[]): string[] {
  return resourcesForLibraryVoiceSources(resources)
    .slice(0, EPHEMERAL_MAX_SOURCES)
    .map((r) => r.content.trim().slice(0, EPHEMERAL_MAX_CHARS));
}

/**
 * Pick the profile that should shape generation and validation for this resource write.
 */
export async function resolveResourceVoiceProfile(
  params: ResolveResourceVoiceProfileParams
): Promise<ResolvedResourceVoiceProfile> {
  const { requestedProfileId, profileManager, profileBuilder, resources } = params;
  const rid = typeof requestedProfileId === 'string' ? requestedProfileId.trim() : '';

  if (rid) {
    const profile = profileManager.getProfile(rid);
    if (profile) {
      return { profile, voiceProfileId: rid, resolution: 'requested' };
    }
    console.warn(`[resource-voice-profile] Unknown profileId "${rid}"; falling back to default or library.`);
  }

  const defaultProfile = profileManager.getDefaultProfile();
  if (defaultProfile) {
    const defaultId = profileManager.getStats().defaultProfileId;
    return {
      profile: defaultProfile,
      voiceProfileId: defaultId,
      resolution: 'default'
    };
  }

  const samples = librarySampleTexts(resources);
  if (samples.length > 0) {
    const profile = await profileBuilder.buildFromSamples(samples, {
      name: 'Library-derived (ephemeral)',
      description:
        'Synthesized from published resources and starter blocks for this request (not persisted as a profile entry).',
      sourceDocument: 'ephemeral:library-voice-sources'
    });
    return { profile, resolution: 'library_ephemeral' };
  }

  return { profile: CONSULTING_FALLBACK_VOICE_PROFILE, resolution: 'bundled' };
}

/**
 * Library growth and other automation: use only an admin-set default profile or consulting fallback.
 * Does not create or persist area-specific profiles (case study / guide / industry).
 */
export async function resolveResourceVoiceProfileForLibraryGrowth(
  params: ResolveResourceVoiceProfileParams
): Promise<ResolvedResourceVoiceProfile> {
  const { profileManager } = params;
  const defaultProfile = profileManager.getDefaultProfile();
  if (defaultProfile) {
    const defaultId = profileManager.getStats().defaultProfileId;
    return {
      profile: defaultProfile,
      voiceProfileId: defaultId,
      resolution: 'default',
    };
  }
  return { profile: CONSULTING_FALLBACK_VOICE_PROFILE, resolution: 'bundled' };
}

/**
 * Hub / card / workspace blurb must describe the article topic — never the
 * voice generator. TextGenerator previously emitted design-system filler.
 */
export function generateResourceCatalogDescription(params: {
  voiceProfile?: VoiceProfile;
  title: string;
  industry: string;
  topicLabel: string;
  bodyExcerpt: string;
}): string {
  return catalogDescriptionFromArticle({
    title: params.title,
    industry: params.industry,
    topicLabel: params.topicLabel,
    bodyExcerpt: params.bodyExcerpt,
  });
}
