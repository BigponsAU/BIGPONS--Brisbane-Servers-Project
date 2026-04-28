import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_DIR = path.join(__dirname, '../../storage');
const PROFILES_FILE = path.join(STORAGE_DIR, 'profiles.json');
const RESOURCES_FILE = path.join(STORAGE_DIR, 'resources.json');

function normalizeText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasSemanticSignal(value: string): boolean {
  const normalized = normalizeText(value);
  if (!normalized) return false;
  const letters = (normalized.match(/[A-Za-z]/g) || []).length;
  const digits = (normalized.match(/[0-9]/g) || []).length;
  if (letters < 3) return false;
  if (digits > letters * 2) return false;
  return true;
}

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeJson(filePath: string, data: unknown): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export interface StorageHygieneReport {
  profilesTouched: number;
  profilesRenamed: number;
  profileTagsRemoved: number;
  resourcesTouched: number;
  resourcesRetitled: number;
  resourcesRedescribed: number;
  deepMode: boolean;
  dryRun: boolean;
}

export async function cleanupProfileAndResourceStorage(
  dryRun: boolean,
  deep: boolean
): Promise<StorageHygieneReport> {
  let profilesTouched = 0;
  let profilesRenamed = 0;
  let profileTagsRemoved = 0;
  let resourcesTouched = 0;
  let resourcesRetitled = 0;
  let resourcesRedescribed = 0;

  const profilesData = await readJson<any>(PROFILES_FILE);
  if (profilesData && Array.isArray(profilesData.profiles)) {
    for (const entry of profilesData.profiles) {
      if (!entry?.metadata) continue;
      let touched = false;

      const originalName = String(entry.metadata.name || '');
      const cleanedName = normalizeText(originalName);
      if (!hasSemanticSignal(cleanedName)) {
        entry.metadata.name = `profile-${String(entry.metadata.id || 'unnamed').slice(-6)}`;
        profilesRenamed += 1;
        touched = true;
      } else if (cleanedName !== originalName) {
        entry.metadata.name = cleanedName;
        touched = true;
      }

      if (typeof entry.metadata.description === 'string') {
        const cleanedDescription = normalizeText(entry.metadata.description);
        if (cleanedDescription !== entry.metadata.description) {
          entry.metadata.description = cleanedDescription;
          touched = true;
        }
      }

      if (Array.isArray(entry.metadata.tags)) {
        const before = entry.metadata.tags.length;
        entry.metadata.tags = entry.metadata.tags
          .map((tag: unknown) => normalizeText(tag))
          .filter((tag: string) => hasSemanticSignal(tag));
        const removed = before - entry.metadata.tags.length;
        if (removed > 0) {
          profileTagsRemoved += removed;
          touched = true;
        }
      }

      if (deep && entry.profile?.voiceName) {
        const cleanedVoiceName = normalizeText(entry.profile.voiceName);
        if (!hasSemanticSignal(cleanedVoiceName)) {
          entry.profile.voiceName = entry.metadata.name;
          touched = true;
        } else if (cleanedVoiceName !== entry.profile.voiceName) {
          entry.profile.voiceName = cleanedVoiceName;
          touched = true;
        }
      }

      if (touched) profilesTouched += 1;
    }

    if (!dryRun && profilesTouched > 0) {
      profilesData.lastUpdated = new Date().toISOString();
      await writeJson(PROFILES_FILE, profilesData);
    }
  }

  const resourcesData = await readJson<any[]>(RESOURCES_FILE);
  if (Array.isArray(resourcesData)) {
    for (const resource of resourcesData) {
      let touched = false;
      const industry = normalizeText(resource.industry || 'resource');
      const topic = normalizeText(resource.topic || 'content');

      const currentTitle = normalizeText(resource.title || '');
      if (!hasSemanticSignal(currentTitle)) {
        resource.title = `${industry} ${topic}`.trim();
        resourcesRetitled += 1;
        touched = true;
      } else if (currentTitle !== resource.title) {
        resource.title = currentTitle;
        touched = true;
      }

      const currentDescription = normalizeText(resource.description || '');
      if (!hasSemanticSignal(currentDescription)) {
        const fallback = normalizeText(String(resource.content || '')).slice(0, 200);
        if (fallback) {
          resource.description = `${fallback}${fallback.length >= 200 ? '...' : ''}`;
          resourcesRedescribed += 1;
          touched = true;
        }
      } else if (currentDescription !== resource.description) {
        resource.description = currentDescription;
        touched = true;
      }

      if (deep && typeof resource.content === 'string') {
        const cleanedContent = normalizeText(resource.content);
        if (cleanedContent !== resource.content) {
          resource.content = cleanedContent;
          touched = true;
        }
      }

      if (touched) resourcesTouched += 1;
    }

    if (!dryRun && resourcesTouched > 0) {
      await writeJson(RESOURCES_FILE, resourcesData);
    }
  }

  return {
    profilesTouched,
    profilesRenamed,
    profileTagsRemoved,
    resourcesTouched,
    resourcesRetitled,
    resourcesRedescribed,
    deepMode: deep,
    dryRun,
  };
}
