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

  const generatedContent = textGenerator.generateText(seedText, {
    length: 'long',
    includeExamples: true,
    includeStructure: true,
    style: 'descriptive',
  });

  const body = extrapolator.extrapolate(generatedContent, {
    expansionLevel: 'moderate',
    addExamples: true,
    addDetails: true,
  });

  const voiceValidation = voiceMatcher.validateVoice(body);
  const voiceScore = voiceValidation.score ?? 0;

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
  const publishThreshold =
    growthConfig.autoPublishMinScore ?? pipeline.autoPublishThreshold;
  const shouldPublish = voiceScore >= publishThreshold;

  let resource: Resource;

  if (existing) {
    existing.title = proposal.title;
    existing.description = description;
    existing.content = body;
    existing.generatedAt = new Date().toISOString();
    existing.generatedBy = actorEmail;
    existing.version = (existing.version ?? 1) + 1;
    existing.status = shouldPublish ? 'published' : existing.status === 'published' ? 'published' : 'draft';
    existing.metadata = {
      wordCount: body.split(/\s+/).length,
      semanticLevel: 'high',
      voiceScore,
      voiceProfileId: resolved.voiceProfileId,
      voiceProfileResolution: resolved.resolution,
    };
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
      metadata: {
        wordCount: body.split(/\s+/).length,
        semanticLevel: 'high',
        voiceScore,
        voiceProfileId: resolved.voiceProfileId,
        voiceProfileResolution: resolved.resolution,
        ...(proposal.kind === 'case_study' ? { growthKind: 'case_study' as const } : {}),
      },
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
