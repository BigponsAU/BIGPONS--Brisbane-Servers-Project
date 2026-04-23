/**
 * Pattern Extractor
 * Extracts linguistic and structural patterns from text
 */

import type { TextPattern, SentencePattern, PhrasePattern, TerminologyPattern } from '../models/text-patterns';
import * as voiceProfileData from '../voice-profile.json';
import type { VoiceProfile } from '../models/voice-profile';

export class PatternExtractor {
  private voiceProfile: VoiceProfile;

  constructor(profile?: VoiceProfile) {
    this.voiceProfile = profile || (voiceProfileData as VoiceProfile);
  }

  /**
   * Extracts all patterns from text
   */
  extractPatterns(text: string): ExtractedPatterns {
    return {
      sentencePatterns: this.extractSentencePatterns(text),
      phrasePatterns: this.extractPhrasePatterns(text),
      terminologyPatterns: this.extractTerminologyPatterns(text),
      structuralPatterns: this.extractStructuralPatterns(text)
    };
  }

  /**
   * Extracts sentence structure patterns
   */
  private extractSentencePatterns(text: string): SentencePattern[] {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const patterns: SentencePattern[] = [];

    // Validate voice profile structure
    if (!this.voiceProfile?.characteristics?.voiceMarkers) {
      return patterns;
    }

    const openingPhrases = this.voiceProfile.characteristics.voiceMarkers.openingPhrases || [];
    const connectingPhrases = this.voiceProfile.characteristics.voiceMarkers.connectingPhrases || [];

    sentences.forEach(sentence => {
      const trimmed = sentence.trim();
      if (trimmed.length < 10) return;

      // Extract subject-verb-object patterns
      const subjectMatch = openingPhrases.length > 0
        ? openingPhrases.find(phrase => trimmed.toLowerCase().startsWith(phrase.toLowerCase()))
        : undefined;
      
      const verbMatch = connectingPhrases.length > 0
        ? connectingPhrases.find(phrase => trimmed.toLowerCase().includes(phrase.toLowerCase()))
        : undefined;

      if (subjectMatch || verbMatch) {
        patterns.push({
          structure: this.identifyStructure(trimmed),
          components: {
            subject: subjectMatch ? [subjectMatch] : [],
            verb: verbMatch ? [verbMatch] : [],
            object: this.extractObjects(trimmed),
            modifiers: this.extractModifiers(trimmed)
          },
          examples: [trimmed]
        });
      }
    });

    return patterns;
  }

  /**
   * Extracts phrase patterns
   */
  private extractPhrasePatterns(text: string): PhrasePattern[] {
    const textLower = text.toLowerCase();
    const patterns: PhrasePattern[] = [];

    // Validate voice profile structure
    if (!this.voiceProfile?.characteristics?.voiceMarkers) {
      return patterns;
    }

    // Check each category
    const categories: Array<keyof typeof this.voiceProfile.characteristics.voiceMarkers> = [
      'openingPhrases',
      'connectingPhrases',
      'emphasisPhrases',
      'closingPhrases'
    ];

    categories.forEach(category => {
      const categoryPhrases = this.voiceProfile.characteristics.voiceMarkers[category];
      if (!categoryPhrases || !Array.isArray(categoryPhrases)) {
        return;
      }

      const phrases = categoryPhrases.filter(phrase => textLower.includes(phrase.toLowerCase()));

      if (phrases.length > 0) {
        patterns.push({
          category: category.replace('Phrases', '') as PhrasePattern['category'],
          phrases,
          contexts: this.findContexts(text, phrases)
        });
      }
    });

    return patterns;
  }

  /**
   * Extracts terminology usage patterns
   */
  private extractTerminologyPatterns(text: string): TerminologyPattern[] {
    // Validate voice profile structure
    if (!this.voiceProfile?.characteristics?.linguisticPatterns?.vocabulary) {
      return [];
    }

    const technicalTerms = this.voiceProfile.characteristics.linguisticPatterns.vocabulary.technicalTerms || [];
    const descriptiveTerms = this.voiceProfile.characteristics.linguisticPatterns.vocabulary.descriptiveTerms || [];
    
    const allTerms = [
      ...technicalTerms,
      ...descriptiveTerms
    ];

    if (allTerms.length === 0) {
      return [];
    }

    const patterns: TerminologyPattern[] = [];

    allTerms.forEach(term => {
      try {
        const regex = new RegExp(`\\b${term}\\b`, 'gi');
        const matches = text.match(regex);
        
        if (matches && matches.length > 0) {
          patterns.push({
            term,
            definitions: this.findDefinitions(text, term),
            usageContexts: this.findContexts(text, [term]),
            relatedTerms: this.findRelatedTerms(text, term, allTerms),
            frequency: matches.length
          });
        }
      } catch (error) {
        // Skip invalid regex patterns
        console.warn(`Invalid regex pattern for term: ${term}`, error);
      }
    });

    return patterns.sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Extracts structural patterns
   */
  private extractStructuralPatterns(text: string): StructuralPattern {
    const lines = text.split('\n');
    const hasHeaders = lines.some(line => /^#{1,6}\s/.test(line));
    const hasLists = lines.some(line => /^[\s]*[-*+]\s/.test(line) || /^\d+\.\s/.test(line));
    const hasCodeBlocks = text.includes('```');
    const hasEmphasis = text.includes('**') || text.includes('*');

    return {
      hasHeaders,
      hasLists,
      hasCodeBlocks,
      hasEmphasis,
      hierarchyLevel: this.calculateHierarchyLevel(lines),
      listDensity: this.calculateListDensity(lines)
    };
  }

  private identifyStructure(sentence: string): string {
    if (sentence.includes(' with ') || sentence.includes(' using ')) {
      return "[Subject] [verb] [object] with [technical detail]";
    }
    if (sentence.includes(' that ') || sentence.includes(' which ')) {
      return "[Subject] [verb] [object] that [describes relationship]";
    }
    if (sentence.includes(' - ')) {
      return "[Subject] - [description]";
    }
    return "[Subject] [verb] [object]";
  }

  private extractObjects(sentence: string): string[] {
    const objects: string[] = [];
    
    // Validate voice profile structure
    if (!this.voiceProfile?.characteristics?.linguisticPatterns?.vocabulary) {
      return objects;
    }

    const technicalTerms = this.voiceProfile.characteristics.linguisticPatterns.vocabulary.technicalTerms || [];
    
    if (technicalTerms.length > 0) {
      technicalTerms.forEach(term => {
        if (sentence.toLowerCase().includes(term.toLowerCase())) {
          objects.push(term);
        }
      });
    }

    return objects;
  }

  private extractModifiers(sentence: string): string[] {
    const modifiers: string[] = [];
    
    // Validate voice profile structure
    if (!this.voiceProfile?.characteristics?.linguisticPatterns?.vocabulary) {
      return modifiers;
    }

    const descriptiveTerms = this.voiceProfile.characteristics.linguisticPatterns.vocabulary.descriptiveTerms || [];
    
    if (descriptiveTerms.length > 0) {
      descriptiveTerms.forEach(term => {
        if (sentence.toLowerCase().includes(term.toLowerCase())) {
          modifiers.push(term);
        }
      });
    }

    return modifiers;
  }

  private findContexts(text: string, phrases: string[]): string[] {
    const contexts: string[] = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

    phrases.forEach(phrase => {
      sentences.forEach(sentence => {
        if (sentence.toLowerCase().includes(phrase.toLowerCase())) {
          const context = sentence.trim().substring(0, 150);
          if (context && !contexts.includes(context)) {
            contexts.push(context);
          }
        }
      });
    });

    return contexts.slice(0, 5); // Limit to 5 contexts
  }

  private findDefinitions(text: string, term: string): string[] {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const definitions: string[] = [];

    sentences.forEach(sentence => {
      const lower = sentence.toLowerCase();
      if (lower.includes(term.toLowerCase()) && 
          (lower.includes('is') || lower.includes('are') || lower.includes('means') || lower.includes('defines'))) {
        definitions.push(sentence.trim());
      }
    });

    return definitions.slice(0, 3);
  }

  private findRelatedTerms(text: string, term: string, allTerms: string[]): string[] {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const related: string[] = [];

    sentences.forEach(sentence => {
      if (sentence.toLowerCase().includes(term.toLowerCase())) {
        allTerms.forEach(otherTerm => {
          if (otherTerm !== term && 
              sentence.toLowerCase().includes(otherTerm.toLowerCase()) &&
              !related.includes(otherTerm)) {
            related.push(otherTerm);
          }
        });
      }
    });

    return related.slice(0, 5);
  }

  private calculateHierarchyLevel(lines: string[]): number {
    let maxLevel = 0;
    lines.forEach(line => {
      const match = line.match(/^(#{1,6})\s/);
      if (match) {
        maxLevel = Math.max(maxLevel, match[1].length);
      }
    });
    return maxLevel;
  }

  private calculateListDensity(lines: string[]): number {
    const listLines = lines.filter(line => 
      /^[\s]*[-*+]\s/.test(line) || /^\d+\.\s/.test(line)
    ).length;
    return lines.length > 0 ? listLines / lines.length : 0;
  }
}

export interface ExtractedPatterns {
  sentencePatterns: SentencePattern[];
  phrasePatterns: PhrasePattern[];
  terminologyPatterns: TerminologyPattern[];
  structuralPatterns: StructuralPattern;
}

export interface StructuralPattern {
  hasHeaders: boolean;
  hasLists: boolean;
  hasCodeBlocks: boolean;
  hasEmphasis: boolean;
  hierarchyLevel: number;
  listDensity: number;
}

