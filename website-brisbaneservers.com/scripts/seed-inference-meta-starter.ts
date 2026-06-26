#!/usr/bin/env npx tsx
/**
 * Seed the inference meta starter block into the resource corpus.
 * Usage: npm run seed:inference-meta-starter
 */
import { syncInferenceMetaStarterToResources } from '../src/lib/inference-meta-starter-corpus';
import { runIndexPipeline } from '../src/lib/semantic/pipeline';
import { saveResources } from '../src/lib/resources-api';

async function main(): Promise<void> {
  console.log('Seeding inference meta starter…\n');
  const sync = await syncInferenceMetaStarterToResources();
  console.log('Added:', sync.added, '| Updated:', sync.updated);

  const idx = sync.resources.findIndex((r) => r.id === 'starter-inference-on-resources');
  if (idx >= 0) {
    const indexed = await runIndexPipeline(sync.resources[idx]);
    sync.resources[idx] = indexed;
    await saveResources(sync.resources);
    console.log('Indexed starter:', indexed.processingStatus, '| Chunks:', indexed.chunkIds?.length ?? 0);
  }

  console.log('\nDone. Starter appears in GET /api/resources/starter-blocks and RAG retrieval.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
