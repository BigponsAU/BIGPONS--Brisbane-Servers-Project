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

function classifyUploadedFile(
  file: File,
  textContent: string
): { processingStatus: ProcessingStatus; text: string } {
  const name = file.name.toLowerCase();
  const isPdf = name.endsWith('.pdf') || file.type === 'application/pdf';
  if (!isPdf) {
    return { processingStatus: 'ready', text: textContent };
  }
  const looksBinary = textContent.includes('\0') || (textContent.trim().length < 32 && /[^\x20-\x7E\n\r\t]/.test(textContent));
  if (looksBinary) {
    return {
      processingStatus: 'ocr',
      text:
        '[PDF appears image-only or binary — OCR required. Replace this placeholder after extraction or use text-based PDF.]'
    };
  }
  return { processingStatus: 'ready', text: textContent };
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

    // Read file content
    const raw = await file.text();
    const classified = classifyUploadedFile(file, raw);
    const content = classified.text;
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

    if (autoProcess) {
      const { TextGenerator, VoiceMatcher, Extrapolator } = await import('@voice-framework');
      const textGenerator = new TextGenerator(resolved.profile);
      const voiceMatcher = new VoiceMatcher(resolved.profile);
      const extrapolator = new Extrapolator(resolved.profile);

      const seedText = `${resourceTitle}. ${topic} solutions for ${industry} businesses.`;
      const generatedContent = textGenerator.generateText(seedText, {
        length: 'long',
        includeExamples: true,
        includeStructure: true,
        style: 'descriptive'
      });

      processedContent = extrapolator.extrapolate(content + '\n\n' + generatedContent, {
        expansionLevel: 'moderate',
        addExamples: true,
        addDetails: true
      });

      voiceValidation = voiceMatcher.validateVoice(processedContent);
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
      
      existingResource.title = resourceTitle;
      existingResource.description = description;
      existingResource.content = processedContent;
      existingResource.generatedAt = new Date().toISOString();
      existingResource.generatedBy = authResult.user.email;
      existingResource.version = (existingResource.version || 1) + 1;
      if (autoPublish) {
        existingResource.status = 'published';
      }
      existingResource.metadata = {
        wordCount: processedContent.split(/\s+/).length,
        semanticLevel: 'high',
        voiceScore: voiceValidation.score || 0,
        voiceProfileId: resolved.voiceProfileId,
        voiceProfileResolution: resolved.resolution
      };
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
      metadata: {
        wordCount: processedContent.split(/\s+/).length,
        semanticLevel: 'high',
        voiceScore: voiceValidation.score || 0,
        voiceProfileId: resolved.voiceProfileId,
        voiceProfileResolution: resolved.resolution
      }
    };

    resources.push(resource);
    await saveResources(resources);

    const indexedNew = await runIndexPipeline(resource);
    const nj = resources.findIndex((r) => r.id === resource.id);
    if (nj >= 0) {
      resources[nj] = indexedNew;
      await saveResources(resources);
    }

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
