/**
 * Storage Routes
 * Handles text storage, samples, principles, and profile management endpoints
 */

import { Router, Request, Response } from 'express';
import { TextStorage } from '../../storage/text-storage';
import { ProfileManager } from '../../storage/profile-manager';
import { StorageFilters } from '../types';
import { handleRouteError } from '../utils/error-handler';
import { validateAddSample, validateStorageQuery, validateAddPrinciple, validateCreateProfile, validateStorageCleanup } from '../middleware/validation';

export function createStorageRoutes(
  textStorage: TextStorage,
  profileManager: ProfileManager
): Router {
  const router = Router();

  /**
   * Get all text samples
   * GET /api/storage/samples?category=&tags=
   */
  router.get('/storage/samples', validateStorageQuery, async (req: Request, res: Response) => {
    const startTime = Date.now();
    console.log('[API] GET /api/storage/samples', { query: req.query });
    
    try {
      const { category, tags } = req.query;
      const filters: StorageFilters = {};
      if (category) filters.category = category as string;
      if (tags) filters.tags = (tags as string).split(',');
      
      const samples = textStorage.getSamples(filters);
      const duration = Date.now() - startTime;
      
      console.log(`[API] GET /api/storage/samples - Success (${duration}ms)`, { count: samples.length });
      res.json({ samples, success: true });
    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      console.error(`[API] GET /api/storage/samples - Error after ${duration}ms:`, error);
      handleRouteError(error, res, 500);
    }
  });

  /**
   * Add a text sample
   * POST /api/storage/samples
   * Body: { text: string, category?: string, tags?: string[] }
   */
  router.post('/storage/samples', validateAddSample, async (req: Request, res: Response) => {
    const startTime = Date.now();
    console.log('[API] POST /api/storage/samples', { textLength: req.body?.text?.length || 0, category: req.body?.category });
    
    try {
      const sample = await textStorage.addSample(req.body);
      const duration = Date.now() - startTime;
      
      console.log(`[API] POST /api/storage/samples - Success (${duration}ms)`, { sampleId: sample.id });
      res.json({ sample, success: true });
    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      console.error(`[API] POST /api/storage/samples - Error after ${duration}ms:`, error);
      handleRouteError(error, res, 500);
    }
  });

  /**
   * Cleanup binary data from storage
   * POST /api/storage/cleanup
   * Body: { dryRun?: boolean } (optional)
   */
  router.post('/storage/cleanup', validateStorageCleanup, async (req: Request, res: Response) => {
    const startTime = Date.now();
    console.log('[API] POST /api/storage/cleanup', { dryRun: req.body?.dryRun });
    
    try {
      // Validate optional dryRun parameter
      const dryRun = req.body?.dryRun === true;
      
      const result = await textStorage.cleanupBinaryData();
      const duration = Date.now() - startTime;
      
      console.log(`[API] POST /api/storage/cleanup - Success (${duration}ms)`, result);
      res.json({ ...result, success: true });
    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      console.error(`[API] POST /api/storage/cleanup - Error after ${duration}ms:`, error);
      handleRouteError(error, res, 500);
    }
  });

  /**
   * Get all principles
   * GET /api/storage/principles?category=
   */
  router.get('/storage/principles', validateStorageQuery, async (req: Request, res: Response) => {
    try {
      const { category } = req.query;
      const filters: StorageFilters = {};
      if (category) filters.category = category as string;
      
      const principles = textStorage.getPrinciples(filters);
      res.json({ principles, success: true });
    } catch (error: unknown) {
      handleRouteError(error, res, 500);
    }
  });

  /**
   * Add a principle
   * POST /api/storage/principles
   * Body: { principle: string, description?: string, category?: string }
   */
  router.post('/storage/principles', validateAddPrinciple, async (req: Request, res: Response) => {
    try {
      const principle = await textStorage.addPrinciple(req.body);
      res.json({ principle, success: true });
    } catch (error: unknown) {
      handleRouteError(error, res, 500);
    }
  });

  /**
   * Get all profiles
   * GET /api/profiles
   */
  router.get('/profiles', async (req: Request, res: Response) => {
    try {
      const profiles = profileManager.getAllProfiles();
      res.json({ profiles, success: true });
    } catch (error: unknown) {
      handleRouteError(error, res, 500);
    }
  });

  /**
   * Get profile by ID
   * GET /api/profiles/:id
   */
  router.get('/profiles/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const profile = profileManager.getProfile(id);
      if (!profile) {
        return res.status(404).json({ error: 'Profile not found', success: false });
      }
      res.json({ profile, success: true });
    } catch (error: unknown) {
      handleRouteError(error, res, 500);
    }
  });

  /**
   * Create a new profile
   * POST /api/profiles
   * Body: { profile: VoiceProfile, metadata: ProfileMetadata }
   */
  router.post('/profiles', validateCreateProfile, async (req: Request, res: Response) => {
    try {
      const { profile, metadata } = req.body;
      if (!profile || !metadata) {
        return res.status(400).json({ error: 'Profile and metadata are required', success: false });
      }
      const created = await profileManager.createProfile(profile, metadata);
      res.json({ metadata: created, success: true });
    } catch (error: unknown) {
      handleRouteError(error, res, 500);
    }
  });

  /**
   * Get default profile
   * GET /api/profiles/default
   */
  router.get('/profiles/default', async (req: Request, res: Response) => {
    try {
      const profile = profileManager.getDefaultProfile();
      if (!profile) {
        return res.status(404).json({ error: 'No default profile set', success: false });
      }
      res.json({ profile, success: true });
    } catch (error: unknown) {
      handleRouteError(error, res, 500);
    }
  });

  return router;
}


