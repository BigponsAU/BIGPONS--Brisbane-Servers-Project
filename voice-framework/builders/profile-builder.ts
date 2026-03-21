/**
 * Profile Builder
 * Automatically generates voice profiles from text samples
 */

import { VoiceProfile, VoiceCharacteristics, ToneProfile, LinguisticPatterns, Vocabulary, NumericalPrecision, StructuralPatterns, Organization, ContentFlow, DomainKnowledge, VoiceMarkers, SemanticDensity, ExtrapolationGuidelines } from '../models/voice-profile';
import { ToneAnalyzer } from '../analyzers/tone-analyzer';
import { PatternExtractor } from '../analyzers/pattern-extractor';
import { TextStorage, TextSample } from '../storage/text-storage';
import { PannedTruth } from '../analyzers/panner';
import { DocumentVector } from '../storage/vector-storage';

export interface ProfileBuilderOptions {
  name: string;
  description?: string;
  sourceDocument?: string;
  includeExamples?: boolean;
  minSamples?: number;
}

export class ProfileBuilder {
  private toneAnalyzer: ToneAnalyzer;
  private patternExtractor: PatternExtractor;

  constructor() {
    this.toneAnalyzer = new ToneAnalyzer();
    this.patternExtractor = new PatternExtractor();
  }

  /**
   * Build a profile from text samples
   */
  async buildFromSamples(
    samples: string[] | TextSample[],
    options: ProfileBuilderOptions
  ): Promise<VoiceProfile> {
    if (samples.length === 0) {
      throw new Error('At least one text sample is required');
    }

    // Convert TextSample[] to string[] if needed
    const textSamples = samples.map(s => typeof s === 'string' ? s : s.text);
    const combinedText = textSamples.join('\n\n');

    // Analyze all samples
    const analyses = textSamples.map(text => this.toneAnalyzer.analyzeText(text));
    const patterns = textSamples.map(text => this.patternExtractor.extractPatterns(text));

    // Build characteristics
    const characteristics = this.buildCharacteristics(analyses, patterns, combinedText);

    // Build extrapolation guidelines
    const extrapolationGuidelines = this.buildExtrapolationGuidelines(characteristics);

    const profile: VoiceProfile = {
      voiceName: options.name,
      version: '1.0.0',
      sourceDocument: options.sourceDocument || 'generated',
      characteristics,
      extrapolationGuidelines
    };

    return profile;
  }

  /**
   * Build characteristics from analyses
   */
  private buildCharacteristics(
    analyses: any[],
    patterns: any[],
    combinedText: string
  ): VoiceCharacteristics {
    // Aggregate tone metrics
    const avgTechnicalDensity = analyses.reduce((sum, a) => sum + a.technicalTermDensity, 0) / analyses.length;
    const avgVocabularyMatch = analyses.reduce((sum, a) => sum + a.vocabularyMatch, 0) / analyses.length;
    const avgMarkerPresence = analyses.reduce((sum, a) => sum + a.voiceMarkerPresence, 0) / analyses.length;
    const hasNumericalPrecision = analyses.some(a => a.numericalPrecision.hasSpecificValues);
    const avgSentenceLength = analyses.reduce((sum, a) => sum + a.sentenceComplexity.averageLength, 0) / analyses.length;

    // Build tone profile
    const tone: ToneProfile = {
      formality: this.determineFormality(analyses, combinedText),
      technicality: this.determineTechnicality(avgTechnicalDensity),
      accessibility: this.determineAccessibility(avgSentenceLength, avgTechnicalDensity),
      precision: hasNumericalPrecision ? 'very_high' : avgTechnicalDensity > 0.3 ? 'high' : 'moderate',
      comprehensiveness: this.determineComprehensiveness(combinedText, patterns)
    };

    // Extract vocabulary
    const vocabulary = this.extractVocabulary(combinedText, patterns);

    // Extract numerical precision patterns
    const numericalPrecision = this.extractNumericalPrecision(analyses, combinedText);

    // Build linguistic patterns
    const linguisticPatterns: LinguisticPatterns = {
      sentenceStructure: {
        averageLength: this.determineSentenceLength(avgSentenceLength),
        complexity: this.determineComplexity(analyses),
        preference: this.determineSentencePreference(combinedText),
        coordination: this.determineCoordination(combinedText)
      },
      vocabulary,
      numericalPrecision
    };

    // Build structural patterns
    const structuralPatterns: StructuralPatterns = {
      organization: this.extractOrganization(combinedText, patterns),
      contentFlow: this.extractContentFlow(combinedText, patterns)
    };

    // Extract domain knowledge
    const domainKnowledge = this.extractDomainKnowledge(combinedText);

    // Extract voice markers
    const voiceMarkers = this.extractVoiceMarkers(combinedText, patterns);

    // Determine semantic density
    const semanticDensity: SemanticDensity = {
      informationPerSentence: this.determineInformationDensity(combinedText, analyses),
      technicalTermsPerParagraph: this.determineTechnicalDensity(avgTechnicalDensity),
      specificity: hasNumericalPrecision ? 'very_high' : avgTechnicalDensity > 0.2 ? 'high' : 'moderate',
      abstraction: avgTechnicalDensity > 0.3 ? 'high' : avgTechnicalDensity > 0.1 ? 'moderate' : 'low'
    };

    return {
      tone,
      linguisticPatterns,
      structuralPatterns,
      domainKnowledge,
      voiceMarkers,
      semanticDensity
    };
  }

  /**
   * Extract vocabulary from text
   */
  private extractVocabulary(text: string, patterns: any[]): Vocabulary {
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    const wordFreq = new Map<string, number>();
    
    words.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });

    // Technical terms (longer, less common words)
    const technicalTerms = Array.from(wordFreq.entries())
      .filter(([word, freq]) => word.length > 6 && freq < words.length * 0.01)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word]) => word);

    // Descriptive terms (adjectives and descriptive nouns)
    const descriptiveTerms = Array.from(wordFreq.entries())
      .filter(([word, freq]) => word.length > 5 && freq > words.length * 0.001)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([word]) => word);

    // Relationship terms (verbs that indicate relationships)
    const relationshipVerbs = ['creates', 'provides', 'ensures', 'maintains', 'affects', 'forms', 'uses', 'integrates'];
    const relationshipTerms = relationshipVerbs.filter(verb => text.toLowerCase().includes(verb));

    return {
      technicalTerms: [...new Set(technicalTerms)],
      descriptiveTerms: [...new Set(descriptiveTerms)],
      relationshipTerms: [...new Set(relationshipTerms)]
    };
  }

  /**
   * Extract numerical precision patterns
   */
  private extractNumericalPrecision(analyses: any[], text: string): NumericalPrecision {
    const allValues: number[] = [];
    analyses.forEach(a => {
      allValues.push(...a.numericalPrecision.values);
    });

    // Find common values (appearing multiple times)
    const valueFreq = new Map<number, number>();
    allValues.forEach(val => {
      const rounded = Math.round(val * 100) / 100;
      valueFreq.set(rounded, (valueFreq.get(rounded) || 0) + 1);
    });

    const commonValues = Array.from(valueFreq.entries())
      .filter(([_, freq]) => freq > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([val]) => val);

    return {
      specificValues: allValues.length > 0,
      commonValues: commonValues.length > 0 ? commonValues : allValues.slice(0, 10),
      formatting: this.detectNumberFormatting(text),
      units: this.extractUnits(text)
    };
  }

  /**
   * Extract organization patterns
   */
  private extractOrganization(text: string, patterns: any[]): Organization {
    const hasHeaders = /^#{1,6}\s/m.test(text);
    const hasSections = /^##\s/m.test(text);
    const hasSubsections = /^###\s/m.test(text);
    const listMatches = (text.match(/^[\s]*[-*+]\s/gm) || []).length;
    const bulletMatches = (text.match(/^[\s]*[-*]\s/gm) || []).length;
    const totalLines = text.split('\n').length;

    const listFrequency = totalLines > 0 ? listMatches / totalLines : 0;
    const listLevel = listFrequency > 0.1 ? 'very_frequent' : 
                     listFrequency > 0.05 ? 'frequent' : 
                     listFrequency > 0.01 ? 'occasional' : 'rare';

    return {
      hierarchical: hasHeaders || hasSections,
      sections: hasSections,
      subsections: hasSubsections,
      lists: listLevel,
      bulletPoints: listLevel
    };
  }

  /**
   * Extract content flow patterns
   */
  private extractContentFlow(text: string, patterns: any[]): ContentFlow {
    const lines = text.split('\n');
    const firstParagraph = lines.slice(0, 10).join(' ').toLowerCase();
    
    return {
      overviewFirst: firstParagraph.includes('overview') || firstParagraph.includes('introduction') || firstParagraph.length < 200,
      detailsAfter: text.length > 500,
      examplesProvided: text.includes('example') || text.includes('for instance') || text.includes('such as'),
      conclusions: text.includes('conclusion') || text.includes('summary') || text.includes('in summary')
    };
  }

  /**
   * Extract domain knowledge
   */
  private extractDomainKnowledge(text: string): DomainKnowledge {
    const textLower = text.toLowerCase();
    
    // Mathematical concepts
    const mathKeywords = ['ratio', 'angle', 'function', 'transform', 'sequence', 'formula', 'equation', 'calculation'];
    const mathematicalConcepts = mathKeywords.filter(kw => textLower.includes(kw));

    // Design concepts
    const designKeywords = ['design', 'layout', 'color', 'typography', 'spacing', 'visual', 'aesthetic', 'style'];
    const designConcepts = designKeywords.filter(kw => textLower.includes(kw));

    // Technical concepts
    const techKeywords = ['system', 'component', 'module', 'interface', 'api', 'data', 'algorithm', 'process'];
    const technicalConcepts = techKeywords.filter(kw => textLower.includes(kw));

    return {
      mathematicalConcepts: [...new Set(mathematicalConcepts)],
      designConcepts: [...new Set(designConcepts)],
      technicalConcepts: [...new Set(technicalConcepts)]
    };
  }

  /**
   * Extract voice markers
   */
  private extractVoiceMarkers(text: string, patterns: any[]): VoiceMarkers {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Opening phrases (first words of sentences)
    const openingPhrases = sentences
      .slice(0, 10)
      .map(s => s.trim().split(/\s+/).slice(0, 3).join(' '))
      .filter(phrase => phrase.length > 5)
      .slice(0, 5);

    // Connecting phrases
    const connectingPhrases = ['however', 'therefore', 'furthermore', 'additionally', 'moreover', 'consequently']
      .filter(phrase => text.toLowerCase().includes(phrase));

    // Emphasis phrases
    const emphasisPhrases = ['important', 'critical', 'essential', 'key', 'significant', 'notable']
      .filter(phrase => text.toLowerCase().includes(phrase));

    // Closing phrases (last words of sentences)
    const closingPhrases = sentences
      .slice(-5)
      .map(s => s.trim().split(/\s+/).slice(-3).join(' '))
      .filter(phrase => phrase.length > 5)
      .slice(0, 5);

    return {
      openingPhrases: [...new Set(openingPhrases)],
      connectingPhrases: [...new Set(connectingPhrases)],
      emphasisPhrases: [...new Set(emphasisPhrases)],
      closingPhrases: [...new Set(closingPhrases)]
    };
  }

  /**
   * Build extrapolation guidelines
   */
  private buildExtrapolationGuidelines(characteristics: VoiceCharacteristics): ExtrapolationGuidelines {
    return {
      maintainPrecision: characteristics.tone.precision === 'very_high' || characteristics.tone.precision === 'high',
      useDomainTerms: characteristics.tone.technicality === 'high' || characteristics.tone.technicality === 'very_high',
      preserveStructure: characteristics.structuralPatterns.organization.hierarchical,
      extendConcepts: true,
      maintainRelationships: true,
      addSpecificValues: characteristics.linguisticPatterns.numericalPrecision.specificValues
    };
  }

  // Helper methods for determining characteristics
  private determineFormality(analyses: any[], text: string): 'casual' | 'professional' | 'formal' {
    const casualMarkers = ['hey', 'cool', 'awesome', 'gonna', 'wanna'];
    const formalMarkers = ['therefore', 'furthermore', 'consequently', 'hence'];
    
    const textLower = text.toLowerCase();
    if (casualMarkers.some(m => textLower.includes(m))) return 'casual';
    if (formalMarkers.some(m => textLower.includes(m))) return 'formal';
    return 'professional';
  }

  private determineTechnicality(density: number): 'low' | 'moderate' | 'high' | 'very_high' {
    if (density > 0.3) return 'very_high';
    if (density > 0.15) return 'high';
    if (density > 0.05) return 'moderate';
    return 'low';
  }

  private determineAccessibility(avgLength: number, techDensity: number): 'low' | 'moderate' | 'high' {
    if (avgLength > 25 && techDensity > 0.2) return 'low';
    if (avgLength > 20 || techDensity > 0.1) return 'moderate';
    return 'high';
  }

  private determineComprehensiveness(text: string, patterns: any[]): 'low' | 'moderate' | 'high' | 'very_high' {
    const wordCount = text.split(/\s+/).length;
    const hasStructure = patterns.some(p => p.hasHierarchy);
    
    if (wordCount > 2000 && hasStructure) return 'very_high';
    if (wordCount > 1000) return 'high';
    if (wordCount > 500) return 'moderate';
    return 'low';
  }

  private determineSentenceLength(avgLength: number): 'short' | 'medium' | 'medium_to_long' | 'long' {
    if (avgLength > 25) return 'long';
    if (avgLength > 18) return 'medium_to_long';
    if (avgLength > 12) return 'medium';
    return 'short';
  }

  private determineComplexity(analyses: any[]): 'low' | 'moderate' | 'moderate_to_high' | 'high' {
    const avgComplex = analyses.reduce((sum, a) => {
      const level = a.sentenceComplexity.complexityLevel;
      const value = level === 'high' ? 3 : level === 'moderate' ? 2 : 1;
      return sum + value;
    }, 0) / analyses.length;

    if (avgComplex > 2.5) return 'high';
    if (avgComplex > 2) return 'moderate_to_high';
    if (avgComplex > 1.5) return 'moderate';
    return 'low';
  }

  private determineSentencePreference(text: string): 'declarative_statements' | 'questions' | 'imperatives' | 'mixed' {
    const questions = (text.match(/\?/g) || []).length;
    const imperatives = (text.match(/^(do|make|create|use|ensure|provide)\s/gi) || []).length;
    const totalSentences = (text.match(/[.!?]+/g) || []).length;

    if (totalSentences === 0) return 'declarative_statements';
    const questionRatio = questions / totalSentences;
    const imperativeRatio = imperatives / totalSentences;

    if (questionRatio > 0.2) return 'questions';
    if (imperativeRatio > 0.2) return 'imperatives';
    if (questionRatio > 0.05 || imperativeRatio > 0.05) return 'mixed';
    return 'declarative_statements';
  }

  private determineCoordination(text: string): string {
    const commas = (text.match(/,/g) || []).length;
    const semicolons = (text.match(/;/g) || []).length;
    const sentences = (text.match(/[.!?]+/g) || []).length;

    if (sentences === 0) return 'unknown';
    const commaRatio = commas / sentences;
    const semicolonRatio = semicolons / sentences;

    if (commaRatio > 3 || semicolonRatio > 0.5) return 'frequent_use_of_commas_and_semicolons';
    if (commaRatio > 1.5) return 'moderate_use_of_commas';
    return 'minimal_coordination';
  }

  private determineInformationDensity(text: string, analyses: any[]): 'low' | 'moderate' | 'high' | 'very_high' {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).length;
    const avgWordsPerSentence = words / sentences.length;
    const avgTechDensity = analyses.reduce((sum, a) => sum + a.technicalTermDensity, 0) / analyses.length;

    if (avgWordsPerSentence > 20 && avgTechDensity > 0.2) return 'very_high';
    if (avgWordsPerSentence > 15 || avgTechDensity > 0.1) return 'high';
    if (avgWordsPerSentence > 10) return 'moderate';
    return 'low';
  }

  private determineTechnicalDensity(density: number): 'low' | 'moderate' | 'high' | 'very_high' {
    return this.determineTechnicality(density);
  }

  private detectNumberFormatting(text: string): string {
    if (text.match(/\d+\.\d{3,}/)) return 'decimal_with_precision';
    if (text.match(/\d+\.\d{1,2}/)) return 'decimal_with_precision';
    if (text.match(/\d+/)) return 'integer';
    return 'unknown';
  }

  private extractUnits(text: string): string[] {
    const unitPatterns = [
      /\d+\s*(degrees?|°)/gi,
      /\d+\s*(percent|%)/gi,
      /\d+\s*(pixels?|px)/gi,
      /\d+\s*(ratios?)/gi
    ];

    const units: string[] = [];
    unitPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        const unit = matches[0].replace(/\d+\s*/i, '').trim();
        if (unit && !units.includes(unit.toLowerCase())) {
          units.push(unit.toLowerCase());
        }
      }
    });

    return units;
  }

  /**
   * Build a profile from panned truths (gold truths)
   * Converts panned truths to text samples and uses existing buildFromSamples logic
   */
  async buildFromPannedTruths(
    pannedTruths: PannedTruth[],
    options: ProfileBuilderOptions
  ): Promise<VoiceProfile> {
    if (pannedTruths.length === 0) {
      throw new Error('At least one panned truth is required');
    }

    // Convert panned truths to text samples
    // Combine claims, contexts, and supporting evidence into coherent text
    const textSamples = pannedTruths.map(truth => {
      const parts: string[] = [];
      
      // Add the main claim
      parts.push(truth.claim);
      
      // Add context if available
      if (truth.context) {
        parts.push(truth.context);
      }
      
      // Add supporting evidence
      if (truth.supportingEvidence && truth.supportingEvidence.length > 0) {
        parts.push(...truth.supportingEvidence);
      }
      
      // Add extracted from snippet
      if (truth.extractedFrom) {
        parts.push(truth.extractedFrom);
      }
      
      return parts.join('. ');
    });

    // Use existing buildFromSamples method
    return this.buildFromSamples(textSamples, options);
  }

  /**
   * Build a profile from a vectorized document
   * Uses the original text from the vector with existing buildFromSamples logic
   */
  async buildFromVectorizedDocument(
    vector: DocumentVector,
    options: ProfileBuilderOptions
  ): Promise<VoiceProfile> {
    if (!vector.text || vector.text.trim().length === 0) {
      throw new Error('Vector must contain text');
    }

    // Use the original text from the vector
    // This represents the whole document, so we use it as a single sample
    return this.buildFromSamples([vector.text], options);
  }
}

