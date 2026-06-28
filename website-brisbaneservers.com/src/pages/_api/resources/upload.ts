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
import type { ProcessingStatus } from '../../../lib/resource-types';
import {
  generateResourceCatalogDescription,
  resolveResourceVoiceProfile
} from '../../../lib/resource-voice-profile';
import { runIndexPipeline } from '../../../lib/semantic/pipeline';
import { validateResourceSourceText } from '../../../lib/resource-submission-guard';
import { enhanceIngestedContent } from '../../../lib/inference/resource-ingest-inference';
import { mergeInferenceMetadata } from '../../../lib/inference/inference-metadata';
import { extractDocument } from '../../../lib/documents/extract-document';
import { rewriteDocumentPreservingStructure } from '../../../lib/documents/voice-document-rewrite';
import {
  ensureExtractTokenBalance,
  spendDocumentTokens,
  tokenCostForExtractMethod,
} from '../../../lib/documents/document-token-guard';
import { DOCUMENT_TOKEN_COSTS } from '../../../data/document-token-costs';
import { schedulePublicSurfaceUpdate } from '../../../lib/publish-public-surfaces';

function mapExtractStatus(status: 'ready' | 'ocr' | 'failed'): ProcessingStatus {
  if (status === 'ready') return 'ready';
  if (status === 'ocr') return 'ocr';
  return 'failed';
}

/**
 * Upload a resource file
 * POST /api/resources/upload
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
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return new Response(
        JSON.stringify({
          error: 'No file uploaded',
          code: 'NO_FILE',
          success: false
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const industry = formData.get('industry') as string;
    const topic = formData.get('topic') as string;
    const title = formData.get('title') as string | null;
    const autoProcess = formData.get('autoProcess') !== 'false';
    const autoPublish = formData.get('autoPublish') === 'true';
    const preserveStructure = formData.get('preserveStructure') === 'true';
    
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

    // Extract text (PDF, DOCX, images via NVIDIA vision, plain text locally)
    const bytes = new Uint8Array(await file.arrayBuffer());
    const extractPreflight = await ensureExtractTokenBalance({
      userId: authResult.user.id,
      role: authResult.user.role,
      fileName: file.name,
      mimeType: file.type,
    });
    if (!extractPreflight.ok) {
      return new Response(
        JSON.stringify({
          error: extractPreflight.error,
          code: extractPreflight.code,
          success: false,
          tokens: { required: extractPreflight.cost, balance: extractPreflight.balance },
        }),
        { status: 402, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const extracted = await extractDocument({
      fileName: file.name,
      mimeType: file.type,
      bytes,
    });

    if (extracted.processingStatus === 'failed' || extracted.text.trim().length < 32) {
      return new Response(
        JSON.stringify({
          error:
            extracted.warning ||
            'Could not extract enough text from this file. Try a text-based PDF or configure NVIDIA vision OCR.',
          code: 'EXTRACTION_FAILED',
          success: false,
          extraction: extracted,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const content = extracted.text;
    const classified = { processingStatus: mapExtractStatus(extracted.processingStatus), text: content };

    const extractTokenCost = tokenCostForExtractMethod(extracted.method);
    const extractSpend = await spendDocumentTokens({
      userId: authResult.user.id,
      role: authResult.user.role,
      cost: extractTokenCost,
      reason: 'document_extract',
    });
    if (!extractSpend.ok) {
      return new Response(
        JSON.stringify({
          error: extractSpend.error,
          code: extractSpend.code,
          success: false,
          tokens: { required: extractSpend.cost, balance: extractSpend.balance },
        }),
        { status: 402, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let structureRewriteSpend: Awaited<ReturnType<typeof spendDocumentTokens>> | null = null;
    if (autoProcess && preserveStructure) {
      structureRewriteSpend = await spendDocumentTokens({
        userId: authResult.user.id,
        role: authResult.user.role,
        cost: DOCUMENT_TOKEN_COSTS.rewrite,
        reason: 'document_rewrite',
      });
      if (!structureRewriteSpend.ok) {
        return new Response(
          JSON.stringify({
            error: structureRewriteSpend.error,
            code: structureRewriteSpend.code,
            success: false,
            tokens: {
              required: structureRewriteSpend.cost,
              balance: structureRewriteSpend.balance,
            },
          }),
          { status: 402, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
    const sourceGuard = validateResourceSourceText(content);
    if (!sourceGuard.ok) {
      return new Response(
        JSON.stringify({
          error: sourceGuard.message,
          code: sourceGuard.code,
          success: false
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    const resourceTitle = title || file.name.replace(/\.[^/.]+$/, '');
    const profileIdRaw = formData.get('profileId') as string | null;
    const requestedProfileId = profileIdRaw?.trim() || undefined;

    const topicSlug = normalizeTopicSlug(topic);
    const resources = await loadResources();
    const { profileManager, profileBuilder } = await getVoiceFramework();
    const resolved = await resolveResourceVoiceProfile({
      requestedProfileId,
      profileManager,
      profileBuilder,
      resources
    });

    let processedContent = content;
    let voiceValidation: {
      score: number;
      isValid: boolean;
      issues: string[];
      strengths: string[];
    } = { score: 0, isValid: false, issues: [], strengths: [] };
    let inferencePayload: { mode: string; modelId: string | null } | undefined;

    if (autoProcess) {
      const { extrapolator } = await getVoiceFramework();
      const { VoiceMatcher } = await import('@voice-framework');
      const voiceMatcher = new VoiceMatcher(resolved.profile);

      if (preserveStructure) {
        const rewritten = await rewriteDocumentPreservingStructure({
          content,
          title: resourceTitle,
          profile: resolved.profile,
          voiceMatcher,
          userId: authResult.user.id,
          userRole: authResult.user.role,
        });
        processedContent = rewritten.content;
        voiceValidation = {
          score: rewritten.voiceScore,
          isValid: rewritten.voiceValid,
          issues: [],
          strengths: [],
        };
        inferencePayload = {
          mode: rewritten.inferenceMode,
          modelId: rewritten.modelId,
        };
      } else {
        const enhanced = await enhanceIngestedContent({
          content,
          title: resourceTitle,
          industry,
          topic,
          userId: authResult.user.id,
          userRole: authResult.user.role,
          resolved,
          extrapolator,
          voiceMatcher,
        });

        processedContent = enhanced.content;
        voiceValidation = voiceMatcher.validateVoice(processedContent);
        voiceValidation = {
          score: voiceValidation.score ?? enhanced.voiceScore,
          isValid: voiceValidation.isValid ?? enhanced.voiceValid,
          issues: voiceValidation.issues || [],
          strengths: voiceValidation.strengths || [],
        };
        inferencePayload = {
          mode: enhanced.inferenceMode,
          modelId: enhanced.modelId ?? null,
        };
      }
    }

    const description = generateResourceCatalogDescription({
      voiceProfile: resolved.profile,
      title: resourceTitle,
      industry,
      topicLabel: topic,
      bodyExcerpt: processedContent
    });

    // Check for existing resource with same industry + topic
    const existingResource = resources.find(
      r => r.industry === industry && topicsMatch(r.topic, topic)
    );

    if (existingResource) {
      // Update existing resource instead of creating duplicate
      // Log in development only
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[API] Found existing resource for ${industry}/${topic}, updating instead of creating duplicate`);
      }

      const beforeSnapshot: Resource = { ...existingResource };
      
      existingResource.title = resourceTitle;
      existingResource.description = description;
      existingResource.content = processedContent;
      existingResource.generatedAt = new Date().toISOString();
      existingResource.generatedBy = authResult.user.email;
      existingResource.version = (existingResource.version || 1) + 1;
      if (autoPublish) {
        existingResource.status = 'published';
      }
      existingResource.metadata = mergeInferenceMetadata(existingResource.metadata, {
        wordCount: processedContent.split(/\s+/).length,
        voiceScore: voiceValidation.score || 0,
        voiceProfileId: resolved.voiceProfileId,
        voiceProfileResolution: resolved.resolution,
        ...(inferencePayload
          ? {
              inferenceMode: inferencePayload.mode as 'nvidia' | 'workers-ai' | 'template',
              modelId: inferencePayload.modelId ?? undefined,
            }
          : {}),
      }) as Resource['metadata'];
      existingResource.processingStatus = classified.processingStatus;
      existingResource.sourceRef = {
        kind: 'upload',
        filename: file.name,
        mimeType: file.type || undefined
      };

      await saveResources(resources);

      const indexedEx = await runIndexPipeline(existingResource);
      const exi = resources.findIndex((r) => r.id === existingResource.id);
      if (exi >= 0) {
        resources[exi] = indexedEx;
        await saveResources(resources);
      }

      schedulePublicSurfaceUpdate(beforeSnapshot, indexedEx, 'resource-upload-update');

      const duration = Date.now() - startTime;
      // Log in development only
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[API] POST /api/resources/upload - Updated existing resource (${duration}ms)`);
      }

      return new Response(
        JSON.stringify({
          resource: indexedEx,
          voiceProfile: {
            resolution: resolved.resolution,
            profileId: resolved.voiceProfileId ?? null
          },
          voiceValidation,
          inference: inferencePayload,
          extraction: {
            method: extracted.method,
            charCount: extracted.charCount,
            visionModelId: extracted.visionModelId,
            warning: extracted.warning,
          },
          success: true,
          processed: autoProcess,
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
      content: processedContent,
      generatedAt: new Date().toISOString(),
      generatedBy: authResult.user.email,
      version: 1,
      status: autoPublish ? 'published' : 'draft',
      processingStatus: classified.processingStatus,
      sourceRef: {
        kind: 'upload',
        filename: file.name,
        mimeType: file.type || undefined
      },
      metadata: mergeInferenceMetadata(undefined, {
        wordCount: processedContent.split(/\s+/).length,
        voiceScore: voiceValidation.score || 0,
        voiceProfileId: resolved.voiceProfileId,
        voiceProfileResolution: resolved.resolution,
        ...(inferencePayload
          ? {
              inferenceMode: inferencePayload.mode as 'nvidia' | 'workers-ai' | 'template',
              modelId: inferencePayload.modelId ?? undefined,
            }
          : {}),
      }) as Resource['metadata'],
    };

    resources.push(resource);
    await saveResources(resources);

    const indexedNew = await runIndexPipeline(resource);
    const nj = resources.findIndex((r) => r.id === resource.id);
    if (nj >= 0) {
      resources[nj] = indexedNew;
      await saveResources(resources);
    }

    schedulePublicSurfaceUpdate(
      { ...indexedNew, status: 'draft' },
      indexedNew,
      'resource-upload-publish',
    );

    const duration = Date.now() - startTime;
    // Log in development only
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[API] POST /api/resources/upload - Success (${duration}ms)`);
    }

    return new Response(
        JSON.stringify({
          resource: indexedNew,
          voiceProfile: {
            resolution: resolved.resolution,
            profileId: resolved.voiceProfileId ?? null
          },
          voiceValidation,
          inference: inferencePayload,
          extraction: {
            method: extracted.method,
            charCount: extracted.charCount,
            visionModelId: extracted.visionModelId,
            warning: extracted.warning,
          },
          success: true,
          processed: autoProcess
        }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    console.error(`[API] POST /api/resources/upload - Error after ${duration}ms:`, error);
    
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
