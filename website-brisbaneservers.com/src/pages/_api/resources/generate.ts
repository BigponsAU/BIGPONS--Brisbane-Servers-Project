import type { APIRoute } from 'astro';
import { Extrapolator, TextGenerator, VoiceMatcher } from '@voice-framework';
import { requireEditor } from '../../../utils/auth';
import { getVoiceFramework } from '../../../utils/voice-framework';
import {
  loadResources,
  saveResources,
  normalizeTopicSlug,
  topicsMatch,
  type Resource
} from '../../../lib/resources-api';
import { buildRagContext } from '../../../lib/semantic/rag';
import { runIndexPipeline } from '../../../lib/semantic/pipeline';
import { isDevelopmentMode } from '../../../utils/runtime-env';
import {
  generateResourceCatalogDescription,
  resolveResourceVoiceProfile
} from '../../../lib/resource-voice-profile';
import { generateResourceBody } from '../../../lib/inference/resource-generate';
import { mergeInferenceMetadata } from '../../../lib/inference/inference-metadata';

/**
 * Generate a new resource
 * POST /api/resources/generate
 */
export const POST: APIRoute = async ({ request }) => {
  const startTime = Date.now();
  
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
    const { industry, topic, title, options, profileId, userBrief } = body;
    
    if (!industry || !topic) {
      return new Response(
        JSON.stringify({
          error: 'Industry and topic are required',
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
    const existingPre = resources.find(
      (r) => r.industry === industry && topicsMatch(r.topic, topic)
    );
    const rag = await buildRagContext(`${industry} ${topic} ${resourceTitle}`, {
      topK: 8,
      excludeResourceIds: existingPre ? [existingPre.id] : []
    });
    const seedText = rag.contextText
      ? `Knowledge base context:\n${rag.contextText}\n\n---\nTask: ${resourceTitle}. ${topic} solutions for ${industry} businesses.`
      : `${resourceTitle}. ${topic} solutions for ${industry} businesses.`;

    if (isDevelopmentMode()) {
      console.log(
        `[API] RAG generate retrievalMs=${rag.retrievalMs} model=${rag.modelId} chunks=${rag.chunkIds.length}`
      );
    }
    
    const generated = await generateResourceBody({
      seedText,
      industry,
      topic,
      title: resourceTitle,
      userBrief: typeof userBrief === 'string' ? userBrief.trim() : undefined,
      userId: authResult.user.id,
      userRole: authResult.user.role,
      resolved,
      textGenerator,
      extrapolator,
      voiceMatcher,
      options,
    });

    const extrapolatedContent = generated.content;
    const voiceValidation = {
      score: generated.voiceScore,
      isValid: generated.voiceValid,
      issues: [] as string[],
      strengths: [] as string[],
    };
    if (generated.inferenceMode === 'template') {
      const full = voiceMatcher.validateVoice(extrapolatedContent);
      voiceValidation.score = full.score ?? generated.voiceScore;
      voiceValidation.isValid = full.isValid ?? generated.voiceValid;
      voiceValidation.issues = full.issues ?? [];
      voiceValidation.strengths = full.strengths ?? [];
    }

    const inferencePayload = {
      mode: generated.inferenceMode,
      modelId: generated.modelId ?? null,
    };

    const description = generateResourceCatalogDescription({
      voiceProfile: resolved.profile,
      title: resourceTitle,
      industry,
      topicLabel: topic,
      bodyExcerpt: extrapolatedContent
    });

    // Normalize topic to slug format for consistency
    const topicSlug = normalizeTopicSlug(topic);

    // Check for existing resource with same industry + topic
    const existingResource = resources.find(
      r => r.industry === industry && topicsMatch(r.topic, topic)
    );

    if (existingResource) {
      // Update existing resource instead of creating duplicate
      console.log(`[API] Found existing resource for ${industry}/${topic}, updating instead of creating duplicate`);
      
      existingResource.title = resourceTitle;
      existingResource.description = description;
      existingResource.content = extrapolatedContent;
      existingResource.generatedAt = new Date().toISOString();
      existingResource.generatedBy = authResult.user.email;
      existingResource.version = (existingResource.version || 1) + 1;
      existingResource.metadata = mergeInferenceMetadata(existingResource.metadata, {
        wordCount: extrapolatedContent.split(/\s+/).length,
        voiceScore: voiceValidation.score || 0,
        voiceProfileId: resolved.voiceProfileId,
        voiceProfileResolution: resolved.resolution,
        inferenceMode: generated.inferenceMode,
        modelId: generated.modelId,
      }) as import('../../../lib/resource-types').Resource['metadata'];

      await saveResources(resources);

      const indexed = await runIndexPipeline(existingResource);
      const ri = resources.findIndex((r) => r.id === existingResource.id);
      if (ri >= 0) {
        resources[ri] = indexed;
        await saveResources(resources);
      }

      const duration = Date.now() - startTime;
      console.log(`[API] POST /api/resources/generate - Updated existing resource (${duration}ms)`);
      
      return new Response(
        JSON.stringify({
          resource: indexed,
          voiceProfile: {
            resolution: resolved.resolution,
            profileId: resolved.voiceProfileId ?? null
          },
          rag: { retrievalMs: rag.retrievalMs, chunkIds: rag.chunkIds, modelId: rag.modelId },
          inference: inferencePayload,
          voiceValidation: {
            score: voiceValidation.score || 0,
            isValid: voiceValidation.isValid || false,
            issues: voiceValidation.issues || [],
            strengths: voiceValidation.strengths || []
          },
          success: true,
          updated: true,
          message: 'Resource updated (duplicate prevented)'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Create new resource if no duplicate found
    const resource: Resource = {
      id: `${industry}-${topicSlug}-${Date.now()}`,
      industry,
      topic: topicSlug, // Use normalized slug
      title: resourceTitle,
      description,
      content: extrapolatedContent,
      generatedAt: new Date().toISOString(),
      generatedBy: authResult.user.email,
      version: 1,
      status: 'draft',
      metadata: mergeInferenceMetadata(undefined, {
        wordCount: extrapolatedContent.split(/\s+/).length,
        voiceScore: voiceValidation.score || 0,
        voiceProfileId: resolved.voiceProfileId,
        voiceProfileResolution: resolved.resolution,
        inferenceMode: generated.inferenceMode,
        modelId: generated.modelId,
      }) as import('../../../lib/resource-types').Resource['metadata'],
    };

    resources.push(resource);
    await saveResources(resources);

    const indexedNew = await runIndexPipeline(resource);
    const rj = resources.findIndex((r) => r.id === resource.id);
    if (rj >= 0) {
      resources[rj] = indexedNew;
      await saveResources(resources);
    }

    const duration = Date.now() - startTime;
    console.log(`[API] POST /api/resources/generate - Success (${duration}ms)`);
    
    return new Response(
        JSON.stringify({
          resource: indexedNew,
          voiceProfile: {
            resolution: resolved.resolution,
            profileId: resolved.voiceProfileId ?? null
          },
          rag: { retrievalMs: rag.retrievalMs, chunkIds: rag.chunkIds, modelId: rag.modelId },
          inference: inferencePayload,
          voiceValidation: {
          score: voiceValidation.score || 0,
          isValid: voiceValidation.isValid || false,
          issues: voiceValidation.issues || [],
          strengths: voiceValidation.strengths || []
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
    console.error(`[API] POST /api/resources/generate - Error after ${duration}ms:`, error);
    
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
