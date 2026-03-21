/**
 * Text Generator
 * Generates text matching the voice profile characteristics
 */

import { VoiceProfile } from '../models/voice-profile';
import { SentencePattern, PhrasePattern, commonSentencePatterns, commonPhrasePatterns } from '../models/text-patterns';
import * as voiceProfileData from '../voice-profile.json';

export class TextGenerator {
  private voiceProfile: VoiceProfile;

  constructor(profile?: VoiceProfile) {
    this.voiceProfile = profile || (voiceProfileData as VoiceProfile);
  }

  /**
   * Generates text based on a topic or seed text
   */
  generateText(topic: string, options: GenerationOptions = {}): string {
    const {
      length = 'medium',
      includeExamples = true,
      includeStructure = true,
      style = 'descriptive'
    } = options;

    let text = '';

    // Generate opening
    if (includeStructure) {
      text += this.generateOpening(topic) + '\n\n';
    }

    // Generate main content
    text += this.generateMainContent(topic, length, style);

    // Generate examples if requested
    if (includeExamples) {
      text += '\n\n' + this.generateExamples(topic);
    }

    // Generate closing if structure is included
    if (includeStructure) {
      text += '\n\n' + this.generateClosing(topic);
    }

    return text.trim();
  }

  /**
   * Generates an opening section
   */
  private generateOpening(topic: string): string {
    const openings = this.voiceProfile.characteristics.voiceMarkers.openingPhrases;
    const opening = this.randomSelect(openings) || 'This introduces';
    
    return `${opening} the ${topic} system that forms the foundation of comprehensive design implementation.`;
  }

  /**
   * Generates main content
   */
  private generateMainContent(topic: string, length: 'short' | 'medium' | 'long', style: string): string {
    const sentences: string[] = [];
    const targetSentences = length === 'short' ? 3 : length === 'medium' ? 5 : 8;

    for (let i = 0; i < targetSentences; i++) {
      sentences.push(this.generateSentence(topic, style));
    }

    return sentences.join(' ');
  }

  /**
   * Generates a single sentence
   */
  private generateSentence(topic: string, style: string): string {
    const pattern = this.selectSentencePattern(style);
    const components = this.fillPatternComponents(pattern, topic);
    
    return this.constructSentence(components);
  }

  /**
   * Selects an appropriate sentence pattern
   */
  private selectSentencePattern(style: string): SentencePattern {
    // Use common patterns or generate based on style
    const patterns = commonSentencePatterns;
    const selected = this.randomSelect(patterns);
    if (!selected) {
      // Fallback pattern if randomSelect returns null
      return {
        structure: 'subject-verb-object',
        components: {
          subject: ['The system'],
          verb: ['provides'],
          object: ['functionality'],
          modifiers: []
        },
        examples: []
      };
    }
    return selected;
  }

  /**
   * Fills pattern components with appropriate terms
   */
  private fillPatternComponents(pattern: SentencePattern, topic: string): SentenceComponents {
    const subject = this.randomSelect(pattern.components.subject) || `The ${topic} system`;
    const verb = this.randomSelect(pattern.components.verb) || 'provides';
    const object = this.randomSelect(pattern.components.object) || 'comprehensive functionality';
    const modifier = this.randomSelect(pattern.components.modifiers) || '';

    return { subject, verb, object, modifier };
  }

  /**
   * Constructs a sentence from components
   */
  private constructSentence(components: SentenceComponents): string {
    let sentence = `${components.subject} ${components.verb} ${components.object}`;
    
    if (components.modifier) {
      sentence += ` with ${components.modifier} precision`;
    }

    // Add technical detail
    const technicalTerms = this.voiceProfile.characteristics.linguisticPatterns.vocabulary.technicalTerms;
    if (technicalTerms && technicalTerms.length > 0 && Math.random() > 0.5) {
      const technicalTerm = this.randomSelect(technicalTerms);
      if (technicalTerm) {
        sentence += ` using ${technicalTerm}`;
      }
    }

    // Add numerical precision occasionally
    const commonValues = this.voiceProfile.characteristics.linguisticPatterns.numericalPrecision.commonValues;
    if (commonValues && commonValues.length > 0 && Math.random() > 0.7) {
      const value = this.randomSelect(commonValues);
      if (value !== null) {
        sentence += ` (${value})`;
      }
    }

    return sentence + '.';
  }

  /**
   * Generates examples section
   */
  private generateExamples(topic: string): string {
    const examples: string[] = [];
    const numExamples = 2 + Math.floor(Math.random() * 2); // 2-3 examples

    for (let i = 0; i < numExamples; i++) {
      const example = this.generateExample(topic);
      examples.push(`- ${example}`);
    }

    return '### Examples\n\n' + examples.join('\n');
  }

  /**
   * Generates a single example
   */
  private generateExample(topic: string): string {
    const connectingPhrases = this.voiceProfile.characteristics.voiceMarkers.connectingPhrases;
    const connectingPhrase = this.randomSelect(connectingPhrases) || 'provides';
    
    const technicalTerms = this.voiceProfile.characteristics.linguisticPatterns.vocabulary.technicalTerms;
    const technicalTerm = this.randomSelect(technicalTerms) || 'advanced';

    return `${topic} ${connectingPhrase} ${technicalTerm} integration for enhanced functionality.`;
  }

  /**
   * Generates a closing section
   */
  private generateClosing(topic: string): string {
    const closings = this.voiceProfile.characteristics.voiceMarkers.closingPhrases;
    const closing = this.randomSelect(closings) || 'demonstrates';
    
    const emphasisPhrases = this.voiceProfile.characteristics.voiceMarkers.emphasisPhrases;
    const emphasis = this.randomSelect(emphasisPhrases) || 'comprehensive';

    return `This ${topic} system ${closing} ${emphasis} implementation throughout the entire framework.`;
  }

  /**
   * Generates a list item in the voice
   */
  generateListItem(topic: string): string {
    const connectingPhrases = this.voiceProfile.characteristics.voiceMarkers.connectingPhrases;
    const verb = this.randomSelect(connectingPhrases) || 'provides';
    
    const technicalTerms = this.voiceProfile.characteristics.linguisticPatterns.vocabulary.technicalTerms;
    const technicalTerm = this.randomSelect(technicalTerms) || 'advanced';

    return `- **${topic}**: ${verb} ${technicalTerm} for comprehensive system integration`;
  }

  /**
   * Generates a section header
   */
  generateSectionHeader(topic: string, level: number = 2): string {
    const prefix = '#'.repeat(level);
    const descriptiveTerms = this.voiceProfile.characteristics.linguisticPatterns.vocabulary.descriptiveTerms;
    const descriptiveTerm = this.randomSelect(descriptiveTerms) || 'Overview';
    
    const capitalizedTerm = descriptiveTerm ? 
      descriptiveTerm.charAt(0).toUpperCase() + descriptiveTerm.slice(1) : 
      'Overview';
    
    return `${prefix} ${capitalizedTerm} ${topic}`;
  }

  private randomSelect<T>(array: T[]): T | null {
    if (!array || array.length === 0) {
      return null;
    }
    return array[Math.floor(Math.random() * array.length)];
  }
}

export interface GenerationOptions {
  length?: 'short' | 'medium' | 'long';
  includeExamples?: boolean;
  includeStructure?: boolean;
  style?: 'descriptive' | 'technical' | 'explanatory';
}

interface SentenceComponents {
  subject: string;
  verb: string;
  object: string;
  modifier: string;
}

