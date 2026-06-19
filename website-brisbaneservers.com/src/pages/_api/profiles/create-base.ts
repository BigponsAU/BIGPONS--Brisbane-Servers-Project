import type { APIRoute } from 'astro';
import { requireEditor } from '../../../utils/auth';
import { getVoiceFramework, syncVoiceProfilesToCorpus } from '../../../utils/voice-framework';
import { loadResources, type Resource } from '../../../lib/resources-api';
import { resourcesForSiteVoiceCorpus } from '../../../lib/resource-voice-profile';
import {
  BRISBANE_PROFILE_NAME,
  ensureBrisbaneProfile,
  findBrisbaneProfileMeta,
} from '../../../lib/brisbane-profile';

const LEGACY_BIGPONS_NAME = 'BIGPONS (Brisbane Servers)';
const BIGPONS_TAG = 'bigpons-default';
const LEGACY_BIFPONS_TAG = 'bifpons-site-corpus';

export interface CreateBaseProfileBody {
  /** Limit corpus to one industry slug (e.g. healthcare). */
  industry?: string;
  /** Build only from these resource ids (must exist, non-archived, with content). */
  resourceIds?: string[];
}

function pickCorpus(resources: Resource[], body: CreateBaseProfileBody): Resource[] {
  let base = resourcesForSiteVoiceCorpus(resources);
  if (body.industry && String(body.industry).trim()) {
    const ind = String(body.industry).trim().toLowerCase();
    base = base.filter((r) => (r.industry || '').toLowerCase() === ind);
  }
  if (Array.isArray(body.resourceIds) && body.resourceIds.length > 0) {
    const want = new Set(body.resourceIds.map((id) => String(id).trim()).filter(Boolean));
    base = base.filter((r) => want.has(r.id));
  }
  return base.filter((r) => r.content && r.content.trim().length > 0);
}

function findExistingBigpons(existingProfiles: { name: string; tags?: string[]; id: string }[]) {
  return findBrisbaneProfileMeta(existingProfiles);
}

/**
 * Create or update the **BIGPONS** site voice profile from the public resource corpus.
 * Optional JSON body: `{ industry?, resourceIds? }` to narrow sources (resource combinations / industry slice).
 * POST /api/profiles/create-base
 */
export const POST: APIRoute = async ({ request }) => {
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

  let body: CreateBaseProfileBody = {};
  try {
    const ct = request.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const raw = await request.text();
      if (raw && raw.trim()) {
        const parsed = JSON.parse(raw) as CreateBaseProfileBody;
        if (parsed && typeof parsed === 'object') {
          body = parsed;
        }
      }
    }
  } catch {
    body = {};
  }

  try {
    const resources = await loadResources();
    const combined = pickCorpus(resources, body);

    if (combined.length === 0) {
      return new Response(
        JSON.stringify({
          error:
            'No resources match this build. Try clearing filters, or ensure published resources / starters exist with content.',
          code: 'NO_VOICE_SOURCE_CONTENT',
          success: false
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const { profileBuilder, profileManager } = await getVoiceFramework();

    if (!body.industry && (!body.resourceIds || body.resourceIds.length === 0)) {
      const result = await ensureBrisbaneProfile(profileManager, profileBuilder, resources);
      await syncVoiceProfilesToCorpus();
      return new Response(
        JSON.stringify({
          profile: result.profile,
          success: true,
          message: `Brisbane profile ${result.created ? 'created' : 'updated'} from ${result.corpusCount} voice sources`,
          combinedSourcesCount: result.corpusCount,
          corpusResourceIds: result.corpusResourceIds,
          isDefault: true,
          profileName: BRISBANE_PROFILE_NAME,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const starterCount = combined.filter((r) => r.isStarterBlock).length;
    const publishedCount = combined.length - starterCount;
    const corpusIds = combined.map((r) => r.id).slice(0, 200);

    const allContent = combined.map((block) => block.content);
    const industryNote = body.industry ? `industry=${body.industry};` : '';
    const idsNote =
      Array.isArray(body.resourceIds) && body.resourceIds.length > 0
        ? `pickedIds=${body.resourceIds.length};`
        : '';

    const profile = await profileBuilder.buildFromSamples(allContent, {
      name: BRISBANE_PROFILE_NAME,
      description: `BIGPONS site voice from ${combined.length} public resource sources (${starterCount} starters, ${publishedCount} published). ${industryNote}${idsNote}`,
      sourceDocument: `bigpons-corpus:v=3;${industryNote}${idsNote}count=${combined.length}`
    });

    const existingProfiles = profileManager.getAllProfiles();
    const existingBigpons = findExistingBigpons(existingProfiles);

    let profileMetadata;
    const corpusMeta = {
      corpusResourceIds: corpusIds
    };

    if (existingBigpons) {
      await profileManager.updateProfile(existingBigpons.id, profile, {
        name: BRISBANE_PROFILE_NAME,
        description: `BIGPONS — rebuilt from ${combined.length} public website resources (${starterCount} starters, ${publishedCount} published).`,
        sourceDocument: `bigpons-corpus:v=3;${industryNote}${idsNote}count=${combined.length}`,
        tags: [BIGPONS_TAG, LEGACY_BIFPONS_TAG, 'brisbane-servers', 'site-corpus', 'default-candidate'],
        ...corpusMeta
      });
      await profileManager.setDefaultProfile(existingBigpons.id);
      profileMetadata = profileManager.getAllProfiles().find((p) => p.id === existingBigpons.id) ?? existingBigpons;
    } else {
      profileMetadata = await profileManager.createProfile(profile, {
        name: BRISBANE_PROFILE_NAME,
        description: `BIGPONS — site voice from ${combined.length} public website resources (${starterCount} starters, ${publishedCount} published).`,
        sourceDocument: `bigpons-corpus:v=3;${industryNote}${idsNote}count=${combined.length}`,
        version: '1.0.0',
        isDefault: true,
        archived: false,
        tags: [BIGPONS_TAG, LEGACY_BIFPONS_TAG, 'brisbane-servers', 'site-corpus', 'default-candidate'],
        ...corpusMeta
      });
      await profileManager.setDefaultProfile(profileMetadata.id);
    }

    await syncVoiceProfilesToCorpus();

    const wasUpdate = Boolean(existingBigpons);

    return new Response(
      JSON.stringify({
        profile: profileMetadata,
        success: true,
        message: `Brisbane profile ${wasUpdate ? 'updated' : 'created'} from ${combined.length} voice sources`,
        starterBlocksCount: starterCount,
        publishedResourcesCount: publishedCount,
        combinedSourcesCount: combined.length,
        corpusResourceIds: corpusIds,
        isDefault: true
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] Error creating BIGPONS profile:', error);
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
