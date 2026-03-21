/**
 * Extrapolator
 * Extends and expands on existing text while maintaining voice consistency
 */

import { VoiceProfile } from '../models/voice-profile';
import { ToneAnalyzer, ToneAnalysis } from '../analyzers/tone-analyzer';
import { PatternExtractor } from '../analyzers/pattern-extractor';
import { TextGenerator } from './text-generator';
import { DocumentParser } from '../parsers/document-parser';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as voiceProfileData from '../voice-profile.json';

export class Extrapolator {
  private voiceProfile: VoiceProfile;
  private toneAnalyzer: ToneAnalyzer;
  private patternExtractor: PatternExtractor;
  private textGenerator: TextGenerator;
  private documentParser: DocumentParser;

  constructor(profile?: VoiceProfile) {
    this.voiceProfile = profile || (voiceProfileData as VoiceProfile);
    this.toneAnalyzer = new ToneAnalyzer(this.voiceProfile);
    this.patternExtractor = new PatternExtractor(this.voiceProfile);
    this.textGenerator = new TextGenerator(this.voiceProfile);
    this.documentParser = new DocumentParser();
  }

  /**
   * Extrapolates on existing text, expanding concepts while maintaining voice
   */
  extrapolate(seedText: string, options: ExtrapolationOptions = {}): string {
    const {
      expansionLevel = 'moderate',
      addExamples = true,
      addDetails = true
    } = options;

    // Analyze the seed text
    const analysis = this.toneAnalyzer.analyzeText(seedText);
    const patterns = this.patternExtractor.extractPatterns(seedText);

    // Extract key concepts
    const concepts = this.extractConcepts(seedText);
    
    // Handle empty concepts gracefully
    if (concepts.length === 0) {
      // If no concepts found, return seed text with minimal voice consistency improvements
      return this.ensureVoiceConsistency(seedText, analysis);
    }
    
    // Generate extrapolated content
    let extrapolated = seedText;

    if (addDetails) {
      const detailedExpansion = this.generateDetailedExpansion(concepts, analysis);
      if (detailedExpansion && detailedExpansion.trim().length > 0) {
        extrapolated += '\n\n' + detailedExpansion;
      }
    }

    if (addExamples && expansionLevel !== 'minimal') {
      const examples = this.generateExamples(concepts, patterns);
      if (examples && examples.trim().length > 0) {
        extrapolated += '\n\n' + examples;
      }
    }

    if (expansionLevel === 'extensive') {
      const relatedConcepts = this.generateRelatedConcepts(concepts);
      if (relatedConcepts && relatedConcepts.trim().length > 0) {
        extrapolated += '\n\n' + relatedConcepts;
      }
    }

    // Ensure voice consistency
    return this.ensureVoiceConsistency(extrapolated, analysis);
  }

  /**
   * Expands a specific concept or section
   */
  expandConcept(concept: string, context: string = ''): string {
    const analysis = this.toneAnalyzer.analyzeText(context || concept);
    
    // Generate expansion using voice-appropriate language
    const expansion = this.generateConceptExpansion(concept, analysis);
    
    return expansion;
  }

  /**
   * Adds detail to existing sentences
   */
  addDetailToSentence(sentence: string): string {
    const analysis = this.toneAnalyzer.analyzeText(sentence);
    
    // Check if sentence needs more technical detail
    if (analysis.technicalTermDensity < 0.15) {
      const technicalTerm = this.selectRelevantTechnicalTerm(sentence);
      if (technicalTerm) {
        sentence = this.injectTechnicalTerm(sentence, technicalTerm);
      }
    }

    // Check if sentence needs numerical precision
    if (!analysis.numericalPrecision.hasSpecificValues) {
      const relevantValue = this.selectRelevantValue(sentence);
      if (relevantValue) {
        sentence = this.injectValue(sentence, relevantValue);
      }
    }

    return sentence;
  }

  /**
   * Generates related content based on seed text
   */
  generateRelatedContent(seedText: string, topic: string): string {
    const concepts = this.extractConcepts(seedText);
    const relatedConcepts = this.findRelatedConcepts(concepts, topic);
    
    let content = `## ${topic}\n\n`;
    
    relatedConcepts.forEach(concept => {
      content += this.generateConceptDescription(concept) + '\n\n';
    });

    return content;
  }

  private extractConcepts(text: string): string[] {
    const concepts: string[] = [];
    
    // Extract technical terms
    this.voiceProfile.characteristics.linguisticPatterns.vocabulary.technicalTerms.forEach(term => {
      if (text.toLowerCase().includes(term.toLowerCase())) {
        concepts.push(term);
      }
    });

    // Extract domain concepts
    [
      ...this.voiceProfile.characteristics.domainKnowledge.mathematicalConcepts,
      ...this.voiceProfile.characteristics.domainKnowledge.designConcepts,
      ...this.voiceProfile.characteristics.domainKnowledge.technicalConcepts
    ].forEach(concept => {
      if (text.toLowerCase().includes(concept.toLowerCase()) && !concepts.includes(concept)) {
        concepts.push(concept);
      }
    });

    return concepts;
  }

  private generateDetailedExpansion(concepts: string[], analysis: ToneAnalysis): string {
    let expansion = '## Detailed Implementation\n\n';
    
    concepts.slice(0, 3).forEach(concept => {
      expansion += this.generateConceptExpansion(concept, analysis) + '\n\n';
    });

    return expansion.trim();
  }

  private generateConceptExpansion(concept: string, analysis: ToneAnalysis): string {
    const connectingPhrase = this.selectConnectingPhrase();
    const technicalDetail = this.selectTechnicalDetail(concept);
    const value = this.selectRelevantValue(concept);

    let expansion = `The ${concept} system ${connectingPhrase} `;
    
    if (technicalDetail) {
      expansion += `${technicalDetail} `;
    }

    if (value && analysis.numericalPrecision.hasSpecificValues) {
      expansion += `with ${value} `;
    }

    expansion += `for comprehensive integration and mathematical precision.`;

    return expansion;
  }

  private generateExamples(concepts: string[], patterns: any): string {
    let examples = '### Implementation Examples\n\n';
    
    concepts.slice(0, 2).forEach(concept => {
      const example = this.textGenerator.generateListItem(concept);
      examples += example + '\n';
    });

    return examples.trim();
  }

  private generateRelatedConcepts(concepts: string[]): string {
    let related = '## Related Systems\n\n';
    
    const relatedTerms = this.findRelatedConcepts(concepts, '');
    
    relatedTerms.slice(0, 3).forEach(term => {
      related += `- **${term}**: ${this.generateBriefDescription(term)}\n`;
    });

    return related.trim();
  }

  private findRelatedConcepts(concepts: string[], topic: string): string[] {
    const allConcepts = [
      ...this.voiceProfile.characteristics.linguisticPatterns.vocabulary.technicalTerms,
      ...this.voiceProfile.characteristics.domainKnowledge.mathematicalConcepts,
      ...this.voiceProfile.characteristics.domainKnowledge.designConcepts,
      ...this.voiceProfile.characteristics.domainKnowledge.technicalConcepts
    ];

    // Find concepts that share words or are in the same domain
    const related: string[] = [];
    
    concepts.forEach(concept => {
      const conceptWords = concept.toLowerCase().split(/\s+/);
      
      allConcepts.forEach(otherConcept => {
        if (concept !== otherConcept && !related.includes(otherConcept)) {
          const otherWords = otherConcept.toLowerCase().split(/\s+/);
          const hasOverlap = conceptWords.some(word => 
            otherWords.some(otherWord => 
              word.includes(otherWord) || otherWord.includes(word)
            )
          );
          
          if (hasOverlap) {
            related.push(otherConcept);
          }
        }
      });
    });

    return related;
  }

  private ensureVoiceConsistency(text: string, analysis: ToneAnalysis): string {
    // Check voice markers using public API
    const markerPresence = analysis.voiceMarkerPresence;
    
    if (markerPresence < 0.2) {
      // Add more voice markers
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const openingPhrases = this.voiceProfile.characteristics.voiceMarkers.openingPhrases;
      if (sentences.length > 0 && openingPhrases.length > 0 && !sentences[0].toLowerCase().includes('this')) {
        const opening = openingPhrases[0];
        text = `${opening} ${text}`;
      }
    }

    return text;
  }

  private selectConnectingPhrase(): string {
    const phrases = this.voiceProfile.characteristics.voiceMarkers.connectingPhrases;
    if (!phrases || phrases.length === 0) {
      return 'provides';
    }
    return phrases[Math.floor(Math.random() * phrases.length)];
  }

  private selectTechnicalDetail(concept: string): string | null {
    const terms = this.voiceProfile.characteristics.linguisticPatterns.vocabulary.technicalTerms;
    if (!terms || terms.length === 0) {
      return null;
    }
    
    const relevant = terms.filter(term => 
      term.toLowerCase() !== concept.toLowerCase() &&
      !concept.toLowerCase().includes(term.toLowerCase())
    );
    
    if (relevant.length > 0) {
      return relevant[Math.floor(Math.random() * relevant.length)];
    }
    
    if (terms.length > 0) {
      return terms[Math.floor(Math.random() * terms.length)];
    }
    
    return null;
  }

  private selectRelevantTechnicalTerm(text: string): string | null {
    const terms = this.voiceProfile.characteristics.linguisticPatterns.vocabulary.technicalTerms;
    if (!terms || terms.length === 0) {
      return null;
    }
    
    const notPresent = terms.filter(term => !text.toLowerCase().includes(term.toLowerCase()));
    if (notPresent.length > 0) {
      return notPresent[0];
    }
    
    return terms[0];
  }

  private selectRelevantValue(context: string): number | null {
    const values = this.voiceProfile.characteristics.linguisticPatterns.numericalPrecision.commonValues;
    if (!values || values.length === 0) {
      return null;
    }
    
    // Check if context mentions angles
    if (context.toLowerCase().includes('angle') || context.toLowerCase().includes('azimuth')) {
      const angleValue = values.find(v => [23.6, 38.2, 61.8, 76.4].includes(v));
      if (angleValue !== undefined) {
        return angleValue;
      }
    }
    
    // Check if context mentions ratio or phi
    if (context.toLowerCase().includes('ratio') || context.toLowerCase().includes('phi')) {
      const ratioValue = values.find(v => [1.618, 0.618, 0.382].includes(v));
      if (ratioValue !== undefined) {
        return ratioValue;
      }
    }

    return values[Math.floor(Math.random() * values.length)];
  }

  private injectTechnicalTerm(sentence: string, term: string): string {
    // Insert before the period
    return sentence.replace(/\.$/, ` using ${term}.`);
  }

  private injectValue(sentence: string, value: number): string {
    // Add value in parentheses or as part of the sentence
    if (sentence.includes('(')) {
      return sentence.replace(/\(([^)]+)\)/, `($1, ${value})`);
    }
    return sentence.replace(/\.$/, ` (${value}).`);
  }

  private generateConceptDescription(concept: string): string {
    const connectingPhrase = this.selectConnectingPhrase();
    return `The ${concept} ${connectingPhrase} comprehensive system integration with mathematical precision.`;
  }

  private generateBriefDescription(term: string): string {
    const connectingPhrase = this.selectConnectingPhrase();
    return `${connectingPhrase} ${term} for enhanced functionality and system coherence.`;
  }

  /**
   * Extrapolates across an entire project directory
   * Processes all text-based files in a directory and extrapolates them while maintaining context
   */
  async extrapolateProject(
    projectPath: string,
    options: ProjectExtrapolationOptions = {}
  ): Promise<ProjectExtrapolationResult> {
    const {
      fileExtensions = ['.ts', '.js', '.md', '.txt', '.json', '.html', '.css'],
      excludePatterns = ['node_modules', '.git', 'dist', 'build', '.next'],
      maxFileSize = 1024 * 1024, // 1MB default
      expansionLevel = 'moderate',
      addExamples = true,
      addDetails = true,
      preserveStructure = true
    } = options;

    const results: FileExtrapolationResult[] = [];
    const allText: string[] = [];
    const filePaths = await this.collectProjectFiles(projectPath, fileExtensions, excludePatterns, maxFileSize);

    // First pass: collect all text for context analysis
    for (const filePath of filePaths) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const parsed = this.documentParser.parseContent(
          content,
          path.basename(filePath),
          this.detectFileType(path.extname(filePath))
        );
        allText.push(parsed.extractedText);
      } catch (error) {
        console.warn(`Failed to read ${filePath}:`, error);
      }
    }

    // Analyze overall project context
    const combinedText = allText.join('\n\n');
    const projectAnalysis = this.toneAnalyzer.analyzeText(combinedText);
    const projectPatterns = this.patternExtractor.extractPatterns(combinedText);
    const projectConcepts = this.extractConcepts(combinedText);

    // Second pass: extrapolate each file with project context
    for (const filePath of filePaths) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const parsed = this.documentParser.parseContent(
          content,
          path.basename(filePath),
          this.detectFileType(path.extname(filePath))
        );

        // Extrapolate with project-wide context
        const extrapolated = this.extrapolateWithContext(
          parsed.extractedText,
          {
            expansionLevel,
            addExamples,
            addDetails
          },
          {
            projectAnalysis,
            projectPatterns,
            projectConcepts,
            allFiles: allText
          }
        );

        results.push({
          filePath,
          filename: path.basename(filePath),
          originalLength: parsed.extractedText.length,
          extrapolatedLength: extrapolated.length,
          extrapolated,
          success: true
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          filePath,
          filename: path.basename(filePath),
          originalLength: 0,
          extrapolatedLength: 0,
          extrapolated: '',
          success: false,
          error: errorMessage
        });
      }
    }

    return {
      projectPath,
      totalFiles: filePaths.length,
      successfulFiles: results.filter(r => r.success).length,
      failedFiles: results.filter(r => !r.success).length,
      results,
      projectConcepts: projectConcepts.slice(0, 20), // Top 20 concepts
      overallAnalysis: {
        tone: projectAnalysis.overallMatch > 0.7 ? 'high' : projectAnalysis.overallMatch > 0.4 ? 'medium' : 'low',
        technicalTermDensity: projectAnalysis.technicalTermDensity,
        voiceMarkerPresence: projectAnalysis.voiceMarkerPresence
      }
    };
  }

  /**
   * Extrapolates with project-wide context
   */
  private extrapolateWithContext(
    seedText: string,
    options: ExtrapolationOptions,
    context: {
      projectAnalysis: ToneAnalysis;
      projectPatterns: any;
      projectConcepts: string[];
      allFiles: string[];
    }
  ): string {
    // Use project context to inform extrapolation
    const localAnalysis = this.toneAnalyzer.analyzeText(seedText);
    const localConcepts = this.extractConcepts(seedText);
    
    // Merge local and project concepts
    const allConcepts = [...new Set([...localConcepts, ...context.projectConcepts])];
    
    // Generate extrapolated content with context awareness
    let extrapolated = seedText;

    if (options.addDetails) {
      const detailedExpansion = this.generateDetailedExpansion(allConcepts, context.projectAnalysis);
      if (detailedExpansion && detailedExpansion.trim().length > 0) {
        extrapolated += '\n\n' + detailedExpansion;
      }
    }

    if (options.addExamples && options.expansionLevel !== 'minimal') {
      const examples = this.generateExamples(allConcepts, context.projectPatterns);
      if (examples && examples.trim().length > 0) {
        extrapolated += '\n\n' + examples;
      }
    }

    if (options.expansionLevel === 'extensive') {
      const relatedConcepts = this.generateRelatedConcepts(allConcepts);
      if (relatedConcepts && relatedConcepts.trim().length > 0) {
        extrapolated += '\n\n' + relatedConcepts;
      }
    }

    // Ensure voice consistency using project-wide analysis
    return this.ensureVoiceConsistency(extrapolated, context.projectAnalysis);
  }

  /**
   * Collects all relevant files from a project directory
   */
  private async collectProjectFiles(
    projectPath: string,
    extensions: string[],
    excludePatterns: string[],
    maxFileSize: number
  ): Promise<string[]> {
    const files: string[] = [];

    async function walkDir(dir: string): Promise<void> {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          // Skip excluded directories
          if (entry.isDirectory()) {
            const shouldExclude = excludePatterns.some(pattern => 
              entry.name.includes(pattern) || fullPath.includes(pattern)
            );
            if (!shouldExclude) {
              await walkDir(fullPath);
            }
            continue;
          }

          // Check file extension
          const ext = path.extname(entry.name).toLowerCase();
          if (!extensions.includes(ext)) {
            continue;
          }

          // Check file size
          try {
            const stats = await fs.stat(fullPath);
            if (stats.size > maxFileSize) {
              continue;
            }
            files.push(fullPath);
          } catch (error) {
            // Skip files we can't stat
            continue;
          }
        }
      } catch (error) {
        console.warn(`Failed to read directory ${dir}:`, error);
      }
    }

    await walkDir(projectPath);
    return files;
  }

  /**
   * Detects file type from extension
   */
  private detectFileType(ext: string): 'html' | 'markdown' | 'text' | 'json' | 'xml' | 'csv' | 'code' | 'unknown' {
    const extLower = ext.toLowerCase();
    if (['.html', '.htm'].includes(extLower)) return 'html';
    if (['.md', '.markdown'].includes(extLower)) return 'markdown';
    if (['.json'].includes(extLower)) return 'json';
    if (['.xml'].includes(extLower)) return 'xml';
    if (['.csv'].includes(extLower)) return 'csv';
    if (['.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.cpp', '.c', '.cs', '.rb', '.go', '.rs', '.php'].includes(extLower)) return 'code';
    return 'text';
  }
}

export interface ExtrapolationOptions {
  expansionLevel?: 'minimal' | 'moderate' | 'extensive';
  addExamples?: boolean;
  addDetails?: boolean;
}

export interface ProjectExtrapolationOptions extends ExtrapolationOptions {
  fileExtensions?: string[];
  excludePatterns?: string[];
  maxFileSize?: number;
  preserveStructure?: boolean;
}

export interface FileExtrapolationResult {
  filePath: string;
  filename: string;
  originalLength: number;
  extrapolatedLength: number;
  extrapolated: string;
  success: boolean;
  error?: string;
}

export interface ProjectExtrapolationResult {
  projectPath: string;
  totalFiles: number;
  successfulFiles: number;
  failedFiles: number;
  results: FileExtrapolationResult[];
  projectConcepts: string[];
  overallAnalysis: {
    tone: string;
    technicalTermDensity: number;
    voiceMarkerPresence: number;
  };
}

