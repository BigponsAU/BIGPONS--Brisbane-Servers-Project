/**
 * Storage Routes
 * Handles text storage, samples, principles, and profile management endpoints
 */

import { Router, Request, Response } from 'express';
import { TextStorage } from '../../storage/text-storage';
import { ProfileManager } from '../../storage/profile-manager';
import { ProfileBuilder } from '../../builders/profile-builder';
import { StorageFilters } from '../types';
import { handleRouteError } from '../utils/error-handler';
import { validateAddSample, validateStorageQuery, validateAddPrinciple, validateCreateProfile, validateStorageCleanup } from '../middleware/validation';
import { buildCorpusSummary, loadDashboardResources, rebuildProfileFromCorpus, syncDefaultBigponsCorpus, attachResourceToProfileCorpus } from '../utils/profile-corpus';
import { cleanupProfileAndResourceStorage } from '../utils/data-hygiene';

export function createStorageRoutes(
  textStorage: TextStorage,
  profileManager: ProfileManager,
  profileBuilder?: ProfileBuilder
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
   * Body: { dryRun?: boolean, deep?: boolean, aggressive?: boolean } (optional)
   */
  router.post('/storage/cleanup', validateStorageCleanup, async (req: Request, res: Response) => {
    const startTime = Date.now();
    console.log('[API] POST /api/storage/cleanup', { dryRun: req.body?.dryRun, deep: req.body?.deep, aggressive: req.body?.aggressive });
    
    try {
      // Validate optional dryRun parameter
      const dryRun = req.body?.dryRun === true;
      const deep = req.body?.deep === true;
      const aggressive = req.body?.aggressive === true;

      const binaryResult = dryRun ? { removedSamples: 0, removedPrinciples: 0 } : await textStorage.cleanupBinaryData();
      const semanticResult = await textStorage.cleanupSemanticNoise(dryRun);
      const aggressiveResult = aggressive
        ? await textStorage.cleanupPrincipleFragmentsAggressive(dryRun)
        : { removedAggressivePrinciples: 0, archivedAggressivePrinciples: 0 };
      const storageResult = await cleanupProfileAndResourceStorage(dryRun, deep);
      const duration = Date.now() - startTime;
      
      const result = {
        ...binaryResult,
        ...semanticResult,
        ...aggressiveResult,
        ...storageResult,
      };
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
   * Get default profile
   * GET /api/profiles/default
   */
  router.get('/profiles/default', async (req: Request, res: Response) => {
    try {
      const profile = profileManager.getDefaultProfile();
      const profiles = profileManager.getAllProfiles();
      const metadata = profiles.find((p) => p.isDefault) || profiles[0] || null;
      if (!profile || !metadata) {
        return res.status(404).json({ error: 'No default profile set', success: false });
      }
      res.json({ profile, metadata, success: true });
    } catch (error: unknown) {
      handleRouteError(error, res, 500);
    }
  });

  /**
   * Set default profile
   * POST /api/profiles/default
   * Body: { id: string }
   */
  router.post('/profiles/default', async (req: Request, res: Response) => {
    try {
      const { id } = req.body || {};
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Profile id is required', success: false });
      }
      const updated = await profileManager.setDefaultProfile(id);
      if (!updated) {
        return res.status(404).json({ error: 'Profile not found', success: false });
      }
      const profile = profileManager.getProfile(id);
      const metadata = profileManager.getAllProfiles().find((p) => p.id === id) || null;
      res.json({ profile, metadata, success: true });
    } catch (error: unknown) {
      handleRouteError(error, res, 500);
    }
  });

  /**
   * Sync BIGPONS default profile from the current public website resource corpus
   * POST /api/profiles/default/sync-corpus
   */
  router.post('/profiles/default/sync-corpus', async (_req: Request, res: Response) => {
    try {
      if (!profileBuilder) {
        return res.status(500).json({ error: 'Profile builder is unavailable', success: false });
      }
      const result = await syncDefaultBigponsCorpus(profileManager, profileBuilder);
      res.json({ metadata: result.metadata, corpus: result.summary, success: true });
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
   * Delete profile
   * DELETE /api/profiles/:id
   */
  router.delete('/profiles/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const profiles = profileManager.getAllProfiles();
      const target = profiles.find((profile) => profile.id === id);
      if (!target) {
        return res.status(404).json({ error: 'Profile not found', success: false });
      }
      if (target.isDefault) {
        return res.status(400).json({ error: 'Set a different default profile before deleting this one', success: false });
      }
      if (profiles.length <= 1) {
        return res.status(400).json({ error: 'Cannot delete the only default profile', success: false });
      }

      const removed = await profileManager.deleteProfile(id);
      if (!removed) {
        return res.status(404).json({ error: 'Profile not found', success: false });
      }

      const nextProfiles = profileManager.getAllProfiles();
      const nextDefault = nextProfiles.find((profile) => profile.isDefault) || nextProfiles[0] || null;
      res.json({ success: true, deletedId: id, profiles: nextProfiles, defaultProfileId: nextDefault?.id || null });
    } catch (error: unknown) {
      handleRouteError(error, res, 500);
    }
  });

  /**
   * Get profile corpus details
   * GET /api/profiles/:id/corpus
   */
  router.get('/profiles/:id/corpus', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const metadata = profileManager.getAllProfiles().find((profile) => profile.id === id);
      if (!metadata) {
        return res.status(404).json({ error: 'Profile not found', success: false });
      }
      const resources = await loadDashboardResources();
      res.json({
        metadata,
        corpus: buildCorpusSummary(metadata, resources),
        success: true,
      });
    } catch (error: unknown) {
      handleRouteError(error, res, 500);
    }
  });

  /**
   * Attach a resource to a profile corpus
   * POST /api/profiles/:id/resources/:resourceId
   */
  router.post('/profiles/:id/resources/:resourceId', async (req: Request, res: Response) => {
    try {
      const { id, resourceId } = req.params;
      if (!resourceId) {
        return res.status(400).json({ error: 'resourceId is required', success: false });
      }
      const resources = await loadDashboardResources();
      const exists = resources.some((resource) => resource.id === resourceId);
      if (!exists) {
        return res.status(404).json({ error: 'Resource not found', success: false });
      }
      const summary = await attachResourceToProfileCorpus(profileManager, id, resourceId, resources);
      const metadata = profileManager.getAllProfiles().find((profile) => profile.id === id) || null;
      res.json({ metadata, corpus: summary, success: true });
    } catch (error: unknown) {
      handleRouteError(error, res, 500);
    }
  });

  /**
   * Rebuild an existing profile from its corpus
   * POST /api/profiles/:id/rebuild-from-corpus
   */
  router.post('/profiles/:id/rebuild-from-corpus', async (req: Request, res: Response) => {
    try {
      if (!profileBuilder) {
        return res.status(500).json({ error: 'Profile builder is unavailable', success: false });
      }
      const { id } = req.params;
      const result = await rebuildProfileFromCorpus(profileManager, profileBuilder, id);
      res.json({ metadata: result.metadata, corpus: result.summary, success: true });
    } catch (error: unknown) {
      handleRouteError(error, res, 500);
    }
  });

  /**
   * Prune legacy/duplicate profiles while keeping default
   * POST /api/profiles/prune
   */
  router.post('/profiles/prune', async (_req: Request, res: Response) => {
    try {
      const profiles = profileManager.getAllProfiles();
      if (profiles.length <= 1) {
        return res.json({ success: true, removedIds: [], remaining: profiles.length, message: 'Nothing to prune' });
      }

      const defaultProfile = profiles.find((profile) => profile.isDefault) || profiles[0];
      const keepByName = new Map<string, string>();
      const sorted = [...profiles].sort((a, b) => {
        const ta = new Date(a.updatedAt as unknown as string).getTime() || 0;
        const tb = new Date(b.updatedAt as unknown as string).getTime() || 0;
        return tb - ta;
      });

      sorted.forEach((profile) => {
        const key = (profile.name || '').trim().toLowerCase() || profile.id;
        if (!keepByName.has(key)) keepByName.set(key, profile.id);
      });
      keepByName.set((defaultProfile.name || '').trim().toLowerCase() || defaultProfile.id, defaultProfile.id);

      const keepIds = new Set<string>([defaultProfile.id, ...keepByName.values()]);
      const removedIds: string[] = [];
      for (const profile of profiles) {
        if (!keepIds.has(profile.id)) {
          const removed = await profileManager.deleteProfile(profile.id);
          if (removed) removedIds.push(profile.id);
        }
      }

      const remainingProfiles = profileManager.getAllProfiles();
      res.json({
        success: true,
        removedIds,
        remaining: remainingProfiles.length,
        profiles: remainingProfiles,
      });
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

  return router;
}


