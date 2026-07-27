/**
 * Tone Analyzer
 * Analyzes text to extract tone characteristics and match against voice profile
 */

import type { VoiceProfile, VoiceCharacteristics } from '../models/voice-profile';
import * as voiceProfileData from '../voice-profile.json';

/** Golden-ratio / design-system numbers — must not drive consulting ranking. */
const DESIGN_RATIO_VALUES = new Set([1.618, 0.618, 0.382, 38.2, 61.8, 23.6, 76.4]);

const DESIGN_JARGON_RE =
  /\b(cipher|fourier|wave\s+function|golden\s+ratio|phi|vectorized|permutation|mathematical\s+precision)\b/i;

export class ToneAnalyzer {
  private voiceProfile: VoiceProfile;

  constructor(profile?: VoiceProfile) {
    this.voiceProfile = profile || (voiceProfileData as VoiceProfile);
  }

  private isDesignSystemProfile(): boolean {
    return (this.voiceProfile.voiceName ?? '').toLowerCase().includes('design system');
  }

  /**
   * Analyzes text and returns tone characteristics
   */
  analyzeText(text: string): ToneAnalysis {
    const sentences = this.extractSentences(text);
    const words = this.extractWords(text);
    
    return {
      technicalTermDensity: this.calculateTechnicalTermDensity(words),
      numericalPrecision: this.detectNumericalPrecision(text),
      sentenceComplexity: this.analyzeSentenceComplexity(sentences),
      structuralPatterns: this.detectStructuralPatterns(text),
      vocabularyMatch: this.matchVocabulary(words),
      voiceMarkerPresence: this.detectVoiceMarkers(text),
      domainKnowledgePresence: this.detectDomainKnowledge(text),
      designJargonHit: DESIGN_JARGON_RE.test(text),
      overallMatch: 0 // Will be calculated
    };
  }

  /**
   * Compares analyzed text against voice profile
   */
  compareToProfile(analysis: ToneAnalysis): VoiceMatch {
    const characteristics = this.voiceProfile.characteristics;
    const design = this.isDesignSystemProfile();
    
    // Density vs target band (not boolean mismatch → always 0.5).
    const targetDensity =
      characteristics.tone.technicality === 'very_high'
        ? 0.18
        : characteristics.tone.technicality === 'high'
          ? 0.12
          : characteristics.tone.technicality === 'moderate'
            ? 0.08
            : 0.04;
    const technicalMatch = Math.max(
      0,
      1 - Math.abs(analysis.technicalTermDensity - targetDensity) / Math.max(targetDensity, 0.08)
    );

    let precisionMatch: number;
    if (design) {
      precisionMatch = this.scoreMatch(
        analysis.numericalPrecision.matchesCommonValues,
        characteristics.linguisticPatterns.numericalPrecision.specificValues
      );
    } else {
      // Consulting: do not reward arbitrary integers / golden-ratio correlation.
      // Evidence-like numbers (%, $, years) get a light bump; otherwise neutral.
      precisionMatch = analysis.numericalPrecision.hasSpecificValues ? 0.65 : 0.55;
    }

    const structureMatch = this.scoreMatch(
      analysis.structuralPatterns.hasHierarchy || analysis.structuralPatterns.hasLists,
      characteristics.structuralPatterns.organization.hierarchical ||
        characteristics.structuralPatterns.organization.sections
    );

    const vocabularyMatch = analysis.vocabularyMatch;
    const markerMatch = analysis.voiceMarkerPresence;

    let overallMatch =
      technicalMatch * 0.2 +
      precisionMatch * 0.1 +
      structureMatch * 0.2 +
      vocabularyMatch * 0.25 +
      markerMatch * 0.25;

    // Penalize design-system jargon when scoring a consulting profile.
    if (!design && analysis.designJargonHit) {
      overallMatch = Math.max(0, overallMatch - 0.35);
    }

    return {
      overallMatch: Math.max(0, Math.min(1, overallMatch)),
      technicalMatch,
      precisionMatch,
      structureMatch,
      vocabularyMatch,
      markerMatch,
      recommendations: this.generateRecommendations(analysis, characteristics, design)
    };
  }

  private extractSentences(text: string): string[] {
    return text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  }

  private extractWords(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 0);
  }

  private calculateTechnicalTermDensity(words: string[]): number {
    const technicalTerms = this.voiceProfile.characteristics.linguisticPatterns.vocabulary.technicalTerms
      .map(term => term.toLowerCase());
    
    const matches = words.filter(word => 
      technicalTerms.some(term => word.includes(term) || term.includes(word))
    ).length;

    return words.length > 0 ? matches / words.length : 0;
  }

  private detectNumericalPrecision(text: string): NumericalPrecisionAnalysis {
    const numberPattern = /[\d]+\.?[\d]*/g;
    const numbers = text.match(numberPattern) || [];
    const specificValues = this.voiceProfile.characteristics.linguisticPatterns.numericalPrecision.commonValues;
    const design = this.isDesignSystemProfile();

    // Evidence-style numbers for consulting (%, currency, years) — not "any digit".
    const evidencePattern = /(\d+\s*%|\$\s*\d+|\b(19|20)\d{2}\b|\b\d+\s*(hours?|days?|weeks?|months?)\b)/i;
    const hasEvidenceNumbers = evidencePattern.test(text);

    const matchesCommonValues = numbers.some((num) =>
      specificValues.some((val) => Math.abs(parseFloat(num) - val) < 0.01)
    );
    const matchesDesignRatios = numbers.some((num) => {
      const n = parseFloat(num);
      return [...DESIGN_RATIO_VALUES].some((val) => Math.abs(n - val) < 0.01);
    });

    return {
      hasSpecificValues: design ? numbers.length > 0 : hasEvidenceNumbers && !matchesDesignRatios,
      count: numbers.length,
      matchesCommonValues: design ? matchesCommonValues : false,
      values: numbers.map((n) => parseFloat(n)),
    };
  }

  private analyzeSentenceComplexity(sentences: string[]): SentenceComplexity {
    const avgLength = sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / sentences.length;
    const hasComplexStructures = sentences.some(s => 
      s.includes(',') || s.includes(';') || s.includes(':') || s.includes('(')
    );

    return {
      averageLength: avgLength,
      hasComplexStructures,
      complexityLevel: avgLength > 20 ? 'high' : avgLength > 15 ? 'moderate' : 'low'
    };
  }

  private detectStructuralPatterns(text: string): StructuralPatternAnalysis {
    const hasHierarchy = /^#{1,6}\s/.test(text) || /##\s/.test(text);
    const hasLists = /^[\s]*[-*+]\s/.test(text) || /^\d+\.\s/.test(text);
    const hasSections = /^##\s/.test(text);

    return {
      hasHierarchy,
      hasLists,
      hasSections,
      structureType: hasHierarchy ? 'hierarchical' : hasLists ? 'list-based' : 'prose'
    };
  }

  private matchVocabulary(words: string[]): number {
    const allTerms = [
      ...this.voiceProfile.characteristics.linguisticPatterns.vocabulary.technicalTerms,
      ...this.voiceProfile.characteristics.linguisticPatterns.vocabulary.descriptiveTerms,
      ...this.voiceProfile.characteristics.linguisticPatterns.vocabulary.relationshipTerms
    ].map(term => term.toLowerCase());

    const matches = words.filter(word => 
      allTerms.some(term => word.includes(term) || term.includes(word))
    ).length;

    return words.length > 0 ? matches / words.length : 0;
  }

  private detectVoiceMarkers(text: string): number {
    const allMarkers = [
      ...this.voiceProfile.characteristics.voiceMarkers.openingPhrases,
      ...this.voiceProfile.characteristics.voiceMarkers.connectingPhrases,
      ...this.voiceProfile.characteristics.voiceMarkers.emphasisPhrases,
      ...this.voiceProfile.characteristics.voiceMarkers.closingPhrases
    ].map(phrase => phrase.toLowerCase());

    const sentences = this.extractSentences(text);
    const matches = sentences.filter(sentence => 
      allMarkers.some(marker => sentence.toLowerCase().includes(marker))
    ).length;

    return sentences.length > 0 ? matches / sentences.length : 0;
  }

  private detectDomainKnowledge(text: string): DomainKnowledgePresence {
    const textLower = text.toLowerCase();
    
    const mathConcepts = this.voiceProfile.characteristics.domainKnowledge.mathematicalConcepts
      .filter(concept => textLower.includes(concept.toLowerCase()));
    
    const designConcepts = this.voiceProfile.characteristics.domainKnowledge.designConcepts
      .filter(concept => textLower.includes(concept.toLowerCase()));
    
    const techConcepts = this.voiceProfile.characteristics.domainKnowledge.technicalConcepts
      .filter(concept => textLower.includes(concept.toLowerCase()));

    return {
      mathematicalConcepts: mathConcepts,
      designConcepts: designConcepts,
      technicalConcepts: techConcepts,
      totalPresence: (mathConcepts.length + designConcepts.length + techConcepts.length) / 
        (this.voiceProfile.characteristics.domainKnowledge.mathematicalConcepts.length +
         this.voiceProfile.characteristics.domainKnowledge.designConcepts.length +
         this.voiceProfile.characteristics.domainKnowledge.technicalConcepts.length)
    };
  }

  private scoreMatch(actual: boolean | number, expected: boolean | number): number {
    if (typeof actual === 'boolean' && typeof expected === 'boolean') {
      return actual === expected ? 1.0 : 0.0;
    }
    if (typeof actual === 'number' && typeof expected === 'number') {
      return 1 - Math.abs(actual - expected);
    }
    return 0.5;
  }

  private generateRecommendations(
    analysis: ToneAnalysis,
    characteristics: VoiceCharacteristics,
    designSystem = false
  ): string[] {
    const recommendations: string[] = [];

    if (analysis.technicalTermDensity < 0.05) {
      recommendations.push(
        designSystem
          ? 'Increase use of technical terminology from the domain'
          : 'Use clearer domain language for the industry and topic'
      );
    }

    if (designSystem && !analysis.numericalPrecision.hasSpecificValues) {
      recommendations.push('Include specific numerical values and ratios');
    }

    if (!designSystem && analysis.designJargonHit) {
      recommendations.push('Remove design-system jargon unrelated to the topic (cipher, Fourier, golden ratio, etc.)');
    }

    if (analysis.vocabularyMatch < 0.15) {
      recommendations.push('Use more domain-specific vocabulary and descriptive terms');
    }

    if (analysis.voiceMarkerPresence < 0.1) {
      recommendations.push('Incorporate more voice marker phrases (opening, connecting, emphasis)');
    }

    if (!analysis.structuralPatterns.hasHierarchy && !analysis.structuralPatterns.hasLists) {
      recommendations.push('Add clear headings or lists for scannability');
    }

    return recommendations;
  }
}

export interface ToneAnalysis {
  technicalTermDensity: number;
  numericalPrecision: NumericalPrecisionAnalysis;
  sentenceComplexity: SentenceComplexity;
  structuralPatterns: StructuralPatternAnalysis;
  vocabularyMatch: number;
  voiceMarkerPresence: number;
  domainKnowledgePresence: DomainKnowledgePresence;
  /** True when design-system jargon (cipher / Fourier / phi / …) appears in the text. */
  designJargonHit: boolean;
  overallMatch: number;
}

export interface NumericalPrecisionAnalysis {
  hasSpecificValues: boolean;
  count: number;
  matchesCommonValues: boolean;
  values: number[];
}

export interface SentenceComplexity {
  averageLength: number;
  hasComplexStructures: boolean;
  complexityLevel: 'low' | 'moderate' | 'high';
}

export interface StructuralPatternAnalysis {
  hasHierarchy: boolean;
  hasLists: boolean;
  hasSections: boolean;
  structureType: 'hierarchical' | 'list-based' | 'prose';
}

export interface DomainKnowledgePresence {
  mathematicalConcepts: string[];
  designConcepts: string[];
  technicalConcepts: string[];
  totalPresence: number;
}

export interface VoiceMatch {
  overallMatch: number;
  technicalMatch: number;
  precisionMatch: number;
  structureMatch: number;
  vocabularyMatch: number;
  markerMatch: number;
  recommendations: string[];
}

