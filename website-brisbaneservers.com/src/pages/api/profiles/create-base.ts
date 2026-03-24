import type { APIRoute } from 'astro';
import { requireEditor } from '../../../utils/auth';
import { getVoiceFramework } from '../../../utils/voice-framework';
import { loadResources, isPublicResource, type Resource } from '../../../lib/resources-api';

/**
 * Create or update base voice profile from starter blocks plus all published public resources
 * (deduped by id). Aligns portal voice with premade + live site content.
 * POST /api/profiles/create-base
 */
export const POST: APIRoute = async ({ request }) => {
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
    const resources = await loadResources();
    const starterBlocks = resources.filter((r) => r.isStarterBlock === true);
    const publishedPublic = resources.filter((r) => isPublicResource(r));

    const byId = new Map<string, Resource>();
    for (const r of starterBlocks) byId.set(r.id, r);
    for (const r of publishedPublic) byId.set(r.id, r);
    const combined = [...byId.values()].filter((r) => r.content && r.content.trim().length > 0);

    if (combined.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'No starter blocks or published resources found to build a voice profile',
          code: 'NO_VOICE_SOURCE_CONTENT',
          success: false
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get voice framework components
    const { profileBuilder, profileManager } = await getVoiceFramework();

    const allContent = combined.map((block) => block.content);
    
    // Build profile from all starter block content
    const profile = await profileBuilder.buildFromSamples(
      allContent,
      {
        name: 'Brisbane Servers Base Profile',
        description: `Base voice profile from ${starterBlocks.length} starter block(s) and ${publishedPublic.length} published resource(s) (deduped: ${combined.length} sources)`,
        sourceDocument: `voice-sources:starters=${starterBlocks.length};published=${publishedPublic.length}`
      }
    );

    // Check if base profile already exists
    const existingProfiles = profileManager.getAllProfiles();
    const existingBaseProfile = existingProfiles.find(
      (p) =>
        p.name === 'Brisbane Servers Base Profile' ||
        (p.name.includes('Base Profile') &&
          (p.sourceDocument?.includes('starter-blocks') || p.sourceDocument?.includes('voice-sources')))
    );

    let profileMetadata;
    if (existingBaseProfile) {
      // Update existing base profile
      await profileManager.updateProfile(existingBaseProfile.id, profile);
      await profileManager.setDefaultProfile(existingBaseProfile.id);
      profileMetadata = existingBaseProfile;
      console.log(`[API] Updated base profile: ${existingBaseProfile.id}`);
    } else {
      // Create new base profile
      profileMetadata = await profileManager.createProfile(profile, {
        name: 'Brisbane Servers Base Profile',
        description: `Base voice profile from ${combined.length} deduped sources (starters + published)`,
        sourceDocument: `voice-sources:starters=${starterBlocks.length};published=${publishedPublic.length}`,
        isDefault: true, // Set as default
        isArchived: false,
        tags: ['base-profile', 'starter-blocks', 'default']
      });
      console.log(`[API] Created base profile: ${profileMetadata.id}`);
    }

    return new Response(
      JSON.stringify({
        profile: profileMetadata,
        success: true,
        message: `Base profile ${existingBaseProfile ? 'updated' : 'created'} from ${combined.length} voice sources (${starterBlocks.length} starters, ${publishedPublic.length} published)`,
        starterBlocksCount: starterBlocks.length,
        publishedResourcesCount: publishedPublic.length,
        combinedSourcesCount: combined.length,
        isDefault: true
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] Error creating base profile:', error);
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
