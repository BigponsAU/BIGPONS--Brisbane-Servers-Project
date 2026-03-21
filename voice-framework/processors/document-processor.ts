/**
 * Document Processor
 * Processes documents through Shredder and populates storage
 * Enhanced with vectorization, panning, and profile creation capabilities
 */

import { DocumentParser, ParsedDocument } from '../parsers/document-parser';
import { Shredder, ShreddedTruth } from '../analyzers/shredder';
import { TextStorage, SemanticPrinciple } from '../storage/text-storage';
import { VectorStorage, DocumentVector } from '../storage/vector-storage';
import { Panner, PannedResult } from '../analyzers/panner';
import { ProfileBuilder } from '../builders/profile-builder';
import { VoiceProfile } from '../models/voice-profile';

export interface ProcessedDocument {
  document: ParsedDocument;
  shredderAnalysis: {
    truths: ShreddedTruth[];
    summary: {
      totalTruths: number;
      factCount: number;
      assertionCount: number;
      definitionCount: number;
    };
  };
  storageResults: {
    samplesAdded: number;
    principlesAdded: number;
    relationshipsAdded: number;
  };
  // New optional fields (additive only - preserves backward compatibility)
  documentVector?: DocumentVector;
  pannedResults?: PannedResult;
  topicProfile?: VoiceProfile;
  wholeTopicProfile?: VoiceProfile;
}

export class DocumentProcessor {
  private parser: DocumentParser;
  private shredder: Shredder;
  private storage: TextStorage;
  private vectorStorage: VectorStorage;
  private profileBuilder: ProfileBuilder;

  constructor(storage: TextStorage, vectorStorage?: VectorStorage) {
    this.parser = new DocumentParser();
    this.shredder = new Shredder();
    this.storage = storage;
    this.vectorStorage = vectorStorage || new VectorStorage();
    this.profileBuilder = new ProfileBuilder();
    
    // Initialize vector storage if not already initialized
    if (!vectorStorage) {
      this.vectorStorage.initialize().catch(err => {
        console.warn('Failed to initialize vector storage:', err);
      });
    }
  }

  /**
   * Process a document: parse, vectorize, shred, pan (optional), and store
   */
  async processDocument(
    filePath: string,
    options?: {
      autoStore?: boolean;
      category?: string;
      tags?: string[];
      // New optional fields
      vectorize?: boolean;
      pan?: boolean;
      voiceProfile?: VoiceProfile;
      createProfiles?: boolean;
      profileOptions?: {
        topicName?: string;
        wholeTopicName?: string;
      };
    }
  ): Promise<ProcessedDocument> {
    // 1. Parse document (EXISTING - unchanged)
    const document = await this.parser.parseFile(filePath);

    // 2. NEW: Vectorize and store original text (if vectorize !== false)
    let documentVector: DocumentVector | undefined;
    if (options?.vectorize !== false) {
      try {
        await this.vectorStorage.initialize();
        documentVector = await this.vectorStorage.vectorizeAndStore(
          document.extractedText,
          {
            documentId: document.id,
            source: document.filename,
            category: options?.category || 'document',
            tags: options?.tags || [],
            filename: document.filename,
            fileType: document.fileType,
            ...document.metadata
          }
        );
      } catch (error) {
        console.warn('Failed to vectorize document:', error);
      }
    }

    // 3. Shred document (EXISTING - unchanged)
    const shredderAnalysis = this.shredder.shred(document.extractedText);

    // 4. NEW: Pan truths (if pan === true and voiceProfile provided)
    let pannedResults: PannedResult | undefined;
    let truthsToStore = shredderAnalysis.truths;
    
    if (options?.pan === true && options?.voiceProfile) {
      try {
        const panner = new Panner(options.voiceProfile);
        pannedResults = panner.pan(shredderAnalysis.truths);
        // Use only gold truths for storage if panning was successful
        truthsToStore = pannedResults.gold.map(g => {
          // Convert PannedTruth back to ShreddedTruth for storage
          const { relevanceScore, matchReasons, ...truth } = g;
          return truth;
        });
      } catch (error) {
        console.warn('Failed to pan truths:', error);
        // Fall back to storing all truths
      }
    }

    // 5. NEW: Create profiles (if createProfiles === true)
    let topicProfile: VoiceProfile | undefined;
    let wholeTopicProfile: VoiceProfile | undefined;
    
    if (options?.createProfiles === true) {
      try {
        // Create topic profile from panned gold truths (if available) or all truths
        if (pannedResults && pannedResults.gold.length > 0) {
          topicProfile = await this.profileBuilder.buildFromPannedTruths(
            pannedResults.gold,
            {
              name: options.profileOptions?.topicName || `${document.filename} - Topic Profile`,
              sourceDocument: document.filename,
              description: `Topic-specific profile created from panned gold truths`
            }
          );
        }

        // Create whole topic profile from vectorized original
        if (documentVector) {
          wholeTopicProfile = await this.profileBuilder.buildFromVectorizedDocument(
            documentVector,
            {
              name: options.profileOptions?.wholeTopicName || `${document.filename} - Whole Topic Profile`,
              sourceDocument: document.filename,
              description: `Whole topic profile created from full vectorized document`
            }
          );
        }
      } catch (error) {
        console.warn('Failed to create profiles:', error);
      }
    }

    // 6. Store results (EXISTING - but use panned gold if panning enabled, otherwise all truths)
    let storageResults = {
      samplesAdded: 0,
      principlesAdded: 0,
      relationshipsAdded: 0
    };

    if (options?.autoStore !== false) {
      storageResults = await this.storeShreddedContent(
        document,
        truthsToStore,
        options
      );
    }

    // Build result with all fields (existing + new optional fields)
    const result: ProcessedDocument = {
      document,
      shredderAnalysis: {
        truths: shredderAnalysis.truths,
        summary: shredderAnalysis.summary
      },
      storageResults
    };

    // Add optional fields if they exist
    if (documentVector) {
      result.documentVector = documentVector;
    }
    if (pannedResults) {
      result.pannedResults = pannedResults;
    }
    if (topicProfile) {
      result.topicProfile = topicProfile;
    }
    if (wholeTopicProfile) {
      result.wholeTopicProfile = wholeTopicProfile;
    }

    return result;
  }

  /**
   * Process document content directly: parse, vectorize, shred, pan (optional), and store
   */
  async processContent(
    content: string,
    filename: string,
    fileType: 'html' | 'markdown' | 'text' | 'unknown' = 'text',
    options?: {
      autoStore?: boolean;
      category?: string;
      tags?: string[];
      // New optional fields
      vectorize?: boolean;
      pan?: boolean;
      voiceProfile?: VoiceProfile;
      createProfiles?: boolean;
      profileOptions?: {
        topicName?: string;
        wholeTopicName?: string;
      };
    }
  ): Promise<ProcessedDocument> {
    // 1. Parse content (EXISTING - unchanged)
    const document = this.parser.parseContent(content, filename, fileType);

    // 2. NEW: Vectorize and store original text (if vectorize !== false)
    let documentVector: DocumentVector | undefined;
    if (options?.vectorize !== false) {
      try {
        await this.vectorStorage.initialize();
        documentVector = await this.vectorStorage.vectorizeAndStore(
          document.extractedText,
          {
            documentId: document.id,
            source: document.filename,
            category: options?.category || 'document',
            tags: options?.tags || [],
            filename: document.filename,
            fileType: document.fileType,
            ...document.metadata
          }
        );
      } catch (error) {
        console.warn('Failed to vectorize document:', error);
      }
    }

    // 3. Shred document (EXISTING - unchanged)
    const shredderAnalysis = this.shredder.shred(document.extractedText);

    // 4. NEW: Pan truths (if pan === true and voiceProfile provided)
    let pannedResults: PannedResult | undefined;
    let truthsToStore = shredderAnalysis.truths;
    
    if (options?.pan === true && options?.voiceProfile) {
      try {
        const panner = new Panner(options.voiceProfile);
        pannedResults = panner.pan(shredderAnalysis.truths);
        // Use only gold truths for storage if panning was successful
        truthsToStore = pannedResults.gold.map(g => {
          // Convert PannedTruth back to ShreddedTruth for storage
          const { relevanceScore, matchReasons, ...truth } = g;
          return truth;
        });
      } catch (error) {
        console.warn('Failed to pan truths:', error);
        // Fall back to storing all truths
      }
    }

    // 5. NEW: Create profiles (if createProfiles === true)
    let topicProfile: VoiceProfile | undefined;
    let wholeTopicProfile: VoiceProfile | undefined;
    
    if (options?.createProfiles === true) {
      try {
        // Create topic profile from panned gold truths (if available) or all truths
        if (pannedResults && pannedResults.gold.length > 0) {
          topicProfile = await this.profileBuilder.buildFromPannedTruths(
            pannedResults.gold,
            {
              name: options.profileOptions?.topicName || `${document.filename} - Topic Profile`,
              sourceDocument: document.filename,
              description: `Topic-specific profile created from panned gold truths`
            }
          );
        }

        // Create whole topic profile from vectorized original
        if (documentVector) {
          wholeTopicProfile = await this.profileBuilder.buildFromVectorizedDocument(
            documentVector,
            {
              name: options.profileOptions?.wholeTopicName || `${document.filename} - Whole Topic Profile`,
              sourceDocument: document.filename,
              description: `Whole topic profile created from full vectorized document`
            }
          );
        }
      } catch (error) {
        console.warn('Failed to create profiles:', error);
      }
    }

    // 6. Store results (EXISTING - but use panned gold if panning enabled, otherwise all truths)
    let storageResults = {
      samplesAdded: 0,
      principlesAdded: 0,
      relationshipsAdded: 0
    };

    if (options?.autoStore !== false) {
      storageResults = await this.storeShreddedContent(
        document,
        truthsToStore,
        options
      );
    }

    // Build result with all fields (existing + new optional fields)
    const result: ProcessedDocument = {
      document,
      shredderAnalysis: {
        truths: shredderAnalysis.truths,
        summary: shredderAnalysis.summary
      },
      storageResults
    };

    // Add optional fields if they exist
    if (documentVector) {
      result.documentVector = documentVector;
    }
    if (pannedResults) {
      result.pannedResults = pannedResults;
    }
    if (topicProfile) {
      result.topicProfile = topicProfile;
    }
    if (wholeTopicProfile) {
      result.wholeTopicProfile = wholeTopicProfile;
    }

    return result;
  }

  /**
   * Store shredded content into storage
   */
  private async storeShreddedContent(
    document: ParsedDocument,
    truths: ShreddedTruth[],
    options?: {
      category?: string;
      tags?: string[];
    }
  ): Promise<{ samplesAdded: number; principlesAdded: number; relationshipsAdded: number }> {
    let samplesAdded = 0;
    let principlesAdded = 0;
    let relationshipsAdded = 0;

    // Store document as a text sample
    try {
      await this.storage.addSample({
        text: document.extractedText,
        source: document.filename,
        category: options?.category || 'document',
        tags: [...(options?.tags || []), 'imported', document.fileType],
        metadata: {
          documentId: document.id,
          fileType: document.fileType,
          ...document.metadata
        }
      });
      samplesAdded++;
    } catch (error) {
      console.error('Failed to store document sample:', error);
    }

    // Convert truths to principles
    const principleMap = new Map<string, SemanticPrinciple>();

    for (const truth of truths) {
      // Group similar truths by type and key terms
      const key = `${truth.type}_${this.extractKeyTerms(truth.claim)}`;
      
      if (!principleMap.has(key)) {
        try {
          const principle = await this.storage.addPrinciple({
            principle: truth.claim,
            description: truth.context || truth.extractedFrom,
            examples: truth.supportingEvidence || [],
            category: options?.category || truth.type,
            metadata: {
              truthId: truth.id,
              confidence: truth.confidence,
              documentId: document.id,
              documentSource: document.filename,
              ...truth.metadata
            }
          });
          principleMap.set(key, principle);
          principlesAdded++;
        } catch (error) {
          console.error('Failed to store principle:', error);
        }
      } else {
        // Update existing principle with additional context
        const existing = principleMap.get(key)!;
        if (truth.context && !existing.description?.includes(truth.context)) {
          existing.description = (existing.description || '') + '\n\n' + truth.context;
        }
      }
    }

    // Create relationships between principles based on metadata
    for (const truth of truths) {
      if (truth.metadata?.relationships && truth.metadata.relationships.length > 0) {
        const sourceKey = `${truth.type}_${this.extractKeyTerms(truth.claim)}`;
        const sourcePrinciple = principleMap.get(sourceKey);
        
        if (sourcePrinciple) {
          for (const relatedTerm of truth.metadata.relationships) {
            // Find related principle
            for (const [key, principle] of principleMap.entries()) {
              if (principle.principle.toLowerCase().includes(relatedTerm.toLowerCase())) {
                try {
                  await this.storage.addRelationship({
                    sourceId: sourcePrinciple.id,
                    targetId: principle.id,
                    relationshipType: 'related',
                    strength: truth.confidence,
                    description: `Extracted from ${document.filename}`
                  });
                  relationshipsAdded++;
                } catch (error) {
                  // Relationship might already exist
                }
                break;
              }
            }
          }
        }
      }
    }

    return { samplesAdded, principlesAdded, relationshipsAdded };
  }

  /**
   * Extract key terms from a claim for grouping
   */
  private extractKeyTerms(claim: string): string {
    // Extract capitalized terms and key words
    const words = claim.split(/\s+/);
    const keyTerms = words
      .filter(w => /^[A-Z]/.test(w) || w.length > 6)
      .slice(0, 3)
      .join('_');
    
    return keyTerms.toLowerCase() || claim.substring(0, 30).toLowerCase();
  }

  /**
   * Process multiple documents
   */
  async processDocuments(
    filePaths: string[],
    options?: {
      autoStore?: boolean;
      category?: string;
      tags?: string[];
    }
  ): Promise<ProcessedDocument[]> {
    const results: ProcessedDocument[] = [];
    
    for (const filePath of filePaths) {
      try {
        const processed = await this.processDocument(filePath, options);
        results.push(processed);
      } catch (error) {
        console.error(`Failed to process ${filePath}:`, error);
      }
    }
    
    return results;
  }
}

