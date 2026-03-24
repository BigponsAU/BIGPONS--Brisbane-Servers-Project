/**
 * Dashboard Server
 * Web server for the voice framework dashboard
 * 
 * This server provides a REST API and serves the dashboard UI for the Voice Framework.
 * The API is organized into modular route handlers for better maintainability.
 */

import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import { ToneAnalyzer } from '../analyzers/tone-analyzer';
import { PatternExtractor } from '../analyzers/pattern-extractor';
import { Shredder } from '../analyzers/shredder';
import { TextGenerator } from '../generators/text-generator';
import { Extrapolator } from '../generators/extrapolator';
import { VoiceMatcher } from '../generators/voice-matcher';
import { TestRunner } from '../testing/test-runner';
import { TextStorage } from '../storage/text-storage';
import { ProfileManager } from '../storage/profile-manager';
import { ProfileBuilder } from '../builders/profile-builder';
import { DocumentProcessor } from '../processors/document-processor';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { promises as fs } from 'fs';
import { Server } from 'http';

// Import security middleware
import { apiLimiter, corsMiddleware, createTimeoutMiddleware } from './middleware/security';
// Import error handler
import { handleRouteError } from './utils/error-handler';
// Import health check
import { performHealthCheck } from './utils/health-check';
// Import validation
import { validateProfileBuilder } from './middleware/validation';

// Import route handlers
import { createAnalysisRoutes } from './routes/analysis-routes';
import { createGenerationRoutes } from './routes/generation-routes';
import { createStorageRoutes } from './routes/storage-routes';
import { createDocumentRoutes } from './routes/document-routes';
import { createTestingRoutes } from './routes/testing-routes';
import { createTopologyRoutes } from './routes/topology-routes';
import { createResourceRoutes } from './routes/resource-routes';
import { createAuthRoutes } from './routes/auth-routes';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
let server: Server | null = null;

// Security middleware (must be before other middleware)
app.use(corsMiddleware);
app.use(createTimeoutMiddleware(30000)); // 30 second timeout

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Initialize framework components
const toneAnalyzer = new ToneAnalyzer();
const patternExtractor = new PatternExtractor();
const shredder = new Shredder();
const textGenerator = new TextGenerator();
const extrapolator = new Extrapolator();
const voiceMatcher = new VoiceMatcher();
const testRunner = new TestRunner('./test-results');

// Initialize enhanced features
const textStorage = new TextStorage('./storage/text-storage.json');
const profileManager = new ProfileManager('./storage/profiles.json');
const profileBuilder = new ProfileBuilder();
const documentProcessor = new DocumentProcessor(textStorage);

/**
 * Check for default credentials and warn if detected in production
 */
function checkDefaultCredentials(): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const adminEmail = process.env.ADMIN_EMAIL || '';
  const adminPassword = process.env.ADMIN_PASSWORD || '';
  const jwtSecret = process.env.JWT_SECRET || '';

  if (!adminEmail || !adminPassword) {
    console.warn(
      '\nℹ️  ADMIN_EMAIL / ADMIN_PASSWORD not set — voice dashboard admin login is disabled until you configure them.\n'
    );
  }

  const isDefaultJwtSecret =
    jwtSecret === 'brisbane-servers-secret-key-change-in-production' || jwtSecret === '';

  if (isProduction && isDefaultJwtSecret) {
    console.warn('\n⚠️  SECURITY: Set JWT_SECRET to a strong random value in production.\n');
  }
}

// Initialize storage systems and create uploads directory
(async () => {
  try {
    // Check for default credentials before initializing
    checkDefaultCredentials();
    
    await textStorage.initialize();
    await profileManager.initialize();
    const uploadsDir = path.join(__dirname, 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });
    
    // Register API routes with rate limiting
    app.use('/api', apiLimiter);
    app.use('/api/auth', createAuthRoutes());
    app.use('/api', createAnalysisRoutes(toneAnalyzer, patternExtractor, shredder));
    app.use('/api', createGenerationRoutes(textGenerator, extrapolator, voiceMatcher));
    app.use('/api', createStorageRoutes(textStorage, profileManager));
    app.use('/api', createDocumentRoutes(documentProcessor, uploadsDir, profileManager));
    app.use('/api', createTestingRoutes(testRunner));
    app.use('/api', createTopologyRoutes(textStorage, profileManager));
    app.use('/api/resources', createResourceRoutes(textGenerator, extrapolator, voiceMatcher));
    
    // Profile Builder route with validation
    app.post('/api/profile-builder/build', validateProfileBuilder, async (req: Request, res: Response) => {
      try {
        const { samples, options } = req.body;
        const profile = await profileBuilder.buildFromSamples(samples, options || {});
        res.json({ profile, success: true });
      } catch (error: unknown) {
        handleRouteError(error, res, 500);
      }
    });
    
    console.log('✅ All routes registered successfully');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.warn('Warning: Could not initialize storage systems:', message);
  }
})();

/**
 * Health check endpoint
 * GET /api/health
 * Returns detailed health status including service health and system metrics
 */
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    const health = await performHealthCheck(textStorage, profileManager);
    const statusCode = health.status === 'ok' ? 200 : health.status === 'degraded' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error: unknown) {
    handleRouteError(error, res, 500);
  }
});

// Static file serving (after API routes)
app.use(express.static(path.join(__dirname, 'public')));

// Serve dashboard (catch-all for SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global error handler (must be last, after all routes)
app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    return next(err);
  }
  
  const statusCode = (err && typeof err === 'object' && 'status' in err && typeof err.status === 'number')
    ? err.status
    : 500;
  
  handleRouteError(err, res, statusCode);
});

// Graceful shutdown handler
function gracefulShutdown(signal: string) {
  console.log(`\n${signal} received, shutting down gracefully...`);
  
  if (server) {
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
    
    // Force close after 10 seconds
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  console.error('Unhandled Rejection at:', promise, 'reason:', message);
  if (reason instanceof Error && reason.stack) {
    console.error('Stack trace:', reason.stack);
  }
});

// Start server
server = app.listen(PORT, () => {
  console.log(`\n🚀 Voice Framework Dashboard`);
  console.log(`   Server running on http://localhost:${PORT}`);
  console.log(`   Open your browser to view the dashboard`);
  console.log(`   Logging enabled - API requests will be logged\n`);
});
