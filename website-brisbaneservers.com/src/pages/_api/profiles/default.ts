import type { APIRoute } from 'astro';
import { requireEditor } from '../../../utils/auth';
import { ensureBrisbaneProfile, findBrisbaneProfileMeta } from '../../../lib/brisbane-profile';
import { loadProfilesData } from '../../../lib/profiles-api';
import { getVoiceFramework, syncVoiceProfilesToCorpus } from '../../../utils/voice-framework';
import { loadResources } from '../../../lib/resources-api';

/**
 * Get default voice profile
 * GET /api/profiles/default
 * Requires: Editor authentication (same as list profiles; portal editors use this)
 *
 * Never returns the Design System bundled JSON — heals Brisbane when missing.
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

    let profilesData = await loadProfilesData();

    const storedMetas = profilesData.profiles.map((p) => p.metadata);
    if (!findBrisbaneProfileMeta(storedMetas) || !profilesData.defaultProfileId) {
      try {
        const resources = await loadResources();
        const { profileManager, profileBuilder } = await getVoiceFramework();
        await ensureBrisbaneProfile(profileManager, profileBuilder, resources);
        await syncVoiceProfilesToCorpus();
        profilesData = await loadProfilesData();
      } catch (healErr) {
        console.warn('[API] GET /api/profiles/default - Brisbane heal skipped:', healErr);
      }
    }

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
      const brisbane = findBrisbaneProfileMeta(profilesData.profiles.map((p) => p.metadata));
      const row = brisbane
        ? profilesData.profiles.find((p) => p.metadata.id === brisbane.id)
        : null;
      if (row) {
        defaultProfile = {
          id: row.metadata.id,
          name: row.metadata.name,
          voiceName: row.profile?.voiceName,
          characteristics: row.profile?.characteristics,
          version: row.metadata.version,
        };
      }
    }

    if (!defaultProfile) {
      return new Response(
        JSON.stringify({
          error: 'No consulting default profile is available yet. Build Brisbane from the Profiles panel.',
          code: 'NO_DEFAULT_PROFILE',
          success: false,
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      );
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
