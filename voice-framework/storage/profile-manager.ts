/**
 * Profile Manager
 * Manages multiple voice profiles - create, save, load, update, delete
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import type { VoiceProfile } from '../models/voice-profile';
import { ToneAnalyzer } from '../analyzers/tone-analyzer';
import { PatternExtractor } from '../analyzers/pattern-extractor';

export interface ProfileMetadata {
  id: string;
  name: string;
  description?: string;
  version: string;
  sourceDocument?: string;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
  isDefault?: boolean;
  /** When true, profile is hidden from default listings (optional). */
  archived?: boolean;
}

export interface ProfileEntry {
  metadata: ProfileMetadata;
  profile: VoiceProfile;
}

export interface ProfileManagerData {
  profiles: ProfileEntry[];
  defaultProfileId?: string;
  version: string;
  lastUpdated: Date;
}

export class ProfileManager {
  private profilesPath: string;
  private data: ProfileManagerData;

  constructor(profilesPath: string = './storage/profiles.json') {
    this.profilesPath = profilesPath;
    this.data = {
      profiles: [],
      version: '1.0.0',
      lastUpdated: new Date()
    };
  }

  /**
   * Initialize profile manager - load existing profiles
   */
  async initialize(): Promise<void> {
    try {
      const dir = path.dirname(this.profilesPath);
      await fs.mkdir(dir, { recursive: true });
      
      try {
        const fileData = await fs.readFile(this.profilesPath, 'utf-8');
        const parsed = JSON.parse(fileData);
        this.data = {
          ...parsed,
          profiles: parsed.profiles.map((p: any) => ({
            ...p,
            metadata: {
              ...p.metadata,
              createdAt: new Date(p.metadata.createdAt),
              updatedAt: new Date(p.metadata.updatedAt)
            }
          })),
          lastUpdated: new Date(parsed.lastUpdated)
        };
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
          // File doesn't exist, use default empty data
        } else {
          throw error;
        }
      }
    } catch (error) {
      throw new Error(`Failed to initialize profile manager: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Save profiles to disk
   */
  private async save(): Promise<void> {
    try {
      this.data.lastUpdated = new Date();
      await fs.writeFile(this.profilesPath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save profiles: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create a new profile
   */
  async createProfile(
    profile: VoiceProfile,
    metadata: Omit<ProfileMetadata, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ProfileMetadata> {
    const newMetadata: ProfileMetadata = {
      ...metadata,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const entry: ProfileEntry = {
      metadata: newMetadata,
      profile
    };

    this.data.profiles.push(entry);

    // If this is the first profile or marked as default, set it as default
    if (metadata.isDefault || this.data.profiles.length === 1) {
      this.data.defaultProfileId = newMetadata.id;
      // Unset other defaults
      this.data.profiles.forEach(p => {
        if (p.metadata.id !== newMetadata.id) {
          p.metadata.isDefault = false;
        }
      });
    }

    await this.save();
    return newMetadata;
  }

  /**
   * Get all profile metadata
   */
  getAllProfiles(): ProfileMetadata[] {
    return this.data.profiles.map(p => p.metadata);
  }

  /**
   * Get a profile by ID
   */
  getProfile(id: string): VoiceProfile | null {
    const entry = this.data.profiles.find(p => p.metadata.id === id);
    return entry ? entry.profile : null;
  }

  /**
   * Get full profile entry (metadata + profile)
   */
  getProfileEntry(id: string): ProfileEntry | null {
    return this.data.profiles.find(p => p.metadata.id === id) || null;
  }

  /**
   * Get the default profile
   */
  getDefaultProfile(): VoiceProfile | null {
    if (this.data.defaultProfileId) {
      return this.getProfile(this.data.defaultProfileId);
    }
    // Return first profile if no default set
    return this.data.profiles.length > 0 ? this.data.profiles[0].profile : null;
  }

  /**
   * Update a profile
   */
  async updateProfile(
    id: string,
    updates: Partial<VoiceProfile>,
    metadataUpdates?: Partial<Omit<ProfileMetadata, 'id' | 'createdAt'>>
  ): Promise<ProfileEntry | null> {
    const index = this.data.profiles.findIndex(p => p.metadata.id === id);
    if (index === -1) return null;

    if (updates) {
      this.data.profiles[index].profile = {
        ...this.data.profiles[index].profile,
        ...updates
      };
    }

    if (metadataUpdates) {
      this.data.profiles[index].metadata = {
        ...this.data.profiles[index].metadata,
        ...metadataUpdates,
        updatedAt: new Date()
      };
    } else {
      this.data.profiles[index].metadata.updatedAt = new Date();
    }

    await this.save();
    return this.data.profiles[index];
  }

  /**
   * Set default profile
   */
  async setDefaultProfile(id: string): Promise<boolean> {
    const index = this.data.profiles.findIndex(p => p.metadata.id === id);
    if (index === -1) return false;

    // Unset all defaults
    this.data.profiles.forEach(p => {
      p.metadata.isDefault = false;
    });

    // Set new default
    this.data.profiles[index].metadata.isDefault = true;
    this.data.defaultProfileId = id;

    await this.save();
    return true;
  }

  /**
   * Delete a profile
   */
  async deleteProfile(id: string): Promise<boolean> {
    const index = this.data.profiles.findIndex(p => p.metadata.id === id);
    if (index === -1) return false;

    const wasDefault = this.data.profiles[index].metadata.isDefault;
    this.data.profiles.splice(index, 1);

    // If deleted profile was default, set first profile as default
    if (wasDefault && this.data.profiles.length > 0) {
      this.data.profiles[0].metadata.isDefault = true;
      this.data.defaultProfileId = this.data.profiles[0].metadata.id;
    } else if (this.data.profiles.length === 0) {
      this.data.defaultProfileId = undefined;
    }

    await this.save();
    return true;
  }

  /**
   * Export a profile to a file
   */
  async exportProfile(id: string, filePath: string): Promise<void> {
    const entry = this.getProfileEntry(id);
    if (!entry) {
      throw new Error(`Profile with id ${id} not found`);
    }

    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(entry.profile, null, 2), 'utf-8');
  }

  /**
   * Import a profile from a file
   */
  async importProfile(
    filePath: string,
    metadata: Omit<ProfileMetadata, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ProfileMetadata> {
    const fileData = await fs.readFile(filePath, 'utf-8');
    const profile: VoiceProfile = JSON.parse(fileData);
    
    return await this.createProfile(profile, metadata);
  }

  /**
   * Search profiles by name or tags
   */
  searchProfiles(query: string): ProfileMetadata[] {
    const lowerQuery = query.toLowerCase();
    return this.data.profiles
      .filter(p => 
        p.metadata.name.toLowerCase().includes(lowerQuery) ||
        p.metadata.description?.toLowerCase().includes(lowerQuery) ||
        p.metadata.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
      )
      .map(p => p.metadata);
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalProfiles: this.data.profiles.length,
      defaultProfileId: this.data.defaultProfileId,
      lastUpdated: this.data.lastUpdated
    };
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `profile_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}

