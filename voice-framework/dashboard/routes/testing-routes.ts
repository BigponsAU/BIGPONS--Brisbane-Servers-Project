/**
 * Testing Routes
 * Handles A/B testing and test results endpoints
 */

import { Router, Request, Response } from 'express';
import { TestRunner } from '../../testing/test-runner';
import { defaultTestSuite, quickTestSuite } from '../../testing/test-cases';
import { TestSuite } from '../../testing/models/test-case';
import { handleRouteError } from '../utils/error-handler';
import { validateRunTests, validateTestResults } from '../middleware/validation';

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

      res.json({
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
      // In a real implementation, you'd load saved results
      // For now, return a placeholder
      const duration = Date.now() - startTime;
      console.log(`[API] GET /api/test-results - Success (${duration}ms)`);
      
      res.json({
        message: 'Test results endpoint',
        testId: testId || 'all',
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


