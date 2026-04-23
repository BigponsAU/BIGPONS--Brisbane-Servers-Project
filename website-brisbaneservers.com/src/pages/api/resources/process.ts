import type { APIRoute } from 'astro';
import { Extrapolator, TextGenerator, VoiceMatcher } from '@voice-framework';
import { requireEditor } from '../../../utils/auth';
import { getVoiceFramework } from '../../../utils/voice-framework';
import { loadResources, saveResources } from '../../../lib/resources-api';
import { buildResourceFromEditorProcess } from '../../../lib/resource-ingestion';
import {
  generateResourceCatalogDescription,
  resolveResourceVoiceProfile
} from '../../../lib/resource-voice-profile';

/**
 * Process content directly (without file upload)
 * POST /api/resources/process
 * Body: { content, industry, topic, title?, autoPublish?, profileId? }
 */
export const POST: APIRoute = async ({ request }) => {
  const startTime = Date.now();

  const authResult = await requireEditor(request);
  if ('error' in authResult) {
    return new Response(
      JSON.stringify({
        error: authResult.error,
        code: authResult.code,
        success: false
      }),
      {
        status: authResult.code === 'FORBIDDEN' ? 403 : 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const body = await request.json();
    const { content, industry, topic, title, autoPublish, profileId } = body;

    if (!content || !industry || !topic) {
      return new Response(
        JSON.stringify({
          error: 'Content, industry, and topic are required',
          code: 'MISSING_FIELDS',
          success: false
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const resourceTitle = title || `${topic} for ${industry}`;
    const shouldPublish = autoPublish === true;

    const resources = await loadResources();
    const { profileManager, profileBuilder } = await getVoiceFramework();
    const resolved = await resolveResourceVoiceProfile({
      requestedProfileId: profileId,
      profileManager,
      profileBuilder,
      resources
    });

    const textGenerator = new TextGenerator(resolved.profile);
    const extrapolator = new Extrapolator(resolved.profile);
    const voiceMatcher = new VoiceMatcher(resolved.profile);

    const seedText = `${resourceTitle}. ${topic} solutions for ${industry} businesses.`;
    const generatedContent = textGenerator.generateText(seedText, {
      length: 'long',
      includeExamples: true,
      includeStructure: true,
      style: 'descriptive'
    });

    let processedContent = extrapolator.extrapolate(content + '\n\n' + generatedContent, {
      expansionLevel: 'moderate',
      addExamples: true,
      addDetails: true
    });

    let voiceValidation = voiceMatcher.validateVoice(processedContent);

    if ((voiceValidation.score ?? 0) < 0.6) {
      const regeneratedContent = textGenerator.generateText(seedText, {
        length: 'long',
        includeExamples: true,
        style: 'descriptive'
      });
      const revalidated = voiceMatcher.validateVoice(regeneratedContent);
      if ((revalidated.score ?? 0) > (voiceValidation.score ?? 0)) {
        processedContent = regeneratedContent;
        voiceValidation = revalidated;
      }
    }

    const description = generateResourceCatalogDescription({
      voiceProfile: resolved.profile,
      title: resourceTitle,
      industry,
      topicLabel: topic,
      bodyExcerpt: processedContent
    });

    const user = authResult.user;
    const resource = buildResourceFromEditorProcess({
      industry,
      topic,
      title: resourceTitle,
      body: processedContent,
      description,
      generatedBy: user.email,
      ownerId: user.id,
      shouldPublish,
      metadata: {
        wordCount: processedContent.split(/\s+/).length,
        semanticLevel: 'high',
        voiceScore: voiceValidation.score ?? 0,
        voiceProfileId: resolved.voiceProfileId,
        voiceProfileResolution: resolved.resolution
      }
    });

    resources.push(resource);
    await saveResources(resources);

    const duration = Date.now() - startTime;
    console.log(`[API] POST /api/resources/process - Success (${duration}ms)`);

    return new Response(
      JSON.stringify({
        resource,
        voiceProfile: {
          resolution: resolved.resolution,
          profileId: resolved.voiceProfileId ?? null
        },
        voiceValidation: {
          score: voiceValidation.score ?? 0,
          isValid: voiceValidation.isValid ?? false,
          issues: voiceValidation.issues ?? [],
          strengths: voiceValidation.strengths ?? []
        },
        success: true
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    console.error(`[API] POST /api/resources/process - Error after ${duration}ms:`, error);
    const message = error instanceof Error ? error.message : 'Unknown error';
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
