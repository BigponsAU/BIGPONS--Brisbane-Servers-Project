/**
 * Vector Storage System
 * Stores word vector embeddings of documents for semantic analysis
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { ensureDirExists } from '../utils/fs-safe';

export interface DocumentVector {
  id: string;
  text: string;
  vector: number[];
  metadata: {
    documentId?: string;
    source?: string;
    category?: string;
    tags?: string[];
    filename?: string;
    fileType?: string;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface VectorStorageData {
  vectors: DocumentVector[];
  version: string;
  lastUpdated: Date;
}

export class VectorStorage {
  private storagePath: string;
  private data: VectorStorageData;

  constructor(storagePath: string = './storage/vector-storage.json') {
    this.storagePath = storagePath;
    this.data = {
      vectors: [],
      version: '1.0.0',
      lastUpdated: new Date()
    };
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
          vectors: parsed.vectors.map((v: any) => ({
            ...v,
            createdAt: new Date(v.createdAt),
            updatedAt: new Date(v.updatedAt)
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
      throw new Error(`Failed to initialize vector storage: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Save data to disk
   */
  private async save(): Promise<void> {
    try {
      this.data.lastUpdated = new Date();
      await fs.writeFile(this.storagePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save vector storage: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Simple TF-IDF based vectorization
   * Creates a word frequency vector normalized by document length
   */
  private vectorize(text: string): number[] {
    // Tokenize and normalize text
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 0);

    // Create word frequency map
    const wordFreq = new Map<string, number>();
    words.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });

    // Normalize by document length
    const vector: number[] = [];
    const uniqueWords = Array.from(wordFreq.keys()).sort();
    
    // Create a fixed-size vector (using first 1000 unique words for simplicity)
    // In production, this could use a vocabulary dictionary
    const maxVectorSize = 1000;
    const wordArray = uniqueWords.slice(0, maxVectorSize);
    
    wordArray.forEach(word => {
      const freq = wordFreq.get(word) || 0;
      // Normalize by document length
      vector.push(freq / words.length);
    });

    // Pad or truncate to fixed size
    while (vector.length < maxVectorSize) {
      vector.push(0);
    }
    
    return vector.slice(0, maxVectorSize);
  }

  /**
   * Vectorize text and store with metadata
   */
  async vectorizeAndStore(
    text: string,
    metadata: {
      documentId?: string;
      source?: string;
      category?: string;
      tags?: string[];
      filename?: string;
      fileType?: string;
      [key: string]: any;
    }
  ): Promise<DocumentVector> {
    const vector = this.vectorize(text);
    const id = `vec_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    const documentVector: DocumentVector = {
      id,
      text,
      vector,
      metadata: {
        ...metadata,
        documentId: metadata.documentId || id
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.data.vectors.push(documentVector);
    await this.save();

    return documentVector;
  }

  /**
   * Get vector by document ID
   */
  async getVector(documentId: string): Promise<DocumentVector | null> {
    const vector = this.data.vectors.find(
      v => v.id === documentId || v.metadata.documentId === documentId
    );
    return vector || null;
  }

  /**
   * Get all vectors
   */
  async getAllVectors(): Promise<DocumentVector[]> {
    return [...this.data.vectors];
  }

  /**
   * Get vectors by category
   */
  async getVectorsByCategory(category: string): Promise<DocumentVector[]> {
    return this.data.vectors.filter(v => v.metadata.category === category);
  }

  /**
   * Get vectors by tags
   */
  async getVectorsByTags(tags: string[]): Promise<DocumentVector[]> {
    return this.data.vectors.filter(v => {
      const vectorTags = v.metadata.tags || [];
      return tags.some(tag => vectorTags.includes(tag));
    });
  }

  /**
   * Delete vector by ID
   */
  async deleteVector(id: string): Promise<boolean> {
    const index = this.data.vectors.findIndex(v => v.id === id || v.metadata.documentId === id);
    if (index === -1) return false;
    
    this.data.vectors.splice(index, 1);
    await this.save();
    return true;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  calculateSimilarity(vector1: number[], vector2: number[]): number {
    if (vector1.length !== vector2.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < vector1.length; i++) {
      dotProduct += vector1[i] * vector2[i];
      magnitude1 += vector1[i] * vector1[i];
      magnitude2 += vector2[i] * vector2[i];
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * Find similar vectors
   */
  async findSimilarVectors(
    targetVector: number[],
    limit: number = 10,
    threshold: number = 0.5
  ): Promise<Array<{ vector: DocumentVector; similarity: number }>> {
    const results: Array<{ vector: DocumentVector; similarity: number }> = [];

    for (const vec of this.data.vectors) {
      const similarity = this.calculateSimilarity(targetVector, vec.vector);
      if (similarity >= threshold) {
        results.push({ vector: vec, similarity });
      }
    }

    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  /**
   * Export all vectors
   */
  async export(): Promise<VectorStorageData> {
    return JSON.parse(JSON.stringify(this.data));
  }

  /**
   * Import vectors
   */
  async import(data: VectorStorageData): Promise<void> {
    this.data = {
      ...data,
      vectors: data.vectors.map(v => ({
        ...v,
        createdAt: new Date(v.createdAt),
        updatedAt: new Date(v.updatedAt)
      })),
      lastUpdated: new Date(data.lastUpdated)
    };
    await this.save();
  }
}

