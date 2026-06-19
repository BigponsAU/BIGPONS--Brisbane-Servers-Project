/**
 * Voice profiles persistence — Postgres corpus (production) with filesystem fallback.
 */

import { voiceProfileData } from '@voice-framework';
import { CORPUS_DOC_KEYS, readCorpusJson, saveCorpusJson } from './corpus-store';
import { getProfilesFile } from './storage-paths';

export interface ProfileMetadata {
  name: string;
  description?: string;
  version: string;
  sourceDocument?: string;
  tags?: string[];
  isDefault?: boolean;
  archived?: boolean;
  id: string;
  createdAt: string;
  updatedAt: string;
  corpusResourceIds?: string[];
  corpusResourceCount?: number;
  corpusIndexedCount?: number;
  corpusLastBuiltAt?: string;
}

export interface ProfileData {
  metadata: ProfileMetadata;
  profile: Record<string, unknown>;
}

export interface ProfilesData {
  profiles: ProfileData[];
  version: string;
  lastUpdated: string;
  defaultProfileId?: string;
}

function emptyProfilesData(): ProfilesData {
  return {
    profiles: [],
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
  };
}

/** Load profiles.json document (Neon first, then disk, else empty). */
export async function loadProfilesData(): Promise<ProfilesData> {
  const data = await readCorpusJson<ProfilesData>(
    CORPUS_DOC_KEYS.PROFILES,
    getProfilesFile(),
    emptyProfilesData(),
  );
  if (!Array.isArray(data.profiles)) {
    return emptyProfilesData();
  }
  return data;
}

/** Persist profiles.json document to corpus + optional filesystem mirror. */
export async function saveProfilesData(data: ProfilesData): Promise<void> {
  const payload: ProfilesData = {
    ...data,
    lastUpdated: new Date().toISOString(),
  };
  await saveCorpusJson(CORPUS_DOC_KEYS.PROFILES, getProfilesFile(), payload);
}

/** Bundled voice-profile.json (edge-safe; no filesystem read). */
export function getBundledVoiceProfile(): Record<string, unknown> {
  return voiceProfileData as unknown as Record<string, unknown>;
}
