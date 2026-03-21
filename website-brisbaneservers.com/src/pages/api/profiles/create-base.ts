import type { APIRoute } from 'astro';
import { requireEditor } from '../../../utils/auth';
import { getVoiceFramework } from '../../../utils/voice-framework';
import { loadResources, type Resource } from '../../../lib/resources-api';

/**
 * Create or update base profile from all starter resources
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
    // Load all starter blocks
    const resources = await loadResources();
    const starterBlocks = resources.filter(r => r.isStarterBlock === true);

    if (starterBlocks.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'No starter blocks found',
          code: 'NO_STARTER_BLOCKS',
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

    // Extract all content from starter blocks
    const allContent = starterBlocks.map(block => block.content);
    
    // Build profile from all starter block content
    const profile = await profileBuilder.buildFromSamples(
      allContent,
      {
        name: 'Brisbane Servers Base Profile',
        description: `Base voice profile created from ${starterBlocks.length} starter resources covering all industries and topics`,
        sourceDocument: `starter-blocks:${starterBlocks.length} resources`
      }
    );

    // Check if base profile already exists
    const existingProfiles = profileManager.getAllProfiles();
    const existingBaseProfile = existingProfiles.find(p => 
      p.name === 'Brisbane Servers Base Profile' || 
      (p.name.includes('Base Profile') && p.sourceDocument?.includes('starter-blocks'))
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
        description: `Base voice profile from ${starterBlocks.length} starter resources`,
        sourceDocument: `starter-blocks:${starterBlocks.length} resources`,
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
        message: `Base profile ${existingBaseProfile ? 'updated' : 'created'} from ${starterBlocks.length} starter blocks`,
        starterBlocksCount: starterBlocks.length,
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
