import type { APIRoute } from 'astro';
import { requireEditor } from '../../../utils/auth';
import { getBundledVoiceProfile, loadProfilesData } from '../../../lib/profiles-api';

/**
 * Get default voice profile
 * GET /api/profiles/default
 * Requires: Editor authentication (same as list profiles; portal editors use this)
 */
export const GET: APIRoute = async ({ request }) => {
  const startTime = Date.now();

  const authResult = await requireEditor(request);
  if ('error' in authResult) {
    return new Response(
      JSON.stringify({
        error: authResult.error,
        code: authResult.code,
        success: false,
      }),
      {
        status: 'error' in authResult && authResult.code === 'FORBIDDEN' ? 403 : 401,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  try {
    console.log('[API] GET /api/profiles/default - Loading default profile');

    const profilesData = await loadProfilesData();
    let defaultProfile: Record<string, unknown> | null = null;

    if (profilesData.defaultProfileId) {
      const defaultProfileData = profilesData.profiles.find(
        (p) => p.metadata?.id === profilesData.defaultProfileId,
      );
      if (defaultProfileData) {
        defaultProfile = {
          id: defaultProfileData.metadata.id,
          name: defaultProfileData.metadata.name,
          voiceName: defaultProfileData.profile?.voiceName,
          characteristics: defaultProfileData.profile?.characteristics,
          version: defaultProfileData.metadata.version,
        };
      }
    }

    if (!defaultProfile) {
      const tagged = profilesData.profiles.find((p) => p.metadata?.isDefault);
      if (tagged) {
        defaultProfile = {
          id: tagged.metadata.id,
          name: tagged.metadata.name,
          voiceName: tagged.profile?.voiceName,
          characteristics: tagged.profile?.characteristics,
          version: tagged.metadata.version,
        };
      }
    }

    if (!defaultProfile) {
      const fallbackProfile = getBundledVoiceProfile();
      defaultProfile = {
        id: 'default',
        name: fallbackProfile.voiceName || 'Default Voice Profile',
        voiceName: fallbackProfile.voiceName,
        characteristics: fallbackProfile.characteristics,
        version: fallbackProfile.version || '1.0.0',
      };
    }

    const duration = Date.now() - startTime;
    console.log(`[API] GET /api/profiles/default - Success (${duration}ms)`);

    return new Response(
      JSON.stringify({
        profile: defaultProfile,
        success: true,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[API] GET /api/profiles/default - Error after ${duration}ms:`, error);

    return new Response(
      JSON.stringify({
        error: message,
        code: 'INTERNAL_ERROR',
        success: false,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
};
