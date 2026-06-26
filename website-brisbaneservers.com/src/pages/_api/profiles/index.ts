import type { APIRoute } from 'astro';
import { requireEditor } from '../../../utils/auth';
import { findBrisbaneProfileMeta, ensureBrisbaneProfile } from '../../../lib/brisbane-profile';
import {
  getBundledVoiceProfile,
  loadProfilesData,
  type ProfileData,
} from '../../../lib/profiles-api';
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

    const defaultProfile = getBundledVoiceProfile();
    
    let profiles: any[] = [];
    
    if (profilesData.profiles.length > 0) {
      profiles = profilesData.profiles.map((p: ProfileData) => {
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
    
    const hasStoredDefault = Boolean(profilesData.defaultProfileId);
    // Add bundled fallback profile when not already represented (never steal default flag from BIGPONS / storage)
    const defaultExists = profiles.some(
      (p) => p.id === 'default' || p.voiceName === defaultProfile.voiceName,
    );
    if (!defaultExists) {
      const bundledBase = {
        id: 'default',
        name: (defaultProfile.voiceName as string) || 'Default Voice Profile',
        description: 'Bundled fallback from voice-profile.json (used when no storage default matches).',
        version: (defaultProfile.version as string) || '1.0.0',
        tags: ['default', 'system'],
        isDefault: !hasStoredDefault,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sourceDocument: defaultProfile.sourceDocument,
        voiceName: defaultProfile.voiceName,
        characteristics: defaultProfile.characteristics,
      };
      profiles.unshift({
        ...bundledBase,
        stats: computeProfileCardStats({ id: 'default' }, resources),
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
