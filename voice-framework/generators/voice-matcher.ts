/**
 * Voice Matcher
 * Ensures generated text matches the voice profile
 */

import { VoiceProfile } from '../models/voice-profile';
import { ToneAnalyzer, VoiceMatch } from '../analyzers/tone-analyzer';
import * as voiceProfileData from '../voice-profile.json';

export class VoiceMatcher {
  private voiceProfile: VoiceProfile;
  private toneAnalyzer: ToneAnalyzer;

  constructor(profile?: VoiceProfile) {
    this.voiceProfile = profile || (voiceProfileData as VoiceProfile);
    this.toneAnalyzer = new ToneAnalyzer(this.voiceProfile);
  }

  /**
   * Scores how well text matches the voice profile
   */
  scoreMatch(text: string): VoiceMatch {
    const analysis = this.toneAnalyzer.analyzeText(text);
    return this.toneAnalyzer.compareToProfile(analysis);
  }

  /**
   * Adjusts text to better match the voice profile
   */
  adjustToVoice(text: string, targetScore: number = 0.8): string {
    let adjusted = text;
    let match = this.scoreMatch(adjusted);
    let iterations = 0;
    const maxIterations = 10;

    while (match.overallMatch < targetScore && iterations < maxIterations) {
      adjusted = this.applyAdjustments(adjusted, match);
      match = this.scoreMatch(adjusted);
      iterations++;
    }

    return adjusted;
  }

  /**
   * Applies adjustments based on match scores
   */
  private applyAdjustments(text: string, match: VoiceMatch): string {
    let adjusted = text;

    // Improve technical term density
    if (match.technicalMatch < 0.7) {
      adjusted = this.addTechnicalTerms(adjusted);
    }

    // Improve vocabulary match
    if (match.vocabularyMatch < 0.7) {
      adjusted = this.enhanceVocabulary(adjusted);
    }

    // Add voice markers
    if (match.markerMatch < 0.7) {
      adjusted = this.addVoiceMarkers(adjusted);
    }

    // Add numerical precision
    if (match.precisionMatch < 0.7) {
      adjusted = this.addNumericalPrecision(adjusted);
    }

    // Improve structure
    if (match.structureMatch < 0.7) {
      adjusted = this.improveStructure(adjusted);
    }

    return adjusted;
  }

  /**
   * Adds technical terms to text
   */
  private addTechnicalTerms(text: string): string {
    const terms = this.voiceProfile.characteristics.linguisticPatterns.vocabulary.technicalTerms;
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Find sentences without technical terms
    const needsTerms = sentences.filter(sentence => {
      const hasTerm = terms.some(term => sentence.toLowerCase().includes(term.toLowerCase()));
      return !hasTerm;
    });

    if (needsTerms.length > 0) {
      const sentence = needsTerms[0];
      const term = terms.find(t => !sentence.toLowerCase().includes(t.toLowerCase())) || terms[0];
      const updated = sentence.trim() + ` using ${term}.`;
      text = text.replace(sentence, updated);
    }

    return text;
  }

  /**
   * Enhances vocabulary with domain-specific terms
   */
  private enhanceVocabulary(text: string): string {
    const descriptiveTerms = this.voiceProfile.characteristics.linguisticPatterns.vocabulary.descriptiveTerms;
    const relationshipTerms = this.voiceProfile.characteristics.voiceMarkers.connectingPhrases;

    // Replace generic verbs with relationship terms
    relationshipTerms.forEach(term => {
      if (Math.random() > 0.7 && !text.toLowerCase().includes(term.toLowerCase())) {
        text = text.replace(/\b(creates|makes|does)\b/gi, term);
      }
    });

    // Add descriptive terms
    descriptiveTerms.forEach(term => {
      if (Math.random() > 0.8 && !text.toLowerCase().includes(term.toLowerCase())) {
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        if (sentences.length > 0) {
          const sentence = sentences[0];
          text = text.replace(sentence, `${term} ${sentence}`);
        }
      }
    });

    return text;
  }

  /**
   * Adds voice marker phrases
   */
  private addVoiceMarkers(text: string): string {
    const openingPhrases = this.voiceProfile.characteristics.voiceMarkers.openingPhrases;
    const connectingPhrases = this.voiceProfile.characteristics.voiceMarkers.connectingPhrases;

    // Check if first sentence has an opening phrase
    const firstSentence = text.split(/[.!?]+/)[0].trim();
    const hasOpening = openingPhrases.some(phrase => 
      firstSentence.toLowerCase().startsWith(phrase.toLowerCase())
    );

    if (!hasOpening && openingPhrases.length > 0) {
      const opening = openingPhrases[0];
      text = `${opening} ${text}`;
    }

    // Add connecting phrases
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length > 1) {
      connectingPhrases.forEach(phrase => {
        if (Math.random() > 0.7 && !text.toLowerCase().includes(phrase.toLowerCase())) {
          const randomSentence = sentences[Math.floor(Math.random() * sentences.length)];
          text = text.replace(randomSentence, `${randomSentence} This ${phrase} enhanced functionality.`);
        }
      });
    }

    return text;
  }

  /**
   * Adds numerical precision
   */
  private addNumericalPrecision(text: string): string {
    const values = this.voiceProfile.characteristics.linguisticPatterns.numericalPrecision.commonValues;
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

    // Check if text has numbers
    const hasNumbers = /\d/.test(text);
    
    if (!hasNumbers && sentences.length > 0) {
      const sentence = sentences[0];
      const value = values[Math.floor(Math.random() * values.length)];
      text = text.replace(sentence, `${sentence} (${value})`);
    }

    return text;
  }

  /**
   * Improves structural patterns
   */
  private improveStructure(text: string): string {
    // Add headers if missing
    if (!/^#{1,6}\s/.test(text)) {
      const lines = text.split('\n');
      if (lines.length > 0 && lines[0].trim().length > 0) {
        text = `## ${lines[0].trim()}\n\n${lines.slice(1).join('\n')}`;
      }
    }

    // Add lists if appropriate
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length > 3 && !text.includes('- ')) {
      const listItems = sentences.slice(0, 3).map(s => `- ${s.trim()}`);
      text = listItems.join('\n') + '\n\n' + sentences.slice(3).join('. ') + '.';
    }

    return text;
  }

  /**
   * Validates text against voice profile requirements
   */
  validateVoice(text: string): ValidationResult {
    const match = this.scoreMatch(text);
    const isValid = match.overallMatch >= 0.7;

    return {
      isValid,
      score: match.overallMatch,
      issues: isValid ? [] : match.recommendations,
      strengths: this.identifyStrengths(match)
    };
  }

  private identifyStrengths(match: VoiceMatch): string[] {
    const strengths: string[] = [];

    if (match.technicalMatch >= 0.8) {
      strengths.push('Strong technical terminology usage');
    }
    if (match.precisionMatch >= 0.8) {
      strengths.push('Good numerical precision');
    }
    if (match.vocabularyMatch >= 0.8) {
      strengths.push('Appropriate vocabulary selection');
    }
    if (match.markerMatch >= 0.8) {
      strengths.push('Effective use of voice markers');
    }
    if (match.structureMatch >= 0.8) {
      strengths.push('Proper structural organization');
    }

    return strengths;
  }
}

export interface ValidationResult {
  isValid: boolean;
  score: number;
  issues: string[];
  strengths: string[];
}

