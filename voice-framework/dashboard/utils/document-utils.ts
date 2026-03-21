/**
 * Document Processing Utilities
 * Shared utilities for document route handlers
 */

import { ProcessingOptions } from '../types';
import { ProfileManager } from '../../storage/profile-manager';
import { Request } from 'express';

/**
 * Build processing options from request body
 * 
 * @param req - Express request object
 * @param profileManager - Optional profile manager for loading voice profiles
 * @returns ProcessingOptions object
 */
export function buildProcessingOptions(
  req: Request,
  profileManager?: ProfileManager
): ProcessingOptions {
  const { category, tags, autoStore, vectorize, pan, voiceProfileId, createProfiles, profileOptions } = req.body;
  
  const options: ProcessingOptions = {
    autoStore: autoStore !== 'false' && autoStore !== false,
    category: category || 'document',
    tags: tags 
      ? (typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags)
      : [],
    vectorize: vectorize !== 'false' && vectorize !== false,
    pan: pan === 'true' || pan === true,
    createProfiles: createProfiles === 'true' || createProfiles === true
  };
  
  // If panning is enabled, fetch the voice profile
  // If no profile specified, use default/base profile
  if (options.pan && profileManager) {
    try {
      let profile: any = null;
      
      // Use specified profile if provided
      if (voiceProfileId) {
        profile = profileManager.getProfile(voiceProfileId);
      } else {
        // Use default/base profile if no profile specified
        profile = profileManager.getDefaultProfile();
      }
      
      if (profile) {
        options.voiceProfile = profile;
      }
    } catch (error) {
      console.warn('Failed to load profile for panning:', error);
    }
  }
  
  // Add profile options if provided
  if (profileOptions) {
    try {
      const parsed = typeof profileOptions === 'string' ? JSON.parse(profileOptions) : profileOptions;
      options.profileOptions = parsed;
    } catch (error) {
      console.warn('Failed to parse profileOptions:', error);
    }
  }
  
  return options;
}

/**
 * Build processing options for direct content processing
 * 
 * @param req - Express request object
 * @param profileManager - Optional profile manager for loading voice profiles
 * @returns ProcessingOptions object
 */
export function buildProcessingOptionsForContent(
  req: Request,
  profileManager?: ProfileManager
): ProcessingOptions {
  const { category, tags, autoStore, vectorize, pan, voiceProfile, voiceProfileId, createProfiles, profileOptions } = req.body;
  
  const options: ProcessingOptions = {
    autoStore: autoStore !== false,
    category: category || 'document',
    tags: tags || [],
    vectorize: vectorize !== false,
    pan: pan === true,
    createProfiles: createProfiles === true
  };
  
  // If panning is enabled, use provided voiceProfile or fetch by ID
  // If no profile specified, use default/base profile
  if (options.pan) {
    if (voiceProfile) {
      options.voiceProfile = voiceProfile;
    } else if (voiceProfileId && profileManager) {
      try {
        const profile = profileManager.getProfile(voiceProfileId);
        if (profile) {
          options.voiceProfile = profile;
        }
      } catch (error) {
        console.warn('Failed to load profile for panning:', error);
      }
    } else if (profileManager) {
      // Use default/base profile if no profile specified
      try {
        const defaultProfile = profileManager.getDefaultProfile();
        if (defaultProfile) {
          options.voiceProfile = defaultProfile;
        }
      } catch (error) {
        console.warn('Failed to load default profile for panning:', error);
      }
    }
  }
  
  // Add profile options if provided
  if (profileOptions) {
    options.profileOptions = profileOptions;
  }
  
  return options;
}

