import type { APIRoute } from 'astro';
import { requireEditor } from '../../../utils/auth';
import { getVoiceFramework } from '../../../utils/voice-framework';
import { loadResources, type Resource } from '../../../lib/resources-api';
import { resourcesForSiteVoiceCorpus } from '../../../lib/resource-voice-profile';

const BIFPONS_NAME = 'BIFPONS';
const BIFPONS_TAG = 'bifpons-site-corpus';

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

function findExistingBifpons(existingProfiles: { name: string; tags?: string[]; id: string }[]) {
  return existingProfiles.find(
    (p) =>
      p.tags?.includes(BIFPONS_TAG) ||
      p.name === BIFPONS_NAME ||
      p.name === 'Brisbane Servers Base Profile'
  );
}

/**
 * Create or update the **BIFPONS** site voice profile from the resource corpus (starters + all published).
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
      name: BIFPONS_NAME,
      description: `BIFPONS site voice from ${combined.length} resources (${starterCount} starters, ${publishedCount} published). ${industryNote}${idsNote}`,
      sourceDocument: `bifpons-corpus:v=2;${industryNote}${idsNote}count=${combined.length}`
    });

    const existingProfiles = profileManager.getAllProfiles();
    const existingBifpons = findExistingBifpons(existingProfiles);

    let profileMetadata;
    const corpusMeta = {
      corpusResourceIds: corpusIds
    };

    if (existingBifpons) {
      await profileManager.updateProfile(existingBifpons.id, profile, {
        name: BIFPONS_NAME,
        description: `BIFPONS — rebuilt from ${combined.length} on-repo resources (${starterCount} starters, ${publishedCount} published).`,
        sourceDocument: `bifpons-corpus:v=2;${industryNote}${idsNote}count=${combined.length}`,
        tags: [BIFPONS_TAG, 'site-corpus', 'default-candidate'],
        ...corpusMeta
      });
      await profileManager.setDefaultProfile(existingBifpons.id);
      profileMetadata = profileManager.getAllProfiles().find((p) => p.id === existingBifpons.id) ?? existingBifpons;
    } else {
      profileMetadata = await profileManager.createProfile(profile, {
        name: BIFPONS_NAME,
        description: `BIFPONS — site voice from ${combined.length} resources (${starterCount} starters, ${publishedCount} published).`,
        sourceDocument: `bifpons-corpus:v=2;${industryNote}${idsNote}count=${combined.length}`,
        version: '1.0.0',
        isDefault: true,
        archived: false,
        tags: [BIFPONS_TAG, 'site-corpus', 'default-candidate'],
        ...corpusMeta
      });
      await profileManager.setDefaultProfile(profileMetadata.id);
    }

    const wasUpdate = Boolean(existingBifpons);

    return new Response(
      JSON.stringify({
        profile: profileMetadata,
        success: true,
        message: `BIFPONS profile ${wasUpdate ? 'updated' : 'created'} from ${combined.length} voice sources`,
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
    console.error('[API] Error creating BIFPONS profile:', error);
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
