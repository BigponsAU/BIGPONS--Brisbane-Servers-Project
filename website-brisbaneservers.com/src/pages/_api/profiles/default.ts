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

async function loadProfiles(): Promise<any> {
  try {
    const data = await fs.readFile(PROFILES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

async function loadDefaultProfile(): Promise<any> {
  try {
    const data = await fs.readFile(DEFAULT_PROFILE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

/**
 * Get default voice profile
 * GET /api/profiles/default
 * Requires: Editor authentication (same as list profiles; portal editors use this)
 */
export const GET: APIRoute = async ({ request }) => {
  const startTime = Date.now();
  
  // Check authentication
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
    console.log('[API] GET /api/profiles/default - Loading default profile');
    
    const profilesData = await loadProfiles();
    let defaultProfile = null;
    
    // Check if there's a default profile in profiles.json
    if (profilesData && profilesData.defaultProfileId) {
      const defaultProfileData = profilesData.profiles?.find(
        (p: any) => p.metadata?.id === profilesData.defaultProfileId
      );
      if (defaultProfileData) {
        defaultProfile = {
          id: defaultProfileData.metadata.id,
          name: defaultProfileData.metadata.name,
          voiceName: defaultProfileData.profile?.voiceName,
          characteristics: defaultProfileData.profile?.characteristics,
          version: defaultProfileData.metadata.version
        };
      }
    }
    
    // Fallback to voice-profile.json if no default found
    if (!defaultProfile) {
      const fallbackProfile = await loadDefaultProfile();
      if (fallbackProfile) {
        defaultProfile = {
          id: 'default',
          name: fallbackProfile.voiceName || 'Default Voice Profile',
          voiceName: fallbackProfile.voiceName,
          characteristics: fallbackProfile.characteristics,
          version: fallbackProfile.version || '1.0.0'
        };
      }
    }

    if (!defaultProfile) {
      return new Response(
        JSON.stringify({
          error: 'No default profile found',
          success: false
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const duration = Date.now() - startTime;
    console.log(`[API] GET /api/profiles/default - Success (${duration}ms)`);
    
    return new Response(
      JSON.stringify({
        profile: defaultProfile,
        success: true
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[API] GET /api/profiles/default - Error after ${duration}ms:`, error);
    
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
