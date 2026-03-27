/**
 * Shredder - Objective Truth Analyzer
 * 
 * Analyzes input text objectively without bias from the owner's voice profile.
 * Extracts factual truths, claims, and assertions from the received content.
 * "Tails to the truths of that which it receives" - follows the actual content
 * rather than applying external voice characteristics.
 */

export interface ShreddedTruth {
  id: string;
  claim: string;
  type: 'fact' | 'assertion' | 'definition' | 'relationship' | 'process' | 'property' | 'value';
  confidence: number; // 0-1, how certain the shredder is about this truth
  context?: string;
  supportingEvidence?: string[];
  extractedFrom: string; // Original text snippet
  metadata?: {
    numericalValues?: number[];
    entities?: string[];
    relationships?: string[];
    temporal?: string;
    conditional?: boolean;
  };
}

export interface ShredderAnalysis {
  input: string;
  truths: ShreddedTruth[];
  summary: {
    totalTruths: number;
    factCount: number;
    assertionCount: number;
    definitionCount: number;
    averageConfidence: number;
    keyEntities: string[];
    keyValues: number[];
  };
  objectiveVoice: {
    tone: 'neutral' | 'technical' | 'descriptive' | 'analytical' | 'mixed';
    formality: number; // 0-1
    precision: number; // 0-1
    complexity: number; // 0-1
  };
}

export class Shredder {
  private truthIdCounter: number = 0;

  /**
   * Shred the input text - extract objective truths without owner bias
   */
  shred(input: string): ShredderAnalysis {
    const truths: ShreddedTruth[] = [];
    const sentences = this.splitIntoSentences(input);
    
    // Extract truths from each sentence
    for (const sentence of sentences) {
      const sentenceTruths = this.extractTruthsFromSentence(sentence.trim());
      truths.push(...sentenceTruths);
    }

    // Analyze objective voice characteristics (not applying owner's profile)
    const objectiveVoice = this.analyzeObjectiveVoice(input);

    // Generate summary
    const summary = this.generateSummary(truths);

    return {
      input,
      truths,
      summary,
      objectiveVoice
    };
  }

  /**
   * Extract multiple truths from a single sentence
   */
  private extractTruthsFromSentence(sentence: string): ShreddedTruth[] {
    const truths: ShreddedTruth[] = [];

    if (!sentence || sentence.length < 3) {
      return truths;
    }

    // Extract numerical facts
    const numericalTruths = this.extractNumericalTruths(sentence);
    truths.push(...numericalTruths);

    // Extract definitions
    const definitions = this.extractDefinitions(sentence);
    truths.push(...definitions);

    // Extract relationships
    const relationships = this.extractRelationships(sentence);
    truths.push(...relationships);

    // Extract processes/actions
    const processes = this.extractProcesses(sentence);
    truths.push(...processes);

    // Extract properties/attributes
    const properties = this.extractProperties(sentence);
    truths.push(...properties);

    // Extract assertions/claims
    const assertions = this.extractAssertions(sentence);
    truths.push(...assertions);

    return truths;
  }

  /**
   * Extract numerical facts and values
   */
  private extractNumericalTruths(sentence: string): ShreddedTruth[] {
    const truths: ShreddedTruth[] = [];
    
    // Match numbers (integers, decimals, percentages, angles, etc.)
    const numberPattern = /(\d+\.?\d*)\s*(°|%|degrees?|percent|ratio|phi|pi)?/gi;
    const matches = [...sentence.matchAll(numberPattern)];
    
    for (const match of matches) {
      const value = parseFloat(match[1]);
      const unit = match[2]?.toLowerCase() || '';
      
      // Extract context around the number
      const contextStart = Math.max(0, match.index! - 30);
      const contextEnd = Math.min(sentence.length, match.index! + match[0].length + 30);
      const context = sentence.substring(contextStart, contextEnd).trim();

      truths.push({
        id: `truth-${++this.truthIdCounter}`,
        claim: `${value}${unit ? ' ' + unit : ''}`,
        type: 'value',
        confidence: 1.0, // Numbers are highly certain
        context,
        extractedFrom: sentence,
        metadata: {
          numericalValues: [value],
          entities: this.extractEntities(context)
        }
      });
    }

    return truths;
  }

  /**
   * Extract definitions (X is Y, X means Y, X refers to Y)
   */
  private extractDefinitions(sentence: string): ShreddedTruth[] {
    const truths: ShreddedTruth[] = [];
    
    const definitionPatterns = [
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:is|are|means?|refers?\s+to|denotes?|represents?)\s+(.+?)(?:\.|$)/gi,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*:\s*(.+?)(?:\.|$)/gi,
      /(?:define|definition of)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:as|is)\s+(.+?)(?:\.|$)/gi
    ];

    for (const pattern of definitionPatterns) {
      const matches = [...sentence.matchAll(pattern)];
      for (const match of matches) {
        const term = match[1].trim();
        const definition = match[2].trim();

        truths.push({
          id: `truth-${++this.truthIdCounter}`,
          claim: `${term} is ${definition}`,
          type: 'definition',
          confidence: 0.9,
          context: sentence,
          extractedFrom: sentence,
          metadata: {
            entities: [term, ...this.extractEntities(definition)]
          }
        });
      }
    }

    return truths;
  }

  /**
   * Extract relationships (X uses Y, X creates Y, X employs Y)
   */
  private extractRelationships(sentence: string): ShreddedTruth[] {
    const truths: ShreddedTruth[] = [];
    
    const relationshipVerbs = [
      'uses', 'employs', 'utilizes', 'creates', 'generates', 'produces',
      'contains', 'includes', 'comprises', 'consists of', 'has', 'contains',
      'relates to', 'connects', 'links', 'associates', 'correlates',
      'depends on', 'requires', 'needs', 'involves'
    ];

    const relationshipPattern = new RegExp(
      `([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\\s+(${relationshipVerbs.join('|')})\\s+(.+?)(?:\\.|,|$)`,
      'gi'
    );

    const matches = [...sentence.matchAll(relationshipPattern)];
    for (const match of matches) {
      const subject = match[1].trim();
      const verb = match[2].toLowerCase();
      const object = match[3].trim();

      truths.push({
        id: `truth-${++this.truthIdCounter}`,
        claim: `${subject} ${verb} ${object}`,
        type: 'relationship',
        confidence: 0.85,
        context: sentence,
        extractedFrom: sentence,
        metadata: {
          entities: [subject, ...this.extractEntities(object)],
          relationships: [verb]
        }
      });
    }

    return truths;
  }

  /**
   * Extract processes/actions
   */
  private extractProcesses(sentence: string): ShreddedTruth[] {
    const truths: ShreddedTruth[] = [];
    
    const processPatterns = [
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:to\s+)?(?:create|generate|produce|build|construct|form|establish|develop|design|implement)(?:\s+(.+?))?(?:\.|$)/gi,
      /(?:process|method|technique|approach|system)\s+(?:of|for)\s+(.+?)(?:\.|$)/gi
    ];

    for (const pattern of processPatterns) {
      const matches = [...sentence.matchAll(pattern)];
      for (const match of matches) {
        const process = match[0].trim();

        truths.push({
          id: `truth-${++this.truthIdCounter}`,
          claim: process,
          type: 'process',
          confidence: 0.8,
          context: sentence,
          extractedFrom: sentence,
          metadata: {
            entities: this.extractEntities(process)
          }
        });
      }
    }

    return truths;
  }

  /**
   * Extract properties/attributes
   */
  private extractProperties(sentence: string): ShreddedTruth[] {
    const truths: ShreddedTruth[] = [];
    
    const propertyPatterns = [
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:has|possesses|exhibits|shows|displays)\s+(?:a\s+)?(?:property\s+of\s+)?(.+?)(?:\.|$)/gi,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:with|having)\s+(.+?)(?:\.|$)/gi,
      /(?:property|attribute|characteristic|feature)\s+(?:of|in)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:is|are)\s+(.+?)(?:\.|$)/gi
    ];

    for (const pattern of propertyPatterns) {
      const matches = [...sentence.matchAll(pattern)];
      for (const match of matches) {
        const entity = match[1]?.trim() || 'entity';
        const property = match[2]?.trim() || match[1]?.trim();

        truths.push({
          id: `truth-${++this.truthIdCounter}`,
          claim: `${entity} has property: ${property}`,
          type: 'property',
          confidence: 0.75,
          context: sentence,
          extractedFrom: sentence,
          metadata: {
            entities: [entity, ...this.extractEntities(property)]
          }
        });
      }
    }

    return truths;
  }

  /**
   * Extract assertions/claims (statements of fact)
   */
  private extractAssertions(sentence: string): ShreddedTruth[] {
    const truths: ShreddedTruth[] = [];
    
    // If sentence doesn't match other patterns but contains substantial content
    if (sentence.length > 20 && !sentence.match(/^(the|a|an)\s+/i)) {
      // Check if it's a declarative statement
      const isDeclarative = /^[A-Z][^.!?]*[.!?]$/.test(sentence);
      
      if (isDeclarative) {
        truths.push({
          id: `truth-${++this.truthIdCounter}`,
          claim: sentence,
          type: 'assertion',
          confidence: 0.7, // Lower confidence for general assertions
          context: sentence,
          extractedFrom: sentence,
          metadata: {
            entities: this.extractEntities(sentence)
          }
        });
      }
    }

    return truths;
  }

  /**
   * Extract entities (capitalized terms, technical terms)
   */
  private extractEntities(text: string): string[] {
    const entities: string[] = [];
    
    // Extract capitalized terms (likely proper nouns or technical terms)
    const capitalizedPattern = /[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g;
    const matches = [...text.matchAll(capitalizedPattern)];
    
    for (const match of matches) {
      const entity = match[0].trim();
      // Filter out common words
      if (!['The', 'This', 'That', 'These', 'Those', 'A', 'An'].includes(entity)) {
        entities.push(entity);
      }
    }

    return [...new Set(entities)]; // Remove duplicates
  }

  /**
   * Analyze objective voice characteristics (not applying owner's profile)
   */
  private analyzeObjectiveVoice(text: string): ShredderAnalysis['objectiveVoice'] {
    const words = text.toLowerCase().split(/\s+/);
    const sentences = this.splitIntoSentences(text);
    
    // Determine tone
    let tone: 'neutral' | 'technical' | 'descriptive' | 'analytical' | 'mixed' = 'neutral';
    
    const technicalTerms = words.filter(w => 
      /^(system|function|process|method|technique|algorithm|parameter|variable|component|module|interface|protocol|framework|architecture)$/i.test(w)
    ).length;
    
    const descriptiveTerms = words.filter(w =>
      /^(create|generate|produce|build|form|establish|develop|design|implement|utilize|employ)$/i.test(w)
    ).length;
    
    if (technicalTerms > words.length * 0.1) {
      tone = 'technical';
    } else if (descriptiveTerms > words.length * 0.1) {
      tone = 'descriptive';
    } else if (text.match(/(?:analyze|analysis|examine|evaluate|assess|compare|contrast)/i)) {
      tone = 'analytical';
    } else if (technicalTerms > 0 || descriptiveTerms > 0) {
      tone = 'mixed';
    }

    // Calculate formality (based on formal language patterns)
    const formalMarkers = (text.match(/\b(?:utilize|employ|facilitate|implement|establish|comprise|constitute)\b/gi) || []).length;
    const informalMarkers = (text.match(/\b(?:use|make|get|put|go|do|say)\b/gi) || []).length;
    const formality = Math.min(1, (formalMarkers / (formalMarkers + informalMarkers + 1)));

    // Calculate precision (based on numerical values, specific terms)
    const numbers = (text.match(/\d+\.?\d*/g) || []).length;
    const specificTerms = (text.match(/\b(?:exactly|precisely|specifically|namely|i\.e\.|e\.g\.)\b/gi) || []).length;
    const precision = Math.min(1, (numbers * 0.1 + specificTerms * 0.2));

    // Calculate complexity (based on sentence length, technical terms)
    const avgSentenceLength = words.length / (sentences.length || 1);
    const complexity = Math.min(1, (avgSentenceLength / 30) * 0.5 + (technicalTerms / words.length) * 0.5);

    return {
      tone,
      formality,
      precision,
      complexity
    };
  }

  /**
   * Generate summary of extracted truths
   */
  private generateSummary(truths: ShreddedTruth[]): ShredderAnalysis['summary'] {
    const factCount = truths.filter(t => t.type === 'fact' || t.type === 'value').length;
    const assertionCount = truths.filter(t => t.type === 'assertion').length;
    const definitionCount = truths.filter(t => t.type === 'definition').length;
    
    const averageConfidence = truths.length > 0
      ? truths.reduce((sum, t) => sum + t.confidence, 0) / truths.length
      : 0;

    // Extract all entities
    const allEntities = new Set<string>();
    truths.forEach(t => {
      t.metadata?.entities?.forEach(e => allEntities.add(e));
    });
    const keyEntities = Array.from(allEntities).slice(0, 10);

    // Extract all numerical values
    const allValues = new Set<number>();
    truths.forEach(t => {
      t.metadata?.numericalValues?.forEach(v => allValues.add(v));
    });
    const keyValues = Array.from(allValues).slice(0, 10);

    return {
      totalTruths: truths.length,
      factCount,
      assertionCount,
      definitionCount,
      averageConfidence,
      keyEntities,
      keyValues
    };
  }

  /**
   * Split text into sentences
   */
  private splitIntoSentences(text: string): string[] {
    return text
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  /**
   * Compare shredded truths from multiple sources
   */
  compareTruths(analysis1: ShredderAnalysis, analysis2: ShredderAnalysis): {
    commonTruths: ShreddedTruth[];
    uniqueToFirst: ShreddedTruth[];
    uniqueToSecond: ShreddedTruth[];
    conflicts: Array<{ truth1: ShreddedTruth; truth2: ShreddedTruth; reason: string }>;
  } {
    const commonTruths: ShreddedTruth[] = [];
    const uniqueToFirst: ShreddedTruth[] = [];
    const uniqueToSecond: ShreddedTruth[] = [];
    const conflicts: Array<{ truth1: ShreddedTruth; truth2: ShreddedTruth; reason: string }> = [];

    // Simple comparison based on claim similarity
    for (const truth1 of analysis1.truths) {
      let found = false;
      for (const truth2 of analysis2.truths) {
        const similarity = this.calculateSimilarity(truth1.claim, truth2.claim);
        if (similarity > 0.8) {
          found = true;
          commonTruths.push(truth1);
          
          // Check for conflicts
          if (this.isConflicting(truth1, truth2)) {
            conflicts.push({
              truth1,
              truth2,
              reason: 'Contradictory claims detected'
            });
          }
          break;
        }
      }
      if (!found) {
        uniqueToFirst.push(truth1);
      }
    }

    // Find truths unique to second analysis
    for (const truth2 of analysis2.truths) {
      let found = false;
      for (const truth1 of analysis1.truths) {
        const similarity = this.calculateSimilarity(truth1.claim, truth2.claim);
        if (similarity > 0.8) {
          found = true;
          break;
        }
      }
      if (!found) {
        uniqueToSecond.push(truth2);
      }
    }

    return {
      commonTruths,
      uniqueToFirst,
      uniqueToSecond,
      conflicts
    };
  }

  /**
   * Calculate similarity between two strings (simple Jaccard similarity)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.toLowerCase().split(/\s+/));
    const words2 = new Set(str2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Check if two truths are conflicting
   */
  private isConflicting(truth1: ShreddedTruth, truth2: ShreddedTruth): boolean {
    // Simple conflict detection - can be enhanced
    const negationWords = ['not', 'no', 'never', 'none', 'without', 'lacks', 'missing'];
    const hasNegation1 = negationWords.some(word => truth1.claim.toLowerCase().includes(word));
    const hasNegation2 = negationWords.some(word => truth2.claim.toLowerCase().includes(word));
    
    return hasNegation1 !== hasNegation2 && this.calculateSimilarity(truth1.claim, truth2.claim) > 0.6;
  }
}

