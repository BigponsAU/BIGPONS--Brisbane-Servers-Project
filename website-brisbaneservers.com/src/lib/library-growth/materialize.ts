import { Extrapolator, TextGenerator, VoiceMatcher } from '@voice-framework';
import { getVoiceFramework } from '~/utils/voice-framework';
import {
  loadResources,
  saveResources,
  normalizeTopicSlug,
  topicsMatch,
  type Resource,
} from '~/lib/resources-api';
import { buildRagContext } from '~/lib/semantic/rag';
import { runIndexPipeline } from '~/lib/semantic/pipeline';
import {
  generateResourceCatalogDescription,
  resolveResourceVoiceProfileForLibraryGrowth,
} from '~/lib/resource-voice-profile';
import { loadPipelineConfig } from '~/lib/pipeline-config';
import { loadLibraryGrowthConfig } from './config';
import {
  appendCaseStudyDraft,
  buildCaseStudyDraftFromGrowth,
} from './case-study-drafts';
import { getGrowthMaterializeBlockReason } from './dedup';
import type { GrowthProposal } from './types';
import { generateResourceBody } from '~/lib/inference/resource-generate';
import { mergeInferenceMetadata } from '~/lib/inference/inference-metadata';
import {
  LIBRARY_GROWTH_SYSTEM_USER_ID,
} from './auto-materialize';

export interface MaterializeResult {
  resource: Resource;
  voiceScore: number;
  published: boolean;
}

/**
 * Turn an approved growth proposal into draft/published **content** (resource, guide body, case study narrative).
 * Uses the workspace default voice profile (or bundled BIGPONS) only — never auto-creates per-area voice profiles.
 */
export async function materializeGrowthProposal(
  proposal: GrowthProposal,
  actorEmail: string
): Promise<MaterializeResult> {
  const blockReason = await getGrowthMaterializeBlockReason(proposal);
  if (blockReason) {
    throw new Error(blockReason);
  }

  const resources = await loadResources();
  const { profileManager, profileBuilder } = await getVoiceFramework();
  const resolved = await resolveResourceVoiceProfileForLibraryGrowth({
    profileManager,
    profileBuilder,
    resources,
  });

  const topicSlug = normalizeTopicSlug(proposal.topic);
  const existing = resources.find(
    (r) => r.industry === proposal.industry && topicsMatch(r.topic, proposal.topic)
  );

  const textGenerator = new TextGenerator(resolved.profile);
  const extrapolator = new Extrapolator(resolved.profile);
  const voiceMatcher = new VoiceMatcher(resolved.profile);

  const seedPrefix =
    proposal.kind === 'case_study'
      ? `Case study narrative for ${proposal.title}.`
      : `Authoritative guide: ${proposal.title}.`;

  const rag = await buildRagContext(
    `${proposal.industry} ${proposal.topic} ${proposal.title}`,
    { topK: 8, excludeResourceIds: existing ? [existing.id] : [] }
  );

  const seedText = rag.contextText
    ? `Knowledge base context:\n${rag.contextText}\n\n---\n${seedPrefix} Topic: ${proposal.topic}. Industry: ${proposal.industry}. ${proposal.rationale}`
    : `${seedPrefix} Topic: ${proposal.topic}. Industry: ${proposal.industry}.`;

  const generated = await generateResourceBody({
    seedText,
    industry: proposal.industry,
    topic: proposal.topic,
    title: proposal.title,
    userId: LIBRARY_GROWTH_SYSTEM_USER_ID,
    userRole: 'admin',
    resolved,
    textGenerator,
    extrapolator,
    voiceMatcher,
    reason: 'inference_generate',
  });

  const body = generated.content;
  const voiceScore = generated.voiceScore;

  const description = generateResourceCatalogDescription({
    voiceProfile: resolved.profile,
    title: proposal.title,
    industry: proposal.industry,
    topicLabel: proposal.topic,
    bodyExcerpt: body,
  });

  const [pipeline, growthConfig] = await Promise.all([
    loadPipelineConfig(),
    loadLibraryGrowthConfig(),
  ]);
  const reviewOnly = growthConfig.reviewOnlyPublish !== false;
  const publishThreshold =
    growthConfig.autoPublishMinScore ?? pipeline.autoPublishThreshold;
  const shouldPublish = !reviewOnly && voiceScore >= publishThreshold;

  let resource: Resource;

  if (existing) {
    existing.title = proposal.title;
    existing.description = description;
    existing.content = body;
    existing.generatedAt = new Date().toISOString();
    existing.generatedBy = actorEmail;
    existing.version = (existing.version ?? 1) + 1;
    existing.status = shouldPublish ? 'published' : existing.status === 'published' ? 'published' : 'draft';
    existing.metadata = mergeInferenceMetadata(existing.metadata, {
      wordCount: body.split(/\s+/).length,
      voiceScore,
      voiceProfileId: resolved.voiceProfileId,
      voiceProfileResolution: resolved.resolution,
      inferenceMode: generated.inferenceMode,
      modelId: generated.modelId,
    }) as Resource['metadata'];
    resource = existing;
  } else {
    resource = {
      id: `${proposal.industry}-${topicSlug}-growth-${Date.now()}`,
      industry: proposal.industry,
      topic: topicSlug,
      title: proposal.title,
      description,
      content: body,
      generatedAt: new Date().toISOString(),
      generatedBy: actorEmail,
      version: 1,
      status: shouldPublish ? 'published' : 'draft',
      metadata: mergeInferenceMetadata(undefined, {
        wordCount: body.split(/\s+/).length,
        voiceScore,
        voiceProfileId: resolved.voiceProfileId,
        voiceProfileResolution: resolved.resolution,
        inferenceMode: generated.inferenceMode,
        modelId: generated.modelId,
        growthKind: proposal.kind === 'case_study' ? 'case_study' : undefined,
      }) as Resource['metadata'],
    };
    resources.push(resource);
  }

  await saveResources(resources);
  const indexed = await runIndexPipeline(resource);
  const ri = resources.findIndex((r) => r.id === indexed.id);
  if (ri >= 0) {
    resources[ri] = indexed;
    await saveResources(resources);
  }

  if (proposal.kind === 'case_study') {
    try {
      await appendCaseStudyDraft(buildCaseStudyDraftFromGrowth(proposal, indexed));
    } catch (error) {
      console.warn('[library-growth] Case study draft append failed:', error);
    }
  }

  return {
    resource: indexed,
    voiceScore,
    published: indexed.status === 'published',
  };
}
