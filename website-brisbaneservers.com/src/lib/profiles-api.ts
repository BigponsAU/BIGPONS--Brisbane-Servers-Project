/**
 * Voice profiles persistence — Postgres corpus (production) with filesystem fallback.
 */

import { CORPUS_DOC_KEYS, readCorpusJson, saveCorpusJson } from './corpus-store';
import { asCorpusObject } from './corpus-payload-coerce';
import { getProfilesFile } from './storage-paths';
import { CONSULTING_FALLBACK_VOICE_PROFILE } from './consulting-voice-fallback';

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
  const empty = emptyProfilesData();
  const data = asCorpusObject(
    await readCorpusJson<ProfilesData>(CORPUS_DOC_KEYS.PROFILES, getProfilesFile(), empty),
    empty,
  );
  if (!Array.isArray(data.profiles)) {
    return empty;
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

/** Consulting fallback profile (never Design System / golden-ratio JSON). */
export function getBundledVoiceProfile(): Record<string, unknown> {
  return CONSULTING_FALLBACK_VOICE_PROFILE as unknown as Record<string, unknown>;
}
