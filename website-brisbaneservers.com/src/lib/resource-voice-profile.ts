/**
 * Resolve which VoiceProfile drives resource creation and catalogue-style descriptions.
 * Mirrors public library sources (starters + public catalogue) when no default is stored.
 * The saved **BIFPONS** profile uses the wider site corpus — see `resourcesForSiteVoiceCorpus` in this file.
 */

import { voiceProfileData } from '@voice-framework';
import type { VoiceProfile } from '@voice-framework/models/voice-profile';
import type { ProfileManager } from '@voice-framework/storage/profile-manager';
import type { ProfileBuilder } from '@voice-framework/builders/profile-builder';
import { TextGenerator } from '@voice-framework/generators/text-generator';
import type { Resource, VoiceProfileResolutionKind } from './resource-types';
import { isPublicResource } from './resource-types';

const BUNDLED_VOICE_PROFILE = voiceProfileData as unknown as VoiceProfile;

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
 * Site voice corpus: starter curriculum + every **published** resource (any visibility except archived),
 * deduped by id. Matches what the marketing site can ship as published pages and internal published copy.
 * Same rules as POST /api/profiles/create-base (BIFPONS build).
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
    if (r.status === 'published') {
      byId.set(r.id, r);
    }
  }
  return [...byId.values()];
}

/**
 * Starters + **public** published catalogue (anonymous-safe). Used for ephemeral library-derived voice
 * when no saved default exists — not the full signed-in BIFPONS corpus (see {@link resourcesForSiteVoiceCorpus}).
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

  return { profile: BUNDLED_VOICE_PROFILE, resolution: 'bundled' };
}

/**
 * Hub / card description in the active voice (not a fixed character truncation of body).
 */
export function generateResourceCatalogDescription(params: {
  voiceProfile: VoiceProfile;
  title: string;
  industry: string;
  topicLabel: string;
  bodyExcerpt: string;
}): string {
  const excerpt = params.bodyExcerpt.replace(/\s+/g, ' ').trim().slice(0, 800);
  const seed = `${params.title}. Industry: ${params.industry}. Topic: ${params.topicLabel}. Source summary: ${excerpt}`;
  const gen = new TextGenerator(params.voiceProfile);
  let text = gen.generateText(seed, {
    length: 'short',
    includeExamples: false,
    includeStructure: false,
    style: 'descriptive'
  });
  text = text
    .replace(/#{1,6}\s+[^\n]+\n?/g, '')
    .replace(/\*\*/g, '')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!text) {
    const fallback = excerpt.slice(0, 400);
    return fallback || `${params.title} — ${params.industry} / ${params.topicLabel}`;
  }
  return text;
}
