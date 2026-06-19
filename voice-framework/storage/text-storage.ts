/**
 * Text Storage System
 * Stores text samples, semantic data, and principles for voice profile analysis
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { ensureDirExists } from '../utils/fs-safe';

export interface TextSample {
  id: string;
  text: string;
  source?: string;
  category?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface SemanticPrinciple {
  id: string;
  principle: string;
  description?: string;
  examples?: string[];
  category?: string;
  relationships?: string[]; // IDs of related principles
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface SemanticRelationship {
  id: string;
  sourceId: string; // ID of source principle/text
  targetId: string; // ID of target principle/text
  relationshipType: 'similar' | 'opposite' | 'hierarchical' | 'causal' | 'sequential' | 'related';
  strength: number; // 0-1
  description?: string;
  createdAt: Date;
}

export interface ArchivedPrincipleRecord {
  id: string;
  originalId: string;
  principle: string;
  description?: string;
  category?: string;
  archivedAt: Date;
  reason: string;
}

export interface TextStorageData {
  samples: TextSample[];
  principles: SemanticPrinciple[];
  archivedPrinciples: ArchivedPrincipleRecord[];
  relationships: SemanticRelationship[];
  version: string;
  lastUpdated: Date;
}

export class TextStorage {
  private storagePath: string;
  private data: TextStorageData;
  private onAfterSave?: () => void | Promise<void>;

  constructor(storagePath: string = './storage/text-storage.json') {
    this.storagePath = storagePath;
    this.data = {
      samples: [],
      principles: [],
      archivedPrinciples: [],
      relationships: [],
      version: '1.0.0',
      lastUpdated: new Date()
    };
  }

  /** Optional hook after each disk save (e.g. sync to Postgres corpus on edge). */
  setOnAfterSave(hook: () => void | Promise<void>): void {
    this.onAfterSave = hook;
  }

  /**
   * Initialize storage - load existing data or create new
   */
  async initialize(): Promise<void> {
    try {
      const dir = path.dirname(this.storagePath);
      await ensureDirExists(dir);
      
      try {
        const fileData = await fs.readFile(this.storagePath, 'utf-8');
        const parsed = JSON.parse(fileData);
        this.data = {
          ...parsed,
          samples: parsed.samples.map((s: any) => ({
            ...s,
            createdAt: new Date(s.createdAt),
            updatedAt: new Date(s.updatedAt)
          })),
          principles: parsed.principles.map((p: any) => ({
            ...p,
            createdAt: new Date(p.createdAt)
          })),
          archivedPrinciples: Array.isArray(parsed.archivedPrinciples)
            ? parsed.archivedPrinciples.map((p: any) => ({
                ...p,
                archivedAt: new Date(p.archivedAt)
              }))
            : [],
          relationships: parsed.relationships.map((r: any) => ({
            ...r,
            createdAt: new Date(r.createdAt)
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
      throw new Error(`Failed to initialize text storage: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Save data to disk
   */
  private async save(): Promise<void> {
    try {
      this.data.lastUpdated = new Date();
      await ensureDirExists(path.dirname(this.storagePath));
      await fs.writeFile(this.storagePath, JSON.stringify(this.data, null, 2), 'utf-8');
      if (this.onAfterSave) {
        await this.onAfterSave();
      }
    } catch (error) {
      throw new Error(`Failed to save text storage: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if text contains binary data
   */
  private isBinaryData(text: string): boolean {
    // Check for common binary file signatures
    const binarySignatures = [
      '\x89PNG', // PNG
      '\xFF\xD8\xFF', // JPEG
      'GIF8', // GIF
      'BM', // BMP
      '%PDF', // PDF
      'PK\x03\x04', // ZIP
      '\x1F\x8B', // GZIP
    ];
    
    // Check first 4 bytes
    const header = text.substring(0, 4);
    return binarySignatures.some(sig => header.startsWith(sig));
  }

  /**
   * Validate text is actually text (not binary)
   */
  private isValidText(text: string): boolean {
    if (!text || typeof text !== 'string') return false;
    
    // Check for binary data
    if (this.isBinaryData(text)) return false;
    
    // Check if text contains too many non-printable characters
    const nonPrintable = text.split('').filter(char => {
      const code = char.charCodeAt(0);
      return code < 32 && code !== 9 && code !== 10 && code !== 13; // Allow tab, newline, carriage return
    }).length;
    
    // If more than 5% non-printable, likely binary
    return nonPrintable / text.length < 0.05;
  }

  /**
   * Normalize human-readable text for storage/display.
   */
  private normalizeText(text: string): string {
    return text
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Heuristic: true when a label has semantic signal (not just numbers/symbols).
   */
  private hasSemanticSignal(text: string): boolean {
    const normalized = this.normalizeText(text);
    if (!normalized) return false;
    const words = normalized.split(/\s+/).filter(Boolean);
    if (words.length < 2) return false;
    if (!words.some((word) => /[A-Za-z]{4,}/.test(word))) return false;
    const letters = (normalized.match(/[A-Za-z]/g) || []).length;
    const digits = (normalized.match(/[0-9]/g) || []).length;
    const symbolCount = (normalized.match(/[^A-Za-z0-9\s.,;:!?'"()\-/%]/g) || []).length;
    const symbolRatio = symbolCount / Math.max(normalized.length, 1);
    const codeLikePattern = /\b(var|const|let|function|return|opacity|calc|rgba|background)\b|--|=>|\{|\}|\[|\]|::/i;
    if (letters < 3) return false;
    if (digits > letters * 2) return false;
    if (symbolRatio > 0.2) return false;
    if (/[{}[\]|=>]/.test(normalized)) return false;
    if (codeLikePattern.test(normalized)) return false;
    return true;
  }

  /**
   * Add a text sample
   */
  async addSample(sample: Omit<TextSample, 'id' | 'createdAt' | 'updatedAt'>): Promise<TextSample> {
    // Validate text is not binary
    if (!this.isValidText(sample.text)) {
      throw new Error('Invalid text sample: appears to contain binary data');
    }
    
    const newSample: TextSample = {
      ...sample,
      text: this.normalizeText(sample.text),
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.data.samples.push(newSample);
    await this.save();
    return newSample;
  }

  /**
   * Get all text samples
   */
  getSamples(filter?: { category?: string; tags?: string[] }): TextSample[] {
    let samples = [...this.data.samples];
    
    // Filter out binary data samples
    samples = samples.filter(s => this.isValidText(s.text));
    
    if (filter?.category) {
      samples = samples.filter(s => s.category === filter.category);
    }
    
    if (filter?.tags && filter.tags.length > 0) {
      samples = samples.filter(s => 
        s.tags?.some(tag => filter.tags!.includes(tag))
      );
    }
    
    return samples;
  }

  /**
   * Get a specific text sample by ID
   */
  getSample(id: string): TextSample | undefined {
    return this.data.samples.find(s => s.id === id);
  }

  /**
   * Update a text sample
   */
  async updateSample(id: string, updates: Partial<Omit<TextSample, 'id' | 'createdAt'>>): Promise<TextSample | null> {
    const index = this.data.samples.findIndex(s => s.id === id);
    if (index === -1) return null;
    
    this.data.samples[index] = {
      ...this.data.samples[index],
      ...updates,
      updatedAt: new Date()
    };
    
    await this.save();
    return this.data.samples[index];
  }

  /**
   * Delete a text sample
   */
  async deleteSample(id: string): Promise<boolean> {
    const index = this.data.samples.findIndex(s => s.id === id);
    if (index === -1) return false;
    
    this.data.samples.splice(index, 1);
    // Also remove related relationships
    this.data.relationships = this.data.relationships.filter(
      r => r.sourceId !== id && r.targetId !== id
    );
    
    await this.save();
    return true;
  }

  /**
   * Add a semantic principle
   */
  async addPrinciple(principle: Omit<SemanticPrinciple, 'id' | 'createdAt'>): Promise<SemanticPrinciple> {
    const normalizedPrinciple = this.normalizeText(principle.principle || '');
    if (!this.hasSemanticSignal(normalizedPrinciple)) {
      throw new Error('Principle must contain meaningful semantic text (not only numbers/symbols)');
    }
    const newPrinciple: SemanticPrinciple = {
      ...principle,
      principle: normalizedPrinciple,
      description: principle.description ? this.normalizeText(principle.description) : principle.description,
      examples: Array.isArray(principle.examples)
        ? principle.examples.map((example) => this.normalizeText(example)).filter(Boolean)
        : principle.examples,
      id: this.generateId(),
      createdAt: new Date()
    };
    this.data.principles.push(newPrinciple);
    await this.save();
    return newPrinciple;
  }

  /**
   * Get all semantic principles
   */
  getPrinciples(filter?: { category?: string }): SemanticPrinciple[] {
    if (filter?.category) {
      return this.data.principles.filter(p => p.category === filter.category);
    }
    return [...this.data.principles];
  }

  /**
   * Get a specific principle by ID
   */
  getPrinciple(id: string): SemanticPrinciple | undefined {
    return this.data.principles.find(p => p.id === id);
  }

  /**
   * Update a semantic principle
   */
  async updatePrinciple(id: string, updates: Partial<Omit<SemanticPrinciple, 'id' | 'createdAt'>>): Promise<SemanticPrinciple | null> {
    const index = this.data.principles.findIndex(p => p.id === id);
    if (index === -1) return null;
    
    this.data.principles[index] = {
      ...this.data.principles[index],
      ...updates
    };
    
    await this.save();
    return this.data.principles[index];
  }

  /**
   * Add a semantic relationship
   */
  async addRelationship(relationship: Omit<SemanticRelationship, 'id' | 'createdAt'>): Promise<SemanticRelationship> {
    const newRelationship: SemanticRelationship = {
      ...relationship,
      id: this.generateId(),
      createdAt: new Date()
    };
    this.data.relationships.push(newRelationship);
    await this.save();
    return newRelationship;
  }

  /**
   * Get relationships for a given ID
   */
  getRelationships(id: string): SemanticRelationship[] {
    return this.data.relationships.filter(
      r => r.sourceId === id || r.targetId === id
    );
  }

  /**
   * Get all relationships
   */
  getAllRelationships(): SemanticRelationship[] {
    return [...this.data.relationships];
  }

  /**
   * Export all data
   */
  export(): TextStorageData {
    return JSON.parse(JSON.stringify(this.data));
  }

  /**
   * Import data (replaces existing)
   */
  async import(data: TextStorageData): Promise<void> {
    this.data = {
      ...data,
      samples: data.samples.map(s => ({
        ...s,
        createdAt: new Date(s.createdAt),
        updatedAt: new Date(s.updatedAt)
      })),
      principles: data.principles.map(p => ({
        ...p,
        createdAt: new Date(p.createdAt)
      })),
      archivedPrinciples: Array.isArray((data as any).archivedPrinciples)
        ? (data as any).archivedPrinciples.map((p: any) => ({
            ...p,
            archivedAt: new Date(p.archivedAt)
          }))
        : [],
      relationships: data.relationships.map(r => ({
        ...r,
        createdAt: new Date(r.createdAt)
      })),
      lastUpdated: new Date(data.lastUpdated)
    };
    await this.save();
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalSamples: this.data.samples.length,
      totalPrinciples: this.data.principles.length,
      archivedPrinciples: this.data.archivedPrinciples.length,
      totalRelationships: this.data.relationships.length,
      categories: {
        samples: [...new Set(this.data.samples.map(s => s.category).filter(Boolean))],
        principles: [...new Set(this.data.principles.map(p => p.category).filter(Boolean))]
      },
      lastUpdated: this.data.lastUpdated
    };
  }

  /**
   * Clean up binary data from storage
   */
  async cleanupBinaryData(): Promise<{ removedSamples: number; removedPrinciples: number }> {
    const initialSampleCount = this.data.samples.length;
    const initialPrincipleCount = this.data.principles.length;
    
    // Remove samples with binary data
    this.data.samples = this.data.samples.filter(s => this.isValidText(s.text));
    
    // Remove principles that might reference binary data (check description)
    this.data.principles = this.data.principles.filter(p => {
      if (p.description && !this.isValidText(p.description)) return false;
      if (p.examples && p.examples.some(ex => !this.isValidText(ex))) return false;
      return true;
    });
    
    const removedSamples = initialSampleCount - this.data.samples.length;
    const removedPrinciples = initialPrincipleCount - this.data.principles.length;
    
    if (removedSamples > 0 || removedPrinciples > 0) {
      await this.save();
    }
    
    return { removedSamples, removedPrinciples };
  }

  /**
   * Remove low-signal/noisy semantic entries across text storage.
   */
  async cleanupSemanticNoise(dryRun: boolean = false): Promise<{
    removedLowSignalPrinciples: number;
    sanitizedSamples: number;
    sanitizedPrinciples: number;
  }> {
    let removedLowSignalPrinciples = 0;
    let sanitizedSamples = 0;
    let sanitizedPrinciples = 0;

    const nextSamples = this.data.samples.map((sample) => {
      const normalizedText = this.normalizeText(sample.text || '');
      if (normalizedText !== sample.text) {
        sanitizedSamples += 1;
      }
      return { ...sample, text: normalizedText };
    });

    const nextPrinciples: SemanticPrinciple[] = [];
    for (const principle of this.data.principles) {
      const normalizedPrinciple = this.normalizeText(principle.principle || '');
      if (!this.hasSemanticSignal(normalizedPrinciple)) {
        removedLowSignalPrinciples += 1;
        continue;
      }

      const normalizedDescription = principle.description
        ? this.normalizeText(principle.description)
        : principle.description;
      const normalizedExamples = Array.isArray(principle.examples)
        ? principle.examples.map((example) => this.normalizeText(example)).filter(Boolean)
        : principle.examples;

      if (
        normalizedPrinciple !== principle.principle ||
        normalizedDescription !== principle.description ||
        JSON.stringify(normalizedExamples || []) !== JSON.stringify(principle.examples || [])
      ) {
        sanitizedPrinciples += 1;
      }

      nextPrinciples.push({
        ...principle,
        principle: normalizedPrinciple,
        description: normalizedDescription,
        examples: normalizedExamples,
      });
    }

    if (!dryRun) {
      this.data.samples = nextSamples;
      this.data.principles = nextPrinciples;
      await this.save();
    }

    return {
      removedLowSignalPrinciples,
      sanitizedSamples,
      sanitizedPrinciples,
    };
  }

  /**
   * Aggressive principle cleanup for legacy fragment-heavy corpora.
   * Keeps only stronger semantic phrases.
   */
  async cleanupPrincipleFragmentsAggressive(dryRun: boolean = false): Promise<{
    removedAggressivePrinciples: number;
    archivedAggressivePrinciples: number;
  }> {
    let removedAggressivePrinciples = 0;
    let archivedAggressivePrinciples = 0;
    const codeLikePattern = /\b(var|const|let|function|return|opacity|calc|rgba|background|clamp)\b|--|=>|\{|\}|\[|\]|::/i;

    const nextPrinciples: SemanticPrinciple[] = [];
    for (const principle of this.data.principles) {
      const normalized = this.normalizeText(principle.principle || '');
      const words = normalized.split(/\s+/).filter(Boolean);
      const longWords = words.filter((word) => /[A-Za-z]{4,}/.test(word));
      const digits = (normalized.match(/[0-9]/g) || []).length;
      const letters = (normalized.match(/[A-Za-z]/g) || []).length;

      const keep =
        words.length >= 4 &&
        longWords.length >= 2 &&
        letters >= 8 &&
        digits <= Math.max(2, Math.floor(letters / 4)) &&
        !codeLikePattern.test(normalized);

      if (!keep) {
        removedAggressivePrinciples += 1;
        archivedAggressivePrinciples += 1;
        if (!dryRun) {
          this.data.archivedPrinciples.push({
            id: this.generateId(),
            originalId: principle.id,
            principle: normalized,
            description: principle.description,
            category: principle.category,
            archivedAt: new Date(),
            reason: 'aggressive_fragment_cleanup'
          });
        }
        continue;
      }

      nextPrinciples.push({
        ...principle,
        principle: normalized,
      });
    }

    if (!dryRun && removedAggressivePrinciples > 0) {
      this.data.principles = nextPrinciples;
      await this.save();
    }

    return { removedAggressivePrinciples, archivedAggressivePrinciples };
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `id_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}

