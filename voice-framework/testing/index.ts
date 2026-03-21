/**
 * Testing Framework - Main Entry Point
 * 
 * A/B testing framework for the voice framework
 */

export { TestHarness, TestSuiteResult } from './test-harness';
export { TestRunner } from './test-runner';
export * from './models/test-case';
export {
  textGenerationTest,
  extrapolationTest,
  voiceMatchTest,
  patternExtractionTest,
  defaultTestSuite,
  quickTestSuite
} from './test-cases';

/**
 * Quick start function for running tests
 */
export async function runTests(testSuite?: any) {
  const { TestRunner } = await import('./test-runner');
  const { defaultTestSuite } = await import('./test-cases');
  
  const runner = new TestRunner();
  const suite = testSuite || defaultTestSuite;
  
  return await runner.run(suite);
}


