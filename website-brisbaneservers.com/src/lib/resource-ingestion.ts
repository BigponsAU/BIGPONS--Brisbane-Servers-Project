/**
 * Step 1 — ingestion: normalize routing fields and defaults for new resources.
 * Normative fields: docs/project/RESOURCE_CONTRACT.md
 */

import type { ProcessingStatus, Resource } from './resource-types';
import { normalizeTopicSlug } from './resources-api';

/** Where the row entered the hub (used for defaults, not necessarily persisted on Resource). */
export type IngestionEntryKind =
  | 'editor_process'
  | 'file_upload'
  | 'starter_fork'
  | 'community_upload'
  | 'seed'
  | 'generate_rag';

export function normalizeIngestionRouting(input: {
  industry: string;
  topic: string;
}): { industry: string; topicSlug: string } {
  const industry = input.industry.trim();
  const topicSlug = normalizeTopicSlug(input.topic);
  return { industry, topicSlug };
}

export function newResourceId(industry: string, topicSlug: string): string {
  return `${industry}-${topicSlug}-${Date.now()}`;
}

export function defaultProcessingStatusForEntry(kind: IngestionEntryKind): ProcessingStatus {
  switch (kind) {
    case 'file_upload':
    case 'community_upload':
      return 'queued';
    case 'editor_process':
    case 'starter_fork':
    case 'seed':
    case 'generate_rag':
    default:
      return 'ready';
  }
}

export interface BuildResourceFromEditorProcessInput {
  industry: string;
  topic: string;
  title: string;
  body: string;
  generatedBy: string;
  ownerId: string;
  shouldPublish: boolean;
  metadata?: Resource['metadata'];
}

/**
 * POST /api/resources/process — direct body after voice pipeline (no file upload).
 */
export function buildResourceFromEditorProcess(
  input: BuildResourceFromEditorProcessInput
): Resource {
  const { industry, topicSlug } = normalizeIngestionRouting({
    industry: input.industry,
    topic: input.topic
  });
  const body = input.body;
  const resource: Resource = {
    id: newResourceId(industry, topicSlug),
    industry,
    topic: topicSlug,
    title: input.title,
    description: body.substring(0, 200) + (body.length > 200 ? '...' : ''),
    content: body,
    generatedAt: new Date().toISOString(),
    generatedBy: input.generatedBy,
    ownerId: input.ownerId,
    version: 1,
    status: input.shouldPublish ? 'published' : 'draft',
    isStarterBlock: false,
    visibility: 'private',
    metadata: input.metadata,
    processingStatus: defaultProcessingStatusForEntry('editor_process')
  };
  return resource;
}
