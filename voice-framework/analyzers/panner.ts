/**
 * Panner - Profile-Aware Truth Filter
 * 
 * Filters shredded truths against a voice profile to find "gold" - 
 * truths that match profile characteristics. Acts like a gold panner
 * sieving through all extracted truths to find the valuable ones.
 */

import type { ShreddedTruth } from './shredder';
import type { VoiceProfile } from '../models/voice-profile';

export interface PannedTruth extends ShreddedTruth {
  relevanceScore: number; // 0-1, how well this truth matches the profile
  matchReasons: string[]; // Reasons why this truth matches
}

export interface PannedResult {
  gold: PannedTruth[]; // Truths above threshold (the valuable ones)
  discarded: ShreddedTruth[]; // Truths below threshold (the sand/gravel)
  statistics: {
    total: number;
    kept: number;
    discarded: number;
    averageScore: number;
    threshold: number;
  };
}

export class Panner {
  private voiceProfile: VoiceProfile;
  private threshold: number;

  constructor(voiceProfile: VoiceProfile, threshold: number = 0.6) {
    this.voiceProfile = voiceProfile;
    this.threshold = threshold;
  }

  /**
   * Pan through truths to find the "gold" - profile-relevant truths
   */
  pan(truths: ShreddedTruth[]): PannedResult {
    const panned: PannedTruth[] = [];
    const discarded: ShreddedTruth[] = [];
    let totalScore = 0;

    for (const truth of truths) {
      const { score, reasons } = this.scoreTruth(truth);
      totalScore += score;

      if (score >= this.threshold) {
        panned.push({
          ...truth,
          relevanceScore: score,
          matchReasons: reasons
        });
      } else {
        discarded.push(truth);
      }
    }

    // Sort gold by relevance score (highest first)
    panned.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return {
      gold: panned,
      discarded,
      statistics: {
        total: truths.length,
        kept: panned.length,
        discarded: discarded.length,
        averageScore: truths.length > 0 ? totalScore / truths.length : 0,
        threshold: this.threshold
      }
    };
  }

  /**
   * Score how well a truth matches the voice profile
   */
  private scoreTruth(truth: ShreddedTruth): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];
    const weights = {
      vocabulary: 0.3,
      domain: 0.25,
      tone: 0.25,
      semantic: 0.2
    };

    // Score vocabulary match
    const vocabScore = this.scoreVocabulary(truth);
    score += vocabScore * weights.vocabulary;
    if (vocabScore > 0.5) {
      reasons.push('Vocabulary match');
    }

    // Score domain knowledge match
    const domainScore = this.scoreDomainKnowledge(truth);
    score += domainScore * weights.domain;
    if (domainScore > 0.5) {
      reasons.push('Domain knowledge match');
    }

    // Score tone characteristics
    const toneScore = this.scoreTone(truth);
    score += toneScore * weights.tone;
    if (toneScore > 0.5) {
      reasons.push('Tone match');
    }

    // Score semantic density
    const semanticScore = this.scoreSemanticDensity(truth);
    score += semanticScore * weights.semantic;
    if (semanticScore > 0.5) {
      reasons.push('Semantic density match');
    }

    // Boost score if truth has high confidence
    if (truth.confidence > 0.8) {
      score *= 1.1;
      if (score > 1) score = 1;
      reasons.push('High confidence truth');
    }

    return { score: Math.min(score, 1), reasons };
  }

  /**
   * Score vocabulary match
   */
  private scoreVocabulary(truth: ShreddedTruth): number {
    const profile = this.voiceProfile.characteristics;
    const vocab = profile.linguisticPatterns.vocabulary;
    const claim = truth.claim.toLowerCase();
    const context = (truth.context || '').toLowerCase();
    const text = `${claim} ${context}`;

    let matches = 0;
    let totalTerms = 0;

    // Check technical terms
    vocab.technicalTerms.forEach(term => {
      totalTerms++;
      if (text.includes(term.toLowerCase())) {
        matches++;
      }
    });

    // Check descriptive terms
    vocab.descriptiveTerms.forEach(term => {
      totalTerms++;
      if (text.includes(term.toLowerCase())) {
        matches++;
      }
    });

    // Check relationship terms
    vocab.relationshipTerms.forEach(term => {
      totalTerms++;
      if (text.includes(term.toLowerCase())) {
        matches++;
      }
    });

    // Check voice markers
    const markers = profile.voiceMarkers;
    [...markers.openingPhrases, ...markers.connectingPhrases, ...markers.emphasisPhrases].forEach(phrase => {
      totalTerms++;
      if (text.includes(phrase.toLowerCase())) {
        matches++;
      }
    });

    return totalTerms > 0 ? matches / totalTerms : 0;
  }

  /**
   * Score domain knowledge match
   */
  private scoreDomainKnowledge(truth: ShreddedTruth): number {
    const domain = this.voiceProfile.characteristics.domainKnowledge;
    const claim = truth.claim.toLowerCase();
    const context = (truth.context || '').toLowerCase();
    const text = `${claim} ${context}`;

    let matches = 0;
    let totalConcepts = 0;

    // Check mathematical concepts
    domain.mathematicalConcepts.forEach(concept => {
      totalConcepts++;
      if (text.includes(concept.toLowerCase())) {
        matches++;
      }
    });

    // Check design concepts
    domain.designConcepts.forEach(concept => {
      totalConcepts++;
      if (text.includes(concept.toLowerCase())) {
        matches++;
      }
    });

    // Check technical concepts
    domain.technicalConcepts.forEach(concept => {
      totalConcepts++;
      if (text.includes(concept.toLowerCase())) {
        matches++;
      }
    });

    return totalConcepts > 0 ? matches / totalConcepts : 0;
  }

  /**
   * Score tone characteristics match
   */
  private scoreTone(truth: ShreddedTruth): number {
    const tone = this.voiceProfile.characteristics.tone;
    let score = 0;

    // Check formality level
    const claim = truth.claim;
    const isFormal = this.isFormalText(claim);
    if (tone.formality === 'formal' && isFormal) score += 0.25;
    if (tone.formality === 'casual' && !isFormal) score += 0.25;
    if (tone.formality === 'professional' && (isFormal || !isFormal)) score += 0.25;

    // Check technicality
    const technicalTerms = this.countTechnicalTerms(claim);
    const technicality = technicalTerms > 3 ? 'high' : technicalTerms > 1 ? 'moderate' : 'low';
    if (tone.technicality === 'very_high' && technicality === 'high') score += 0.25;
    if (tone.technicality === 'high' && (technicality === 'high' || technicality === 'moderate')) score += 0.25;
    if (tone.technicality === 'moderate' && technicality === 'moderate') score += 0.25;
    if (tone.technicality === 'low' && technicality === 'low') score += 0.25;

    // Check precision (numerical values)
    const hasNumbers = /\d/.test(claim);
    if (tone.precision === 'very_high' && hasNumbers) score += 0.25;
    if (tone.precision === 'high' && hasNumbers) score += 0.2;
    if (tone.precision === 'moderate' && (hasNumbers || !hasNumbers)) score += 0.15;
    if (tone.precision === 'low' && !hasNumbers) score += 0.1;

    return Math.min(score, 1);
  }

  /**
   * Score semantic density match
   */
  private scoreSemanticDensity(truth: ShreddedTruth): number {
    const semantic = this.voiceProfile.characteristics.semanticDensity;
    const claim = truth.claim;
    
    // Count words per sentence
    const sentences = claim.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = claim.split(/\s+/).length;
    const avgWordsPerSentence = sentences.length > 0 ? words / sentences.length : words;

    // Check information per sentence
    let score = 0;
    if (semantic.informationPerSentence === 'very_high' && avgWordsPerSentence > 20) score += 0.33;
    if (semantic.informationPerSentence === 'high' && avgWordsPerSentence > 15) score += 0.33;
    if (semantic.informationPerSentence === 'moderate' && avgWordsPerSentence > 10) score += 0.33;
    if (semantic.informationPerSentence === 'low' && avgWordsPerSentence <= 10) score += 0.33;

    // Check technical terms
    const techTerms = this.countTechnicalTerms(claim);
    if (semantic.technicalTermsPerParagraph === 'very_high' && techTerms > 5) score += 0.33;
    if (semantic.technicalTermsPerParagraph === 'high' && techTerms > 3) score += 0.33;
    if (semantic.technicalTermsPerParagraph === 'moderate' && techTerms > 1) score += 0.33;
    if (semantic.technicalTermsPerParagraph === 'low' && techTerms <= 1) score += 0.33;

    // Check specificity
    const hasSpecifics = (truth.metadata?.numericalValues?.length ?? 0) > 0 || 
                        (truth.metadata?.entities?.length ?? 0) > 0 ||
                        (truth.metadata?.relationships?.length ?? 0) > 0;
    if (semantic.specificity === 'very_high' && hasSpecifics) score += 0.34;
    if (semantic.specificity === 'high' && hasSpecifics) score += 0.3;
    if (semantic.specificity === 'moderate') score += 0.2;
    if (semantic.specificity === 'low' && !hasSpecifics) score += 0.1;

    return Math.min(score, 1);
  }

  /**
   * Check if text is formal
   */
  private isFormalText(text: string): boolean {
    const formalIndicators = [
      'therefore', 'furthermore', 'moreover', 'consequently',
      'accordingly', 'nevertheless', 'notwithstanding'
    ];
    const lowerText = text.toLowerCase();
    return formalIndicators.some(indicator => lowerText.includes(indicator));
  }

  /**
   * Count technical terms in text
   */
  private countTechnicalTerms(text: string): number {
    const vocab = this.voiceProfile.characteristics.linguisticPatterns.vocabulary;
    const lowerText = text.toLowerCase();
    let count = 0;

    vocab.technicalTerms.forEach(term => {
      if (lowerText.includes(term.toLowerCase())) {
        count++;
      }
    });

    return count;
  }

  /**
   * Set threshold for panning
   */
  setThreshold(threshold: number): void {
    if (threshold < 0 || threshold > 1) {
      throw new Error('Threshold must be between 0 and 1');
    }
    this.threshold = threshold;
  }

  /**
   * Get current threshold
   */
  getThreshold(): number {
    return this.threshold;
  }
}

