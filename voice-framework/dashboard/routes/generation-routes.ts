/**
 * Generation Routes
 * Handles text generation, extrapolation, and voice matching endpoints
 */

import { Router, Request, Response } from 'express';
import { TextGenerator } from '../../generators/text-generator';
import { Extrapolator } from '../../generators/extrapolator';
import { VoiceMatcher } from '../../generators/voice-matcher';
import { handleRouteError } from '../utils/error-handler';
import { validateGenerate, validateExtrapolate, validateExtrapolateProject, validateMatchVoice } from '../middleware/validation';

export function createGenerationRoutes(
  textGenerator: TextGenerator,
  extrapolator: Extrapolator,
  voiceMatcher: VoiceMatcher
): Router {
  const router = Router();

  /**
   * Generate text matching voice profile
   * POST /api/generate
   * Body: { topic: string, options?: GenerationOptions }
   */
  router.post('/generate', validateGenerate, async (req: Request, res: Response) => {
    const startTime = Date.now();
    console.log('[API] POST /api/generate', { topic: req.body?.topic?.substring(0, 50), options: req.body?.options });
    
    try {
      const { topic, options } = req.body;
      
      if (!topic) {
        return res.status(400).json({ 
          error: 'Topic is required',
          code: 'MISSING_TOPIC',
          success: false 
        });
      }
      
      if (typeof topic !== 'string') {
        return res.status(400).json({ 
          error: 'Topic must be a string',
          code: 'INVALID_TOPIC_TYPE',
          success: false 
        });
      }
      
      if (topic.length > 1000) {
        return res.status(400).json({ 
          error: 'Topic is too long. Maximum length is 1,000 characters.',
          code: 'TOPIC_TOO_LONG',
          success: false 
        });
      }
      
      if (topic.length < 3) {
        return res.status(400).json({ 
          error: 'Topic is too short. Minimum length is 3 characters.',
          code: 'TOPIC_TOO_SHORT',
          success: false 
        });
      }
      
      if (options && typeof options !== 'object') {
        return res.status(400).json({ 
          error: 'Options must be an object',
          code: 'INVALID_OPTIONS_TYPE',
          success: false 
        });
      }

      const generated = textGenerator.generateText(topic, options || {});
      const duration = Date.now() - startTime;

      console.log(`[API] POST /api/generate - Success (${duration}ms)`, { generatedLength: generated.length });
      res.json({
        text: generated,
        success: true
      });
    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      console.error(`[API] POST /api/generate - Error after ${duration}ms:`, error);
      handleRouteError(error, res, 500);
    }
  });

  /**
   * Extrapolate text - expand on existing content
   * POST /api/extrapolate
   * Body: { text: string, options?: ExtrapolationOptions }
   */
  router.post('/extrapolate', validateExtrapolate, async (req: Request, res: Response) => {
    const startTime = Date.now();
    console.log('[API] POST /api/extrapolate', { textLength: req.body?.text?.length || 0 });
    
    try {
      const { text, options } = req.body;
      
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
      
      if (options && typeof options !== 'object') {
        return res.status(400).json({ 
          error: 'Options must be an object',
          code: 'INVALID_OPTIONS_TYPE',
          success: false 
        });
      }

      const extrapolated = extrapolator.extrapolate(text, options || {});
      const duration = Date.now() - startTime;

      console.log(`[API] POST /api/extrapolate - Success (${duration}ms)`, { extrapolatedLength: extrapolated.length });
      res.json({
        text: extrapolated,
        success: true
      });
    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      console.error(`[API] POST /api/extrapolate - Error after ${duration}ms:`, error);
      handleRouteError(error, res, 500);
    }
  });

  /**
   * Extrapolate entire project directory
   * POST /api/extrapolate-project
   * Body: { projectPath: string, options?: ExtrapolationOptions }
   */
  router.post('/extrapolate-project', validateExtrapolateProject, async (req: Request, res: Response) => {
    const startTime = Date.now();
    console.log('[API] POST /api/extrapolate-project', { projectPath: req.body?.projectPath });
    
    try {
      const { projectPath, options } = req.body;
      const { promises: fs } = await import('fs');
      
      if (!projectPath) {
        return res.status(400).json({ 
          error: 'Project path is required',
          code: 'MISSING_PROJECT_PATH',
          success: false 
        });
      }
      
      if (typeof projectPath !== 'string') {
        return res.status(400).json({ 
          error: 'Project path must be a string',
          code: 'INVALID_PROJECT_PATH_TYPE',
          success: false 
        });
      }

      // Validate project path exists
      try {
        const stats = await fs.stat(projectPath);
        if (!stats.isDirectory()) {
          return res.status(400).json({ 
            error: 'Project path must be a directory',
            code: 'NOT_A_DIRECTORY',
            success: false 
          });
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return res.status(400).json({ 
          error: `Project path does not exist or is not accessible: ${message}`,
          code: 'INVALID_PATH',
          success: false 
        });
      }
      
      if (options && typeof options !== 'object') {
        return res.status(400).json({ 
          error: 'Options must be an object',
          code: 'INVALID_OPTIONS_TYPE',
          success: false 
        });
      }

      const result = await extrapolator.extrapolateProject(projectPath, options || {});
      const duration = Date.now() - startTime;

      console.log(`[API] POST /api/extrapolate-project - Success (${duration}ms)`, { 
        totalFiles: result.totalFiles,
        successfulFiles: result.successfulFiles 
      });
      
      res.json({
        ...result,
        success: true,
        duration
      });
    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      console.error(`[API] POST /api/extrapolate-project - Error after ${duration}ms:`, error);
      handleRouteError(error, res, 500);
    }
  });

  /**
   * Match voice - validate text against voice profile
   * POST /api/match-voice
   * Body: { text: string }
   */
  router.post('/match-voice', validateMatchVoice, async (req: Request, res: Response) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: 'Text is required', success: false });
      }

      const match = voiceMatcher.scoreMatch(text);
      const validation = voiceMatcher.validateVoice(text);

      res.json({
        match,
        validation,
        success: true
      });
    } catch (error: unknown) {
      handleRouteError(error, res, 500);
    }
  });

  return router;
}


