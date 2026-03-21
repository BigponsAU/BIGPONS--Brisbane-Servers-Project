import type { APIRoute } from 'astro';
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
    const { industry, topic, title, options } = body;
    
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

    // Get voice framework components
    const { textGenerator, extrapolator, voiceMatcher } = await getVoiceFramework();

    // Generate resource content
    const resourceTitle = title || `${topic} for ${industry}`;
    const resources = await loadResources();
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

    if (import.meta.env.MODE === 'development') {
      console.log(
        `[API] RAG generate retrievalMs=${rag.retrievalMs} model=${rag.modelId} chunks=${rag.chunkIds.length}`
      );
    }
    
    const generatedContent = textGenerator.generateText(seedText, {
      length: options?.length || 'long',
      includeExamples: options?.includeExamples !== false,
      includeStructure: true,
      style: 'descriptive'
    });

    const extrapolatedContent = extrapolator.extrapolate(generatedContent, {
      expansionLevel: 'moderate',
      addExamples: true,
      addDetails: true
    });

    const voiceValidation = voiceMatcher.validateVoice(extrapolatedContent);
    
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
      existingResource.description = extrapolatedContent.substring(0, 200) + '...';
      existingResource.content = extrapolatedContent;
      existingResource.generatedAt = new Date().toISOString();
      existingResource.generatedBy = authResult.user.email;
      existingResource.version = (existingResource.version || 1) + 1;
      existingResource.metadata = {
        wordCount: extrapolatedContent.split(/\s+/).length,
        semanticLevel: 'high',
        voiceScore: voiceValidation.score || 0
      };

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
          rag: { retrievalMs: rag.retrievalMs, chunkIds: rag.chunkIds, modelId: rag.modelId },
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
      description: extrapolatedContent.substring(0, 200) + '...',
      content: extrapolatedContent,
      generatedAt: new Date().toISOString(),
      generatedBy: authResult.user.email,
      version: 1,
      status: 'draft',
      metadata: {
        wordCount: extrapolatedContent.split(/\s+/).length,
        semanticLevel: 'high',
        voiceScore: voiceValidation.score || 0
      }
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
        rag: { retrievalMs: rag.retrievalMs, chunkIds: rag.chunkIds, modelId: rag.modelId },
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
