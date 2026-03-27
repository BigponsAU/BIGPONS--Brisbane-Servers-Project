/**
 * Type Definitions
 * Shared types for the dashboard API
 */

import { VoiceProfile } from '../../models/voice-profile';
import multer from 'multer';

/**
 * Processing options for document processing
 */
export interface ProcessingOptions {
  autoStore: boolean;
  category: string;
  tags: string[];
  vectorize?: boolean;
  pan?: boolean;
  voiceProfile?: VoiceProfile;
  createProfiles?: boolean;
  profileOptions?: {
    topicName?: string;
    wholeTopicName?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * API Error Response
 */
export interface ApiError {
  error: string;
  code?: string;
  success: false;
  details?: string;
}

/**
 * API Success Response
 */
export interface ApiSuccess<T = unknown> {
  data?: T;
  success: true;
}

/**
 * Multer file type (for single file uploads)
 */
export type MulterFile = Express.Multer.File;

/**
 * Multer files array type (for multiple file uploads)
 */
export type MulterFiles = MulterFile[];

/**
 * Request filters for storage queries
 */
export interface StorageFilters {
  category?: string;
  tags?: string[];
}

