/**
 * Testing Routes
 * Handles A/B testing and test results endpoints
 */

import { Router, Request, Response } from 'express';
import { TestRunner } from '../../testing/test-runner';
import { defaultTestSuite, quickTestSuite } from '../../testing/test-cases';
import { TestSuite } from '../../testing/models/test-case';
import { TestSuiteResult } from '../../testing/test-harness';
import { handleRouteError } from '../utils/error-handler';
import { validateRunTests, validateTestResults } from '../middleware/validation';
import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_RESULTS_FILE = path.join(__dirname, '../../storage/test-results.json');

interface StoredTestResult {
  id: string;
  suiteType: 'default' | 'quick' | 'custom';
  suiteId: string;
  createdAt: string;
  result: TestSuiteResult;
}

async function ensureResultsFile(): Promise<void> {
  try {
    await fs.access(TEST_RESULTS_FILE);
  } catch {
    await fs.writeFile(TEST_RESULTS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

async function loadStoredResults(): Promise<StoredTestResult[]> {
  await ensureResultsFile();
  const content = await fs.readFile(TEST_RESULTS_FILE, 'utf-8');
  const parsed = JSON.parse(content);
  return Array.isArray(parsed) ? parsed : [];
}

async function saveStoredResults(results: StoredTestResult[]): Promise<void> {
  await fs.writeFile(TEST_RESULTS_FILE, JSON.stringify(results, null, 2), 'utf-8');
}

export function createTestingRoutes(testRunner: TestRunner): Router {
  const router = Router();

  /**
   * Run A/B tests
   * POST /api/run-tests
   * Body: { suiteType?: 'default' | 'quick', customSuite?: TestSuite }
   */
  router.post('/run-tests', validateRunTests, async (req: Request, res: Response) => {
    try {
      const { suiteType = 'default', customSuite } = req.body;

      let suite: TestSuite;
      if (customSuite) {
        suite = customSuite;
      } else if (suiteType === 'quick') {
        suite = quickTestSuite;
      } else {
        suite = defaultTestSuite;
      }

      const result = await testRunner.run(suite);
      const storedResults = await loadStoredResults();
      const record: StoredTestResult = {
        id: `test_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        suiteType: customSuite ? 'custom' : suiteType,
        suiteId: result.suiteId,
        createdAt: new Date().toISOString(),
        result,
      };
      storedResults.unshift(record);
      // Keep history bounded to avoid unbounded growth.
      await saveStoredResults(storedResults.slice(0, 100));

      res.json({
        testId: record.id,
        result,
        success: true
      });
    } catch (error: unknown) {
      handleRouteError(error, res, 500);
    }
  });

  /**
   * Get test results
   * GET /api/test-results/:testId?
   * Params: testId (optional) - must be alphanumeric if provided
   */
  router.get('/test-results/:testId?', validateTestResults, async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { testId } = req.params;
    
    console.log('[API] GET /api/test-results', { testId: testId || 'all' });
    
    try {
      const storedResults = await loadStoredResults();
      const duration = Date.now() - startTime;
      console.log(`[API] GET /api/test-results - Success (${duration}ms)`);

      if (testId) {
        const record = storedResults.find((item) => item.id === testId);
        if (!record) {
          return res.status(404).json({
            error: 'Test result not found',
            success: false
          });
        }
        return res.json({
          testId: record.id,
          createdAt: record.createdAt,
          suiteType: record.suiteType,
          result: record.result,
          success: true
        });
      }

      return res.json({
        testId: 'all',
        count: storedResults.length,
        results: storedResults.map((item) => ({
          testId: item.id,
          createdAt: item.createdAt,
          suiteType: item.suiteType,
          suiteName: item.result.suiteName,
          summary: item.result.summary
        })),
        success: true
      });
    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      console.error(`[API] GET /api/test-results - Error after ${duration}ms:`, error);
      handleRouteError(error, res, 500);
    }
  });

  return router;
}


