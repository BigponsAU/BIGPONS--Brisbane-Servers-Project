import type { Resource } from '../resource-types';
import { indexResource } from './chunk-index';

/**
 * Run indexing after resource mutation; updates embedding fields on success.
 */
export async function runIndexPipeline(resource: Resource): Promise<Resource> {
  try {
    const chunks = await indexResource(resource);
    return {
      ...resource,
      chunkIds: chunks.map((c) => c.id),
      embeddingModel: chunks[0]?.embeddingModel ?? resource.embeddingModel,
      embeddingVersion: chunks[0]?.embeddingVersion ?? 1,
      processingStatus: 'ready'
    };
  } catch (e) {
    console.error('[pipeline] index failed', e);
    return {
      ...resource,
      processingStatus: 'failed'
    };
  }
}
