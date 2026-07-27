import type { APIRoute } from 'astro';
import { requireEditor } from '../../../utils/auth';
import { findBrisbaneProfileMeta, ensureBrisbaneProfile } from '../../../lib/brisbane-profile';
import { loadProfilesData, type ProfileData } from '../../../lib/profiles-api';
import { getVoiceFramework, syncVoiceProfilesToCorpus } from '../../../utils/voice-framework';
import { computeProfileCardStats } from '../../../lib/profile-stats';
import { loadResources } from '../../../lib/resources-api';
import { syncInferenceMetaStarterToResources } from '../../../lib/inference-meta-starter-corpus';

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

    await syncInferenceMetaStarterToResources().catch((err) => {
      console.warn('[API] GET /api/profiles - inference meta starter sync skipped:', err);
    });

    let profilesData = await loadProfilesData();
    const resources = await loadResources();

    const storedMetas = profilesData.profiles.map((p) => p.metadata);
    if (!findBrisbaneProfileMeta(storedMetas)) {
      try {
        const { syncCaseStudiesToResources } = await import('../../../lib/case-study-corpus');
        const { resources } = await syncCaseStudiesToResources();
        const { profileManager, profileBuilder } = await getVoiceFramework();
        await ensureBrisbaneProfile(profileManager, profileBuilder, resources);
        await syncVoiceProfilesToCorpus();
        profilesData = await loadProfilesData();
        console.log('[API] GET /api/profiles - Built missing Brisbane default from resource corpus');
      } catch (healErr) {
        console.warn('[API] GET /api/profiles - Brisbane profile auto-build skipped:', healErr);
      }
    }

    let profiles: any[] = [];
    
    if (profilesData.profiles.length > 0) {
      profiles = profilesData.profiles
        // Never surface Design System / synthetic bundled cards in the portal library.
        .filter((p: ProfileData) => {
          const name = `${p.metadata?.name ?? ''} ${p.profile?.voiceName ?? ''}`.toLowerCase();
          if (p.metadata?.id === 'default') return false;
          if (name.includes('design system')) return false;
          return true;
        })
        .map((p: ProfileData) => {
        const base = {
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
          corpusResourceIds: p.metadata.corpusResourceIds,
          corpusResourceCount: p.metadata.corpusResourceCount,
          corpusIndexedCount: p.metadata.corpusIndexedCount,
          voiceName: p.profile?.voiceName,
          characteristics: p.profile?.characteristics,
        };
        return {
          ...base,
          stats: computeProfileCardStats(
            {
              id: p.metadata.id,
              corpusResourceIds: p.metadata.corpusResourceIds,
              corpusResourceCount: p.metadata.corpusResourceCount,
              corpusIndexedCount: p.metadata.corpusIndexedCount,
            },
            resources
          ),
        };
      });
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
