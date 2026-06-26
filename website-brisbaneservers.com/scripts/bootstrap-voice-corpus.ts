#!/usr/bin/env npx tsx
/**
 * Bootstrap voice map: reindex published resources + rebuild Brisbane default profile.
 * Usage: npm run bootstrap:voice-corpus
 */
import { getVoiceFramework } from '../src/utils/voice-framework';
import { bootstrapVoiceCorpus } from '../src/lib/brisbane-profile';

async function main(): Promise<void> {
  console.log('Bootstrapping voice corpus (index + Brisbane profile)…\n');
  const { profileManager, profileBuilder } = await getVoiceFramework();
  const result = await bootstrapVoiceCorpus(profileManager, profileBuilder);

  console.log('Brisbane profile:', result.brisbane.profile.name, `(${result.brisbane.profile.id})`);
  console.log('  Created:', result.brisbane.created);
  console.log('  Corpus resources:', result.brisbane.corpusCount);
  console.log(
    'Inference meta starter:',
    result.inferenceMetaStarter.added ? 'added' : result.inferenceMetaStarter.updated ? 'updated' : 'unchanged'
  );
  console.log(
    'Case studies in corpus:',
    result.caseStudies.totalCaseStudies,
    `(added ${result.caseStudies.added}, updated ${result.caseStudies.updated})`
  );
  console.log(
    'Topic guides in corpus:',
    result.topicGuides.totalGuides,
    `(added ${result.topicGuides.added}, updated ${result.topicGuides.updated})`
  );
  console.log('Indexed:', result.indexed, '| Failed:', result.indexFailed, '| Skipped:', result.indexSkipped);
  console.log('Semantic index:', result.chunkStats.chunkCount, 'chunks across', result.chunkStats.resourceIds, 'resources');
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
