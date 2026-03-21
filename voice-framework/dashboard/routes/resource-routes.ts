/**
 * Resource Routes
 * Handles resource generation and management using voice framework
 */

import { Router, Request, Response } from 'express';
import { TextGenerator } from '../../generators/text-generator';
import { Extrapolator } from '../../generators/extrapolator';
import { VoiceMatcher } from '../../generators/voice-matcher';
import { handleRouteError } from '../utils/error-handler';
import { requireAuth, requireEditor } from '../middleware/auth';
import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface Resource {
  id: string;
  industry: string;
  topic: string;
  title: string;
  description: string;
  content: string;
  generatedAt: string;
  generatedBy?: string;
  ownerId?: string; // User ID who owns this resource
  version: number;
  status: 'draft' | 'published' | 'archived';
  isStarterBlock?: boolean; // True if this is a starter/template block
  visibility?: 'public' | 'private' | 'starter'; // Visibility level
  metadata?: {
    wordCount?: number;
    semanticLevel?: 'high' | 'medium' | 'normal';
    voiceScore?: number;
  };
}

const RESOURCES_FILE = path.join(__dirname, '../../storage/resources.json');
const UPLOADS_DIR = path.join(__dirname, '../uploads');

// Configure multer for file uploads
const upload = multer({
  dest: UPLOADS_DIR,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.txt', '.md', '.html', '.htm', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} not allowed. Allowed: ${allowedTypes.join(', ')}`));
    }
  }
});

// Ensure resources file exists
async function ensureResourcesFile(): Promise<void> {
  try {
    await fs.access(RESOURCES_FILE);
  } catch {
    await fs.writeFile(RESOURCES_FILE, JSON.stringify([], null, 2));
  }
}

// Read file content
async function readFileContent(filePath: string): Promise<string> {
  return await fs.readFile(filePath, 'utf-8');
}

// Load resources
async function loadResources(): Promise<Resource[]> {
  await ensureResourcesFile();
  const data = await fs.readFile(RESOURCES_FILE, 'utf-8');
  return JSON.parse(data);
}

// Save resources
async function saveResources(resources: Resource[]): Promise<void> {
  await fs.writeFile(RESOURCES_FILE, JSON.stringify(resources, null, 2));
}

export function createResourceRoutes(
  textGenerator: TextGenerator,
  extrapolator: Extrapolator,
  voiceMatcher: VoiceMatcher
): Router {
  const router = Router();

  /**
   * Generate a new resource
   * POST /api/resources/generate
   * Body: { industry: string, topic: string, title?: string, options?: GenerationOptions }
   * Requires: Authentication
   */
  router.post('/generate', requireEditor, async (req: Request, res: Response) => {
    const startTime = Date.now();
    console.log('[API] POST /api/resources/generate', { 
      industry: req.body?.industry, 
      topic: req.body?.topic 
    });
    
    try {
      const { industry, topic, title, options } = req.body;
      
      if (!industry || !topic) {
        return res.status(400).json({ 
          error: 'Industry and topic are required',
          code: 'MISSING_FIELDS',
          success: false 
        });
      }

      // Generate resource content using voice framework
      const resourceTitle = title || `${topic} for ${industry}`;
      const seedText = `${resourceTitle}. ${topic} solutions for ${industry} businesses.`;
      
      // Process synchronously - wait for all steps to complete
      // Generate main content
      const generatedContent = textGenerator.generateText(seedText, {
        length: options?.length || 'long',
        includeExamples: options?.includeExamples !== false,
        includeStructure: true,
        style: 'descriptive'
      });

      // Extrapolate for richer content
      const extrapolatedContent = extrapolator.extrapolate(generatedContent, {
        expansionLevel: 'moderate',
        addExamples: true,
        addDetails: true
      });

      // Validate voice match
      const voiceValidation = voiceMatcher.validateVoice(extrapolatedContent);
      
      // Get user from request (set by auth middleware)
      const user = (req as any).user;
      
      // Create resource object
      const resource: Resource = {
        id: `${industry}-${topic}-${Date.now()}`,
        industry,
        topic,
        title: resourceTitle,
        description: extrapolatedContent.substring(0, 200) + '...',
        content: extrapolatedContent,
        generatedAt: new Date().toISOString(),
        generatedBy: user?.email || 'system',
        ownerId: user?.id, // Set owner
        version: 1,
        status: 'draft',
        isStarterBlock: false,
        visibility: 'private',
        metadata: {
          wordCount: extrapolatedContent.split(/\s+/).length,
          semanticLevel: 'high',
          voiceScore: voiceValidation.score || 0
        }
      };

      // Save resource
      const resources = await loadResources();
      resources.push(resource);
      await saveResources(resources);

      const duration = Date.now() - startTime;
      console.log(`[API] POST /api/resources/generate - Success (${duration}ms)`);
      
      // Return complete resource with all voice validation data
      res.json({
        resource,
        voiceValidation: {
          score: voiceValidation.score || 0,
          isValid: voiceValidation.isValid || false,
          issues: voiceValidation.issues || [],
          strengths: voiceValidation.strengths || []
        },
        success: true
      });
    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      console.error(`[API] POST /api/resources/generate - Error after ${duration}ms:`, error);
      handleRouteError(error, res, 500);
    }
  });

  /**
   * Get public resources (published only, no auth required)
   * GET /api/resources/public
   * Query: ?industry=xxx&topic=xxx&id=xxx
   */
  router.get('/public', async (req: Request, res: Response) => {
    try {
      const { industry, topic, id } = req.query;
      let resources = await loadResources();

      // Filter only published resources
      resources = resources.filter(r => r.status === 'published');

      // Filter by ID if provided (returns single resource)
      if (id) {
        const resource = resources.find(r => r.id === id);
        if (!resource) {
          return res.status(404).json({
            error: 'Resource not found',
            code: 'NOT_FOUND',
            success: false
          });
        }
        return res.json({
          resource,
          success: true
        });
      }

      // Filter by industry and topic if provided
      if (industry) {
        resources = resources.filter(r => r.industry === industry);
      }
      if (topic) {
        resources = resources.filter(r => r.topic === topic);
      }

      res.json({
        resources,
        count: resources.length,
        success: true
      });
    } catch (error: unknown) {
      handleRouteError(error, res, 500);
    }
  });

  /**
   * Get all resources
   * GET /api/resources
   * Query: ?industry=xxx&topic=xxx&status=xxx&includeStarterBlocks=true
   * Requires: Authentication
   */
  router.get('/', requireAuth, async (req: Request, res: Response) => {
    try {
      const { industry, topic, status, includeStarterBlocks } = req.query;
      const user = (req as any).user;
      let resources = await loadResources();

      // Filter by user access level
      // Super-admin: sees everything
      // Admin: sees starter blocks + their own resources
      // User: sees starter blocks + only their own resources
      if (user.role === 'super-admin') {
        // Super-admin sees everything
      } else if (user.role === 'admin') {
        // Admin sees starter blocks + their own resources
        resources = resources.filter(r => 
          r.isStarterBlock === true || 
          r.ownerId === user.id || 
          !r.ownerId // Legacy resources without ownerId
        );
      } else {
        // Regular users see starter blocks + only their own resources
        resources = resources.filter(r => 
          r.isStarterBlock === true || 
          r.ownerId === user.id
        );
      }

      // Filter by query parameters
      if (industry) {
        resources = resources.filter(r => r.industry === industry);
      }
      if (topic) {
        resources = resources.filter(r => r.topic === topic);
      }
      if (status) {
        resources = resources.filter(r => r.status === status);
      }
      
      // Optionally filter out starter blocks
      if (includeStarterBlocks !== 'true') {
        // Keep starter blocks separate - they're always included
      }

      res.json({
        resources,
        count: resources.length,
        success: true
      });
    } catch (error: unknown) {
      handleRouteError(error, res, 500);
    }
  });

  /**
   * Get starter blocks only
   * GET /api/resources/starter-blocks
   * Query: ?industry=xxx&topic=xxx
   * Requires: Authentication
   */
  router.get('/starter-blocks', requireAuth, async (req: Request, res: Response) => {
    try {
      const { industry, topic } = req.query;
      let resources = await loadResources();

      // Filter only starter blocks
      resources = resources.filter(r => r.isStarterBlock === true);

      // Filter by query parameters
      if (industry) {
        resources = resources.filter(r => r.industry === industry);
      }
      if (topic) {
        resources = resources.filter(r => r.topic === topic);
      }

      res.json({
        resources,
        count: resources.length,
        success: true
      });
    } catch (error: unknown) {
      handleRouteError(error, res, 500);
    }
  });

  /**
   * Create resource from starter block
   * POST /api/resources/from-starter-block
   * Body: { starterBlockId: string, industry?: string, topic?: string, customizations?: object }
   * Requires: Authentication
   */
  router.post('/from-starter-block', requireEditor, async (req: Request, res: Response) => {
    try {
      const { starterBlockId, industry, topic, customizations } = req.body;
      const user = (req as any).user;
      
      if (!starterBlockId) {
        return res.status(400).json({
          error: 'Starter block ID is required',
          code: 'MISSING_STARTER_BLOCK_ID',
          success: false
        });
      }

      const resources = await loadResources();
      const starterBlock = resources.find(r => r.id === starterBlockId && r.isStarterBlock === true);

      if (!starterBlock) {
        return res.status(404).json({
          error: 'Starter block not found',
          code: 'STARTER_BLOCK_NOT_FOUND',
          success: false
        });
      }

      // Create new resource based on starter block
      const newResource: Resource = {
        ...starterBlock,
        id: `${industry || starterBlock.industry}-${topic || starterBlock.topic}-${Date.now()}`,
        industry: industry || starterBlock.industry,
        topic: topic || starterBlock.topic,
        title: customizations?.title || starterBlock.title,
        description: customizations?.description || starterBlock.description,
        content: customizations?.content || starterBlock.content,
        generatedAt: new Date().toISOString(),
        generatedBy: user.email,
        ownerId: user.id,
        isStarterBlock: false, // This is now a user's resource
        visibility: 'private',
        version: 1,
        status: 'draft',
        metadata: {
          ...starterBlock.metadata,
          wordCount: (customizations?.content || starterBlock.content).split(/\s+/).length
        }
      };

      // If customizations include content, process through voice framework
      if (customizations?.content) {
        const voiceValidation = voiceMatcher.validateVoice(customizations.content);
        newResource.metadata = {
          ...newResource.metadata,
          voiceScore: voiceValidation.score || 0
        };
      }

      resources.push(newResource);
      await saveResources(resources);

      res.json({
        resource: newResource,
        success: true
      });
    } catch (error: unknown) {
      handleRouteError(error, res, 500);
    }
  });

  /**
   * Get a specific resource
   * GET /api/resources/:id
   * Requires: Authentication
   */
  router.get('/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const resources = await loadResources();
      const resource = resources.find(r => r.id === id);

      if (!resource) {
        return res.status(404).json({
          error: 'Resource not found',
          code: 'NOT_FOUND',
          success: false
        });
      }

      res.json({
        resource,
        success: true
      });
    } catch (error: unknown) {
      handleRouteError(error, res, 500);
    }
  });

  /**
   * Update a resource
   * PUT /api/resources/:id
   * Requires: Editor or Admin
   */
  router.put('/:id', requireEditor, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const resources = await loadResources();
      const index = resources.findIndex(r => r.id === id);

      if (index === -1) {
        return res.status(404).json({
          error: 'Resource not found',
          code: 'NOT_FOUND',
          success: false
        });
      }

      // Prevent editing starter blocks directly - users must create their own copy
      if (resources[index].isStarterBlock === true) {
        const user = (req as any).user;
        if (user.role !== 'super-admin') {
          return res.status(403).json({
            error: 'Starter blocks cannot be edited. Use "Create from Starter Block" to make your own copy.',
            code: 'STARTER_BLOCK_READ_ONLY',
            success: false
          });
        }
      }

      // Update resource with versioning and preserve ID consistency
      resources[index] = {
        ...resources[index],
        ...updates,
        id: resources[index].id, // Preserve original ID
        version: resources[index].version + 1,
        // Ensure industry/topic consistency
        industry: updates.industry || resources[index].industry,
        topic: updates.topic || resources[index].topic,
        // Preserve starter block status
        isStarterBlock: resources[index].isStarterBlock,
        // Preserve owner unless super-admin is transferring
        ownerId: (req as any).user.role === 'super-admin' && updates.ownerId !== undefined 
          ? updates.ownerId 
          : resources[index].ownerId
      };

      // Re-validate voice if content changed
      if (updates.content) {
        const voiceValidation = voiceMatcher.validateVoice(updates.content);
        resources[index].metadata = {
          ...resources[index].metadata,
          voiceScore: voiceValidation.score || 0,
          wordCount: updates.content.split(/\s+/).length
        };
      }

      await saveResources(resources);

      res.json({
        resource: resources[index],
        success: true
      });
    } catch (error: unknown) {
      handleRouteError(error, res, 500);
    }
  });

  /**
   * Delete a resource
   * DELETE /api/resources/:id
   * Requires: Editor or Admin
   */
  router.delete('/:id', requireEditor, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      const resources = await loadResources();
      const resource = resources.find(r => r.id === id);

      if (!resource) {
        return res.status(404).json({
          error: 'Resource not found',
          code: 'NOT_FOUND',
          success: false
        });
      }

      // Prevent deleting starter blocks unless super-admin
      if (resource.isStarterBlock === true && user.role !== 'super-admin') {
        return res.status(403).json({
          error: 'Starter blocks cannot be deleted',
          code: 'STARTER_BLOCK_PROTECTED',
          success: false
        });
      }

      // Regular users can only delete their own resources
      if (user.role !== 'super-admin' && user.role !== 'admin' && resource.ownerId !== user.id) {
        return res.status(403).json({
          error: 'You can only delete your own resources',
          code: 'FORBIDDEN',
          success: false
        });
      }

      const filtered = resources.filter(r => r.id !== id);
      await saveResources(filtered);

      res.json({
        success: true,
        message: 'Resource deleted'
      });
    } catch (error: unknown) {
      handleRouteError(error, res, 500);
    }
  });

  /**
   * Upload a resource file
   * POST /api/resources/upload
   * Body: FormData with file, industry, topic, title (optional), autoProcess (optional), autoPublish (optional)
   * Requires: Editor or Admin
   */
  router.post('/upload', requireEditor, upload.single('file'), async (req: Request, res: Response) => {
    const startTime = Date.now();
    console.log('[API] POST /api/resources/upload');
    
    try {
      const file = (req as any).file;
      if (!file) {
        return res.status(400).json({
          error: 'No file uploaded',
          code: 'NO_FILE',
          success: false
        });
      }

      const { industry, topic, title, autoProcess, autoPublish } = req.body;
      
      if (!industry || !topic) {
        // Clean up uploaded file
        await fs.unlink(file.path).catch(() => {});
        return res.status(400).json({
          error: 'Industry and topic are required',
          code: 'MISSING_FIELDS',
          success: false
        });
      }

      // Read file content
      let content = await readFileContent(file.path);
      
      // Clean up uploaded file
      await fs.unlink(file.path).catch(() => {});

      const resourceTitle = title || path.basename(file.originalname, path.extname(file.originalname));
      const shouldProcess = autoProcess !== 'false';
      const shouldPublish = autoPublish === 'true';

      let processedContent = content;
      let voiceValidation = {
        isValid: false,
        score: 0,
        issues: [] as string[],
        strengths: [] as string[],
      };

      // Process through voice framework synchronously if requested
      if (shouldProcess) {
        // Generate enhanced content
        const seedText = `${resourceTitle}. ${topic} solutions for ${industry} businesses.`;
        const generatedContent = textGenerator.generateText(seedText, {
          length: 'long',
          includeExamples: true,
          includeStructure: true,
          style: 'descriptive'
        });

        // Extrapolate for richer content
        processedContent = extrapolator.extrapolate(content + '\n\n' + generatedContent, {
          expansionLevel: 'moderate',
          addExamples: true,
          addDetails: true
        });

        // Validate voice match
        voiceValidation = voiceMatcher.validateVoice(processedContent);
      }

      // Get user from request
      const user = (req as any).user;

      // Create resource object
      const resource: Resource = {
        id: `${industry}-${topic}-${Date.now()}`,
        industry,
        topic,
        title: resourceTitle,
        description: processedContent.substring(0, 200) + '...',
        content: processedContent,
        generatedAt: new Date().toISOString(),
        generatedBy: user?.email || 'system',
        ownerId: user?.id, // Set owner
        version: 1,
        status: shouldPublish ? 'published' : 'draft',
        isStarterBlock: false,
        visibility: 'private',
        metadata: {
          wordCount: processedContent.split(/\s+/).length,
          semanticLevel: 'high',
          voiceScore: voiceValidation.score || 0
        }
      };

      // Save resource
      const resources = await loadResources();
      resources.push(resource);
      await saveResources(resources);

      const duration = Date.now() - startTime;
      console.log(`[API] POST /api/resources/upload - Success (${duration}ms)`);

      res.json({
        resource,
        voiceValidation,
        success: true,
        processed: shouldProcess
      });
    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      console.error(`[API] POST /api/resources/upload - Error after ${duration}ms:`, error);
      handleRouteError(error, res, 500);
    }
  });

  /**
   * Process content directly (without file upload)
   * POST /api/resources/process
   * Body: { content: string, industry: string, topic: string, title?: string, autoPublish?: boolean }
   * Requires: Editor or Admin
   */
  router.post('/process', requireEditor, async (req: Request, res: Response) => {
    const startTime = Date.now();
    console.log('[API] POST /api/resources/process');
    
    try {
      const { content, industry, topic, title, autoPublish } = req.body;
      
      if (!content || !industry || !topic) {
        return res.status(400).json({
          error: 'Content, industry, and topic are required',
          code: 'MISSING_FIELDS',
          success: false
        });
      }

      const resourceTitle = title || `${topic} for ${industry}`;
      const shouldPublish = autoPublish === true;

      // Process through voice framework synchronously
      const seedText = `${resourceTitle}. ${topic} solutions for ${industry} businesses.`;
      const generatedContent = textGenerator.generateText(seedText, {
        length: 'long',
        includeExamples: true,
        includeStructure: true,
        style: 'descriptive'
      });

      // Extrapolate for richer content
      let processedContent = extrapolator.extrapolate(content + '\n\n' + generatedContent, {
        expansionLevel: 'moderate',
        addExamples: true,
        addDetails: true
      });

      // Validate voice match
      let voiceValidation = voiceMatcher.validateVoice(processedContent);
      
      // Ensure voice consistency - if score is low, regenerate
      if ((voiceValidation.score || 0) < 0.6) {
        const regeneratedContent = textGenerator.generateText(seedText, {
          length: 'long',
          includeExamples: true,
          style: 'descriptive'
        });
        const revalidated = voiceMatcher.validateVoice(regeneratedContent);
        if ((revalidated.score || 0) > (voiceValidation.score || 0)) {
          processedContent = regeneratedContent;
          voiceValidation = revalidated;
        }
      }

      // Get user from request
      const user = (req as any).user;

      // Create resource object with consistent ID format
      const resourceId = `${industry}-${topic}-${Date.now()}`;
      const resource: Resource = {
        id: resourceId,
        industry,
        topic,
        title: resourceTitle,
        description: processedContent.substring(0, 200) + '...',
        content: processedContent,
        generatedAt: new Date().toISOString(),
        generatedBy: user?.email || 'system',
        ownerId: user?.id, // Set owner
        version: 1,
        status: shouldPublish ? 'published' : 'draft',
        isStarterBlock: false,
        visibility: 'private',
        metadata: {
          wordCount: processedContent.split(/\s+/).length,
          semanticLevel: 'high',
          voiceScore: voiceValidation.score || 0
        }
      };

      // Save resource
      const resources = await loadResources();
      resources.push(resource);
      await saveResources(resources);

      const duration = Date.now() - startTime;
      console.log(`[API] POST /api/resources/process - Success (${duration}ms)`);

      res.json({
        resource,
        voiceValidation,
        success: true
      });
    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      console.error(`[API] POST /api/resources/process - Error after ${duration}ms:`, error);
      handleRouteError(error, res, 500);
    }
  });

  /**
   * Improve/regenerate resource content
   * POST /api/resources/:id/improve
   * Requires: Editor or Admin
   */
  router.post('/:id/improve', requireEditor, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { options } = req.body;
      const user = (req as any).user;
      const resources = await loadResources();
      const resource = resources.find(r => r.id === id);

      if (!resource) {
        return res.status(404).json({
          error: 'Resource not found',
          code: 'NOT_FOUND',
          success: false
        });
      }

      // Prevent improving starter blocks directly - users should create their own copy
      if (resource.isStarterBlock === true && user.role !== 'super-admin') {
        return res.status(403).json({
          error: 'Starter blocks cannot be improved. Create your own copy first.',
          code: 'STARTER_BLOCK_READ_ONLY',
          success: false
        });
      }

      // Extrapolate existing content synchronously
      const improvedContent = extrapolator.extrapolate(resource.content, {
        expansionLevel: options?.expansionLevel || 'moderate',
        addExamples: options?.addExamples !== false,
        addDetails: true
      });

      // Validate voice
      const voiceValidation = voiceMatcher.validateVoice(improvedContent);

      // Ensure voice consistency - if score is low, regenerate
      let finalContent = improvedContent;
      let finalVoiceScore = voiceValidation.score || 0;
      
      if (finalVoiceScore < 0.6) {
        const seedText = `${resource.title}. ${resource.topic} solutions for ${resource.industry} businesses.`;
        const regeneratedContent = textGenerator.generateText(seedText, {
          length: 'long',
          includeExamples: true,
          style: 'descriptive'
        });
        const revalidated = voiceMatcher.validateVoice(regeneratedContent);
        if ((revalidated.score || 0) > finalVoiceScore) {
          finalContent = regeneratedContent;
          finalVoiceScore = revalidated.score || 0;
        }
      }

      // Update resource with versioning and preserve ID consistency
      const index = resources.findIndex(r => r.id === id);
      resources[index] = {
        ...resource,
        id: resource.id, // Preserve original ID
        content: finalContent,
        description: finalContent.substring(0, 200) + '...',
        version: resource.version + 1,
        metadata: {
          ...resource.metadata,
          wordCount: finalContent.split(/\s+/).length,
          voiceScore: finalVoiceScore
        }
      };

      await saveResources(resources);

      res.json({
        resource: resources[index],
        success: true
      });
    } catch (error: unknown) {
      handleRouteError(error, res, 500);
    }
  });

  return router;
}

