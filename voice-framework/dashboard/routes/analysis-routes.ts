/**
 * Analysis Routes
 * Handles text analysis endpoints: tone analysis, pattern extraction, and shredding
 */

import { Router, Request, Response } from 'express';
import { ToneAnalyzer } from '../../analyzers/tone-analyzer';
import { PatternExtractor } from '../../analyzers/pattern-extractor';
import { Shredder } from '../../analyzers/shredder';
import { handleRouteError } from '../utils/error-handler';
import { validateAnalyze, validateExtractPatterns, validateShred, validateCompareTruths } from '../middleware/validation';

export function createAnalysisRoutes(
  toneAnalyzer: ToneAnalyzer,
  patternExtractor: PatternExtractor,
  shredder: Shredder
): Router {
  const router = Router();

  /**
   * Analyze text tone and voice match
   * POST /api/analyze
   * Body: { text: string }
   */
  router.post('/analyze', validateAnalyze, async (req: Request, res: Response) => {
    const startTime = Date.now();
    console.log('[API] POST /api/analyze', { textLength: req.body?.text?.length || 0 });
    
    try {
      const { text } = req.body;
      
      // Input validation
      if (!text) {
        return res.status(400).json({ 
          error: 'Text is required',
          code: 'MISSING_TEXT',
          success: false 
        });
      }
      
      if (typeof text !== 'string') {
        return res.status(400).json({ 
          error: 'Text must be a string',
          code: 'INVALID_TEXT_TYPE',
          success: false 
        });
      }
      
      if (text.length > 50000) {
        return res.status(400).json({ 
          error: 'Text is too long. Maximum length is 50,000 characters.',
          code: 'TEXT_TOO_LONG',
          success: false 
        });
      }
      
      if (text.length < 10) {
        return res.status(400).json({ 
          error: 'Text is too short. Minimum length is 10 characters.',
          code: 'TEXT_TOO_SHORT',
          success: false 
        });
      }

      const analysis = toneAnalyzer.analyzeText(text);
      const match = toneAnalyzer.compareToProfile(analysis);
      const duration = Date.now() - startTime;

      console.log(`[API] POST /api/analyze - Success (${duration}ms)`);
      res.json({
        analysis,
        match,
        success: true
      });
    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      console.error(`[API] POST /api/analyze - Error after ${duration}ms:`, error);
      handleRouteError(error, res, 500);
    }
  });

  /**
   * Extract patterns from text
   * POST /api/extract-patterns
   * Body: { text: string }
   */
  router.post('/extract-patterns', validateExtractPatterns, async (req: Request, res: Response) => {
    const startTime = Date.now();
    console.log('[API] POST /api/extract-patterns', { textLength: req.body?.text?.length || 0 });
    
    try {
      const { text } = req.body;
      
      if (!text) {
        return res.status(400).json({ 
          error: 'Text is required',
          code: 'MISSING_TEXT',
          success: false 
        });
      }
      
      if (typeof text !== 'string') {
        return res.status(400).json({ 
          error: 'Text must be a string',
          code: 'INVALID_TEXT_TYPE',
          success: false 
        });
      }
      
      if (text.length > 50000) {
        return res.status(400).json({ 
          error: 'Text is too long. Maximum length is 50,000 characters.',
          code: 'TEXT_TOO_LONG',
          success: false 
        });
      }

      const patterns = patternExtractor.extractPatterns(text);
      const duration = Date.now() - startTime;

      console.log(`[API] POST /api/extract-patterns - Success (${duration}ms)`);
      res.json({
        patterns,
        success: true
      });
    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      console.error(`[API] POST /api/extract-patterns - Error after ${duration}ms:`, error);
      handleRouteError(error, res, 500);
    }
  });

  /**
   * Shred text - extract objective truths
   * POST /api/shred
   * Body: { text: string }
   */
  router.post('/shred', validateShred, async (req: Request, res: Response) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: 'Text is required', success: false });
      }

      const analysis = shredder.shred(text);

      res.json({
        analysis,
        success: true
      });
    } catch (error: unknown) {
      handleRouteError(error, res, 500);
    }
  });

  /**
   * Compare truths from multiple sources
   * POST /api/compare-truths
   * Body: { text1: string, text2: string }
   */
  router.post('/compare-truths', validateCompareTruths, async (req: Request, res: Response) => {
    try {
      const { text1, text2 } = req.body;
      if (!text1 || !text2) {
        return res.status(400).json({ error: 'Both text1 and text2 are required', success: false });
      }

      const analysis1 = shredder.shred(text1);
      const analysis2 = shredder.shred(text2);
      const comparison = shredder.compareTruths(analysis1, analysis2);

      res.json({
        comparison,
        analysis1,
        analysis2,
        success: true
      });
    } catch (error: unknown) {
      handleRouteError(error, res, 500);
    }
  });

  return router;
}


