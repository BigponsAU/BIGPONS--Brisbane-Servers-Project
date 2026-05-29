import type { APIRoute } from 'astro';
import { requireEditor } from '../../../utils/auth';
import { getVoiceFramework } from '../../../utils/voice-framework';
import {
  loadResources,
  saveResources,
  normalizeTopicSlug,
  type Resource
} from '../../../lib/resources-api';

/**
 * Create resource from starter block
 * POST /api/resources/from-starter-block
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
    const body = await request.json();
    const { starterBlockId, industry, topic, customizations } = body;
    
    if (!starterBlockId) {
      return new Response(
        JSON.stringify({
          error: 'Starter block ID is required',
          code: 'MISSING_STARTER_BLOCK_ID',
          success: false
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const resources = await loadResources();
    const starterBlock = resources.find(r => r.id === starterBlockId && r.isStarterBlock === true);

    if (!starterBlock) {
      return new Response(
        JSON.stringify({
          error: 'Starter block not found',
          code: 'STARTER_BLOCK_NOT_FOUND',
          success: false
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Create new resource based on starter block
    const topicSlug = normalizeTopicSlug(topic || starterBlock.topic);
    const newResource: Resource = {
      ...starterBlock,
      id: `${industry || starterBlock.industry}-${topicSlug}-${Date.now()}`,
      industry: industry || starterBlock.industry,
      topic: topicSlug,
      title: customizations?.title || starterBlock.title,
      description: customizations?.description || starterBlock.description,
      content: customizations?.content || starterBlock.content,
      generatedAt: new Date().toISOString(),
      generatedBy: authResult.user.email,
      ownerId: authResult.user.id,
      isStarterBlock: false, // This is now a user's resource
      visibility: 'private',
      version: 1,
      status: 'draft',
      metadata: {
        ...starterBlock.metadata,
        wordCount: (customizations?.content || starterBlock.content).split(/\s+/).length
      }
    };

    // Create base profile from starter block content
    let profileCreated = false;
    try {
      const { profileBuilder, profileManager } = await getVoiceFramework();
      
      // Build profile from starter block content
      const profile = await profileBuilder.buildFromSamples(
        [starterBlock.content],
        {
          name: `Base Profile: ${newResource.title}`,
          description: `Voice profile created from starter block: ${starterBlock.title}`,
          sourceDocument: `starter-block:${starterBlock.id}`
        }
      );

      // Save profile as default if it's the first one, or if explicitly requested
      const allProfiles = profileManager.getAllProfiles();
      const isDefault = allProfiles.length === 0 || customizations?.setAsDefault === true;

      await profileManager.createProfile(profile, {
        name: profile.voiceName,
        description: profile.sourceDocument || '',
        sourceDocument: `starter-block:${starterBlock.id}`,
        version: profile.version || '1.0.0',
        isDefault: isDefault,
        archived: false
      });

      profileCreated = true;
      console.log(`[API] Created base profile from starter block: ${starterBlock.id}`);
    } catch (profileError) {
      // Log but don't fail the resource creation if profile creation fails
      console.warn('[API] Failed to create profile from starter block:', profileError);
    }

    // If customizations include content, process through voice framework
    if (customizations?.content) {
      const { voiceMatcher } = await getVoiceFramework();
      const voiceValidation = voiceMatcher.validateVoice(customizations.content);
      newResource.metadata = {
        ...newResource.metadata,
        voiceScore: voiceValidation.score || 0
      };
    }

    resources.push(newResource);
    await saveResources(resources);

    return new Response(
      JSON.stringify({
        resource: newResource,
        profileCreated,
        success: true
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] Error in POST /api/resources/from-starter-block:', error);
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
