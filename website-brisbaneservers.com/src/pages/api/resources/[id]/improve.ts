import type { APIRoute } from 'astro';
import { requireEditor } from '../../../../utils/auth';
import { getVoiceFramework } from '../../../../utils/voice-framework';
import { loadResources, saveResources } from '../../../../lib/resources-api';
import { buildRagContext } from '../../../../lib/semantic/rag';
import { runIndexPipeline } from '../../../../lib/semantic/pipeline';

/**
 * Improve/regenerate resource content
 * POST /api/resources/:id/improve
 */
export const POST: APIRoute = async ({ params, request }) => {
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
    const { id } = params;
    if (!id) {
      return new Response(
        JSON.stringify({
          error: 'Resource ID is required',
          code: 'MISSING_ID',
          success: false
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const resources = await loadResources();
    const resource = resources.find(r => r.id === id);

    if (!resource) {
      return new Response(
        JSON.stringify({
          error: 'Resource not found',
          code: 'NOT_FOUND',
          success: false
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const { extrapolator, voiceMatcher } = await getVoiceFramework();

    const rag = await buildRagContext(resource.content.slice(0, 1500), {
      topK: 6,
      resourceId: resource.id
    });
    const baseForExtrapolation = rag.contextText
      ? `${rag.contextText}\n\n---\nOriginal:\n${resource.content}`
      : resource.content;

    if (import.meta.env.MODE === 'development') {
      console.log(
        `[API] RAG improve retrievalMs=${rag.retrievalMs} model=${rag.modelId} chunks=${rag.chunkIds.length}`
      );
    }

    // Improve content using extrapolator
    const improvedContent = extrapolator.extrapolate(baseForExtrapolation, {
      expansionLevel: 'moderate',
      addExamples: true,
      addDetails: true
    });

    const voiceValidation = voiceMatcher.validateVoice(improvedContent);
    
    // Update resource
    const index = resources.findIndex(r => r.id === id);
    resources[index] = {
      ...resources[index],
      content: improvedContent,
      description: improvedContent.substring(0, 200) + '...',
      version: resources[index].version + 1,
      metadata: {
        ...resources[index].metadata,
        wordCount: improvedContent.split(/\s+/).length,
        voiceScore: voiceValidation.score || 0
      }
    };

    await saveResources(resources);

    const indexed = await runIndexPipeline(resources[index]);
    resources[index] = indexed;
    await saveResources(resources);

    return new Response(
      JSON.stringify({
        resource: resources[index],
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
