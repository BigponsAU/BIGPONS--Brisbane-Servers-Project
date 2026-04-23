import type { APIRoute } from 'astro';
import { requireEditor } from '../../../utils/auth';
import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve to project root, then to voice-framework storage
const projectRoot = path.resolve(__dirname, '../../../../../');
const PROFILES_FILE = path.join(projectRoot, 'voice-framework', 'storage', 'profiles.json');
const DEFAULT_PROFILE_FILE = path.join(projectRoot, 'voice-framework', 'voice-profile.json');

interface ProfileMetadata {
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
}

interface ProfileData {
  metadata: ProfileMetadata;
  profile: any;
}

interface ProfilesData {
  profiles: ProfileData[];
  version: string;
  lastUpdated: string;
  defaultProfileId?: string;
}

async function loadProfiles(): Promise<ProfilesData | null> {
  try {
    const data = await fs.readFile(PROFILES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('[API] Error loading profiles:', error);
    return null;
  }
}

async function loadDefaultProfile(): Promise<any | null> {
  try {
    const data = await fs.readFile(DEFAULT_PROFILE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('[API] Error loading default profile:', error);
    return null;
  }
}

/**
 * Get all voice profiles
 * GET /api/profiles
 * Requires: Admin authentication
 */
export const GET: APIRoute = async ({ request }) => {
  const startTime = Date.now();
  
  // Check authentication - allow editor or admin
  const authResult = await requireEditor(request);
  if ('error' in authResult) {
    return new Response(
      JSON.stringify({
        error: authResult.error,
        code: authResult.code,
        success: false
      }),
      {
        status: 'error' in authResult && authResult.code === 'FORBIDDEN' ? 403 : 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    console.log('[API] GET /api/profiles - Loading profiles');
    
    const profilesData = await loadProfiles();
    const defaultProfile = await loadDefaultProfile();
    
    let profiles: any[] = [];
    
    if (profilesData && profilesData.profiles) {
      profiles = profilesData.profiles.map((p: ProfileData) => ({
        id: p.metadata.id,
        name: p.metadata.name,
        description: p.metadata.description,
        version: p.metadata.version,
        tags: p.metadata.tags || [],
        isDefault: p.metadata.isDefault || profilesData.defaultProfileId === p.metadata.id,
        archived: p.metadata.archived || false,
        createdAt: p.metadata.createdAt,
        updatedAt: p.metadata.updatedAt,
        sourceDocument: p.metadata.sourceDocument,
        voiceName: p.profile?.voiceName,
        characteristics: p.profile?.characteristics
      }));
    }
    
    // Add default profile if it exists and isn't already in the list
    if (defaultProfile) {
      const defaultExists = profiles.some(p => p.id === 'default' || p.voiceName === defaultProfile.voiceName);
      if (!defaultExists) {
        profiles.unshift({
          id: 'default',
          name: defaultProfile.voiceName || 'Default Voice Profile',
          description: 'Default voice profile from voice-profile.json',
          version: defaultProfile.version || '1.0.0',
          tags: ['default', 'system'],
          isDefault: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          sourceDocument: defaultProfile.sourceDocument,
          voiceName: defaultProfile.voiceName,
          characteristics: defaultProfile.characteristics
        });
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[API] GET /api/profiles - Success: Found ${profiles.length} profiles (${duration}ms)`);
    
    return new Response(
      JSON.stringify({
        profiles,
        success: true,
        count: profiles.length
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[API] GET /api/profiles - Error after ${duration}ms:`, error);
    
    return new Response(
      JSON.stringify({
        error: message,
        code: 'INTERNAL_ERROR',
        success: false
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
