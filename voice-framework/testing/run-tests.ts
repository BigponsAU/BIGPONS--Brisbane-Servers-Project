#!/usr/bin/env ts-node

/**
 * Test Runner Script
 * Command-line interface for running tests
 */

import { TestRunner } from './test-runner';
import { defaultTestSuite, quickTestSuite } from './test-cases';
import { TestSuite } from './models/test-case';

async function main() {
  const args = process.argv.slice(2);
  const format = args.includes('--format') 
    ? args[args.indexOf('--format') + 1] 
    : 'console';
  const output = args.includes('--output')
    ? args[args.indexOf('--output') + 1]
    : undefined;
  const quick = args.includes('--quick') || args.includes('-q');
  const suiteName = args.includes('--suite')
    ? args[args.indexOf('--suite') + 1]
    : undefined;

  const runner = new TestRunner('./test-results');

  let suite: TestSuite;
  
  if (suiteName) {
    // Load custom suite (would need to be implemented)
    console.log(`Loading custom suite: ${suiteName}`);
    suite = defaultTestSuite; // Fallback
  } else if (quick) {
    suite = quickTestSuite;
  } else {
    suite = defaultTestSuite;
  }

  // Override output format and path if specified
  if (format || output) {
    suite.config = {
      ...suite.config,
      outputFormat: format as any,
      outputPath: output
    };
  }

  try {
    const results = await runner.run(suite);
    process.exit(results.summary.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('Error running tests:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}


