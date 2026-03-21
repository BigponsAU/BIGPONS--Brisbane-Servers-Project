/**
 * Document Routes
 * Handles document upload, processing, and folder upload endpoints
 */

import { Router, Request, Response, NextFunction } from 'express';
import { DocumentProcessor } from '../../processors/document-processor';
import { ProfileManager } from '../../storage/profile-manager';
import { promises as fs } from 'fs';
import * as path from 'path';
import multer from 'multer';
import { ProcessingOptions } from '../types';
import { handleRouteError } from '../utils/error-handler';
import { buildProcessingOptions, buildProcessingOptionsForContent } from '../utils/document-utils';
import { validateProcessDocument } from '../middleware/validation';
// Import mime-types for file type detection
import { lookup as mimeLookup } from 'mime-types';

// Binary file extensions to exclude
const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg', '.ico', // Images
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', // Documents
  '.zip', '.rar', '.7z', '.tar', '.gz', // Archives
  '.mp3', '.mp4', '.avi', '.mov', '.wmv', '.flv', // Media
  '.exe', '.dll', '.so', '.dylib', '.bin', // Executables
  '.woff', '.woff2', '.ttf', '.eot', // Fonts
  '.db', '.sqlite', '.sqlite3', // Databases
]);

function isBinaryFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

/**
 * Detect file type using MIME type lookup
 * Falls back to extension-based detection if mime-types lookup fails
 * 
 * @param filename - File name to detect type for
 * @returns MIME type string or 'unknown'
 */
function detectFileType(filename: string): string {
  const mimeType = mimeLookup(filename);
  if (mimeType) {
    return mimeType;
  }
  // Fallback: use file extension
  const ext = path.extname(filename).toLowerCase();
  const extensionMap: Record<string, string> = {
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.js': 'text/javascript',
    '.ts': 'text/typescript',
    '.json': 'application/json',
    '.html': 'text/html',
    '.css': 'text/css',
    '.xml': 'application/xml',
    '.csv': 'text/csv'
  };
  return extensionMap[ext] || 'unknown';
}

export function createDocumentRoutes(
  documentProcessor: DocumentProcessor,
  uploadsDir: string,
  profileManager?: ProfileManager
): Router {
  const router = Router();

  // Configure multer for single file uploads
  const upload = multer({
    dest: uploadsDir,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit per file
    fileFilter: (req, file, cb) => {
      if (isBinaryFile(file.originalname)) {
        return cb(new Error(`Binary files (${path.extname(file.originalname)}) are not supported. Please upload text-based files only.`));
      }
      cb(null, true);
    }
  });

  // Configure multer for multiple files (folder uploads)
  const uploadMultiple = multer({
    dest: uploadsDir,
    limits: { 
      fileSize: 10 * 1024 * 1024, // 10MB per file
      files: 10000, // max 10000 files
      fieldSize: 10 * 1024 * 1024 // 10MB field size
    },
    fileFilter: (req, file, cb) => {
      if (isBinaryFile(file.originalname)) {
        console.log(`Skipping binary file: ${file.originalname}`);
        return cb(null, false); // Skip this file
      }
      cb(null, true);
    }
  });

  /**
   * Upload and process a single document
   * POST /api/documents/upload
   * Form data: document (file), category, tags, autoStore
   */
  router.post('/documents/upload', upload.single('document'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded', success: false });
      }

      const options: ProcessingOptions = buildProcessingOptions(req, profileManager);
      const processed = await documentProcessor.processDocument(req.file.path, options);

      // Clean up uploaded file
      try {
        await fs.unlink(req.file.path);
      } catch (error) {
        // Ignore cleanup errors
      }

      res.json({
        processed,
        success: true
      });
    } catch (error: unknown) {
      handleRouteError(error, res, 500);
    }
  });

  /**
   * Upload and process a folder (multiple files)
   * POST /api/documents/upload-folder
   * Form data: documents (files[]), category, tags, autoStore
   */
  router.post('/documents/upload-folder', (req: Request, res: Response, next: NextFunction) => {
    console.log('✅ Folder upload route hit at:', new Date().toISOString());
    console.log('   Method:', req.method);
    console.log('   Path:', req.path);
    console.log('   Content-Type:', req.headers['content-type']);
    console.log('   Content-Length:', req.headers['content-length']);
    
    uploadMultiple.array('documents', 10000)(req, res, (err: unknown) => {
      if (err) {
        console.error('Multer error:', err);
        if (err instanceof multer.MulterError) {
          return res.status(400).json({ 
            error: err.message || 'File upload error', 
            success: false,
            code: err.code
          });
        }
        const message = err instanceof Error ? err.message : 'Upload error';
        return res.status(400).json({ 
          error: message, 
          success: false
        });
      }
      next();
    });
  }, async (req: Request, res: Response) => {
    try {
      console.log('Processing folder upload, req.files:', req.files ? (Array.isArray(req.files) ? req.files.length : 1) : 'none');
      
      if (!req.files) {
        console.error('No files in request');
        return res.status(400).json({ error: 'No files uploaded', success: false });
      }

      // Handle multer files - can be array or object with field names
      let files: Express.Multer.File[] = [];
      if (Array.isArray(req.files)) {
        files = req.files;
      } else if (req.files && typeof req.files === 'object') {
        // If it's an object with field names, extract all files
        files = Object.values(req.files).flat();
      }
      
      if (files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded', success: false });
      }

      // Filter out binary files and validate file size
      const textFiles = files.filter((file: Express.Multer.File) => {
        const filename = file.originalname || file.filename || '';
        // Check if file is binary
        if (isBinaryFile(filename)) {
          return false;
        }
        // Validate file size (10MB limit per file)
        if (file.size && file.size > 10 * 1024 * 1024) {
          console.warn(`File ${filename} exceeds size limit: ${file.size} bytes`);
          return false;
        }
        return true;
      });

      if (textFiles.length === 0) {
        return res.status(400).json({ 
          error: 'No text-based files found. Binary files (images, PDFs, etc.) are not supported.', 
          success: false 
        });
      }

      const options: ProcessingOptions = buildProcessingOptions(req, profileManager);
      const filePaths = textFiles.map((f) => f.path).filter((path): path is string => Boolean(path));
      
      if (filePaths.length === 0) {
        return res.status(400).json({ error: 'No valid file paths found', success: false });
      }

      const processed = await documentProcessor.processDocuments(filePaths, options);

      // Clean up uploaded files
      for (const file of files) {
        try {
          if (file.path) {
            await fs.unlink(file.path);
          }
        } catch (error) {
          const filePath = file.path || file.originalname || 'unknown';
          console.warn('Failed to cleanup file:', filePath);
        }
      }

      // Calculate totals
      const totals = {
        filesProcessed: processed.length,
        totalTruths: processed.reduce((sum, p) => sum + (p.shredderAnalysis?.summary?.totalTruths || 0), 0),
        totalSamples: processed.reduce((sum, p) => sum + (p.storageResults?.samplesAdded || 0), 0),
        totalPrinciples: processed.reduce((sum, p) => sum + (p.storageResults?.principlesAdded || 0), 0),
        totalRelationships: processed.reduce((sum, p) => sum + (p.storageResults?.relationshipsAdded || 0), 0)
      };

      // Create summary instead of sending full processed data
      const summary = processed.map(p => ({
        filename: p.document.filename,
        fileType: detectFileType(p.document.filename),
        words: p.document.metadata.words,
        truths: p.shredderAnalysis?.summary?.totalTruths || 0,
        samplesAdded: p.storageResults?.samplesAdded || 0,
        principlesAdded: p.storageResults?.principlesAdded || 0,
        relationshipsAdded: p.storageResults?.relationshipsAdded || 0
      }));

      res.json({
        summary,
        totals,
        success: true
      });
    } catch (error: unknown) {
      console.error('Error processing folder upload:', error);
      handleRouteError(error, res, 500);
    }
  });

  /**
   * Process content directly (without file upload)
   * POST /api/documents/process
   * Body: { content: string, filename?: string, fileType?: string, category?: string, tags?: string[], autoStore?: boolean }
   */
  router.post('/documents/process', validateProcessDocument, async (req: Request, res: Response) => {
    try {
      const { content, filename, fileType } = req.body;
      
      const options: ProcessingOptions = buildProcessingOptionsForContent(req, profileManager);
      const detectedFileType = fileType || detectFileType(filename || 'untitled.txt');

      const processed = await documentProcessor.processContent(
        content,
        filename || 'untitled.txt',
        detectedFileType,
        options
      );

      res.json({
        processed,
        success: true
      });
    } catch (error: unknown) {
      handleRouteError(error, res, 500);
    }
  });

  return router;
}


