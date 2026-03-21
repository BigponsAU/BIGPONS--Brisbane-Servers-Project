/**
 * Test Setup Configuration
 * 
 * Basic test infrastructure setup for the Voice Framework.
 * This file configures the test environment and provides utilities.
 * 
 * To use a full testing framework, install Jest or Vitest:
 *   npm install --save-dev jest @types/jest
 *   or
 *   npm install --save-dev vitest @vitest/ui
 */

/**
 * Simple test runner utility
 * For production use, consider Jest or Vitest
 */
export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

export class SimpleTestRunner {
  private tests: Array<{ name: string; fn: () => void | Promise<void> }> = [];
  private results: TestResult[] = [];

  /**
   * Register a test
   */
  test(name: string, fn: () => void | Promise<void>): void {
    this.tests.push({ name, fn });
  }

  /**
   * Run all tests
   */
  async run(): Promise<TestResult[]> {
    this.results = [];
    
    for (const test of this.tests) {
      const start = Date.now();
      try {
        await test.fn();
        const duration = Date.now() - start;
        this.results.push({ name: test.name, passed: true, duration });
        console.log(`✅ ${test.name} (${duration}ms)`);
      } catch (error) {
        const duration = Date.now() - start;
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.results.push({ name: test.name, passed: false, error: errorMessage, duration });
        console.error(`❌ ${test.name}: ${errorMessage}`);
      }
    }

    return this.results;
  }

  /**
   * Get test summary
   */
  getSummary(): { total: number; passed: number; failed: number } {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    return {
      total: this.results.length,
      passed,
      failed,
    };
  }
}

/**
 * Assertion utilities
 */
export function assert(condition: boolean, message?: string): void {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

export function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, but got ${actual}`);
  }
}

export function assertThrows(fn: () => void, message?: string): void {
  try {
    fn();
    throw new Error(message || 'Expected function to throw, but it did not');
  } catch (error) {
    // Expected to throw
  }
}

/**
 * Example test file structure:
 * 
 * import { SimpleTestRunner, assert, assertEqual } from './setup';
 * 
 * const runner = new SimpleTestRunner();
 * 
 * runner.test('Example test', () => {
 *   assertEqual(1 + 1, 2, 'Math should work');
 * });
 * 
 * runner.run().then(() => {
 *   const summary = runner.getSummary();
 *   console.log(`Tests: ${summary.passed}/${summary.total} passed`);
 * });
 */
