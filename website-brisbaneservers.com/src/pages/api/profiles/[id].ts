import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../utils/auth';
import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve to project root, then to voice-framework storage
const projectRoot = path.resolve(__dirname, '../../../../../');
const PROFILES_FILE = path.join(projectRoot, 'voice-framework', 'storage', 'profiles.json');

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

async function saveProfiles(data: ProfilesData): Promise<void> {
  await fs.writeFile(PROFILES_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Update a profile (including archive/unarchive)
 * PUT /api/profiles/:id
 */
export const PUT: APIRoute = async ({ params, request }) => {
  // Check authentication
  const authResult = await requireAdmin(request);
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
    const { id } = params;
    if (!id) {
      return new Response(
        JSON.stringify({
          error: 'Profile ID is required',
          code: 'MISSING_ID',
          success: false
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const updates = await request.json();
    const profilesData = await loadProfiles();

    if (!profilesData || !profilesData.profiles) {
      return new Response(
        JSON.stringify({
          error: 'Profiles file not found or invalid',
          code: 'NOT_FOUND',
          success: false
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const index = profilesData.profiles.findIndex(p => p.metadata.id === id);

    if (index === -1) {
      return new Response(
        JSON.stringify({
          error: 'Profile not found',
          code: 'NOT_FOUND',
          success: false
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Update profile metadata
    profilesData.profiles[index].metadata = {
      ...profilesData.profiles[index].metadata,
      ...updates,
      id: profilesData.profiles[index].metadata.id, // Preserve original ID
      updatedAt: new Date().toISOString()
    };

    // Update profile data if provided
    if (updates.profile) {
      profilesData.profiles[index].profile = {
        ...profilesData.profiles[index].profile,
        ...updates.profile
      };
    }

    await saveProfiles(profilesData);

    return new Response(
      JSON.stringify({
        success: true,
        profile: {
          id: profilesData.profiles[index].metadata.id,
          ...profilesData.profiles[index].metadata,
          profile: profilesData.profiles[index].profile
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] PUT /api/profiles/:id - Error:', error);
    
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
