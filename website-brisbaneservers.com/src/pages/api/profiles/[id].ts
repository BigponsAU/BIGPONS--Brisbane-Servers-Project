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
 * Get a profile by id
 * GET /api/profiles/:id
 */
export const GET: APIRoute = async ({ params, request }) => {
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

    const profilesData = await loadProfiles();
    if (!profilesData?.profiles) {
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

    const found = profilesData.profiles.find((entry) => entry.metadata.id === id);
    if (!found) {
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

    return new Response(
      JSON.stringify({
        success: true,
        profile: {
          ...found.metadata,
          profile: found.profile
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
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

/**
 * Update a profile (including archive/unarchive, set default)
 * PUT /api/profiles/:id
 */
export const PUT: APIRoute = async ({ params, request }) => {
  // Check authentication (portal editors manage profiles)
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
    const { profile: profilePatch, ...metaPatch } = updates as {
      profile?: Record<string, unknown>;
      [key: string]: unknown;
    };
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
          error:
            id === 'default'
              ? 'The bundled default profile is read-only here. Create a base profile to save a default in storage.'
              : 'Profile not found',
          code: 'NOT_FOUND',
          success: false
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const prevMeta = profilesData.profiles[index].metadata;

    // Merge metadata without leaking `profile` into metadata
    profilesData.profiles[index].metadata = {
      ...prevMeta,
      ...metaPatch,
      id: prevMeta.id,
      updatedAt: new Date().toISOString()
    };

    if (profilePatch && typeof profilePatch === 'object') {
      profilesData.profiles[index].profile = {
        ...profilesData.profiles[index].profile,
        ...profilePatch
      };
    }

    const meta = profilesData.profiles[index].metadata;

    if (meta.archived === true) {
      if (profilesData.defaultProfileId === id) {
        profilesData.defaultProfileId = undefined;
      }
      meta.isDefault = false;
    }

    if (metaPatch.isDefault === true && meta.archived !== true) {
      profilesData.defaultProfileId = id;
      profilesData.profiles.forEach((entry, i) => {
        entry.metadata.isDefault = i === index;
      });
    }

    profilesData.lastUpdated = new Date().toISOString();

    await saveProfiles(profilesData);

    return new Response(
      JSON.stringify({
        success: true,
        profile: {
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

/**
 * Delete a profile by id
 * DELETE /api/profiles/:id
 */
export const DELETE: APIRoute = async ({ params, request }) => {
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

    const profilesData = await loadProfiles();
    if (!profilesData?.profiles) {
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

    const index = profilesData.profiles.findIndex((entry) => entry.metadata.id === id);
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

    const profileMeta = profilesData.profiles[index].metadata;
    if (profileMeta.isDefault || profilesData.defaultProfileId === id) {
      return new Response(
        JSON.stringify({
          error: 'Cannot delete default profile. Set another default first.',
          code: 'DEFAULT_PROFILE_PROTECTED',
          success: false
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    profilesData.profiles.splice(index, 1);
    profilesData.lastUpdated = new Date().toISOString();
    await saveProfiles(profilesData);

    return new Response(
      JSON.stringify({
        success: true,
        deletedId: id
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
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
