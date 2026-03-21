/**
 * Usage Examples
 * Demonstrates how to use the voice framework for text generation and analysis
 */

import { ToneAnalyzer } from '../analyzers/tone-analyzer';
import { PatternExtractor } from '../analyzers/pattern-extractor';
import { TextGenerator } from '../generators/text-generator';
import { Extrapolator } from '../generators/extrapolator';
import { VoiceMatcher } from '../generators/voice-matcher';

// Example 1: Analyze existing text
export function exampleAnalyzeText() {
  const analyzer = new ToneAnalyzer();
  
  const sampleText = `
    Every element on the website uses the wave function cipher system as its baseline foundation.
    This system creates comprehensive design blocks with mathematical precision.
    All blocks are vectorized and stored for data extraction.
  `;

  const analysis = analyzer.analyzeText(sampleText);
  const match = analyzer.compareToProfile(analysis);

  console.log('Tone Analysis:', analysis);
  console.log('Voice Match Score:', match.overallMatch);
  console.log('Recommendations:', match.recommendations);
}

// Example 2: Generate new text
export function exampleGenerateText() {
  const generator = new TextGenerator();

  // Generate text about a new topic
  const generated = generator.generateText('Color Modulation System', {
    length: 'medium',
    includeExamples: true,
    includeStructure: true,
    style: 'technical'
  });

  console.log('Generated Text:');
  console.log(generated);
}

// Example 3: Extrapolate on existing text
export function exampleExtrapolate() {
  const extrapolator = new Extrapolator();

  const seedText = `
    The design system uses phi-based spacing for proportional harmony.
    Each component maintains mathematical precision through golden ratio relationships.
  `;

  const extrapolated = extrapolator.extrapolate(seedText, {
    expansionLevel: 'moderate',
    addExamples: true,
    addDetails: true
  });

  console.log('Original Text:');
  console.log(seedText);
  console.log('\nExtrapolated Text:');
  console.log(extrapolated);
}

// Example 4: Expand a specific concept
export function exampleExpandConcept() {
  const extrapolator = new Extrapolator();

  const expansion = extrapolator.expandConcept('azimuth-based design', 
    'The system uses azimuth angles for structural elements.'
  );

  console.log('Concept Expansion:');
  console.log(expansion);
}

// Example 5: Match and adjust text to voice
export function exampleMatchVoice() {
  const matcher = new VoiceMatcher();

  const text = `
    The website has a design system. It uses colors and spacing.
    Components are organized in a grid layout.
  `;

  // Score the match
  const match = matcher.scoreMatch(text);
  console.log('Initial Match Score:', match.overallMatch);
  console.log('Issues:', match.recommendations);

  // Adjust to better match voice
  const adjusted = matcher.adjustToVoice(text, 0.8);
  const newMatch = matcher.scoreMatch(adjusted);
  
  console.log('\nAdjusted Text:');
  console.log(adjusted);
  console.log('\nNew Match Score:', newMatch.overallMatch);
}

// Example 6: Extract patterns from text
export function exampleExtractPatterns() {
  const extractor = new PatternExtractor();

  const text = `
    Every element on the website uses the wave function cipher system.
    All blocks are vectorized with semantic level values.
    The system creates comprehensive design through phi-based relationships.
  `;

  const patterns = extractor.extractPatterns(text);

  console.log('Sentence Patterns:', patterns.sentencePatterns);
  console.log('Phrase Patterns:', patterns.phrasePatterns);
  console.log('Terminology Patterns:', patterns.terminologyPatterns);
  console.log('Structural Patterns:', patterns.structuralPatterns);
}

// Example 7: Generate related content
export function exampleGenerateRelated() {
  const extrapolator = new Extrapolator();

  const seedText = `
    The wave function cipher system encodes each letter with Fourier transform values.
    Semantic levels affect wave frequency at 1.618×, 1×, and 0.618× ratios.
  `;

  const related = extrapolator.generateRelatedContent(seedText, 'Wave Function Implementation');

  console.log('Related Content:');
  console.log(related);
}

// Example 8: Validate text against voice profile
export function exampleValidateVoice() {
  const matcher = new VoiceMatcher();

  const text = `
    This document describes the comprehensive design blocks system that forms the foundation
    of the Brisbane Servers website. Every element uses the wave function cipher system as
    its baseline foundation, creating a grand, all-encompassing web presence using
    azimuth-based design principles with mathematical precision (1.618, 0.618).
  `;

  const validation = matcher.validateVoice(text);

  console.log('Validation Result:');
  console.log('Is Valid:', validation.isValid);
  console.log('Score:', validation.score);
  console.log('Strengths:', validation.strengths);
  console.log('Issues:', validation.issues);
}

// Example 9: Complete workflow - analyze, generate, and validate
export function exampleCompleteWorkflow() {
  // Step 1: Analyze source text
  const analyzer = new ToneAnalyzer();
  const sourceText = `
    The design blocks system creates a comprehensive web presence.
    All elements use wave function encoding with phi-based proportions.
  `;
  const analysis = analyzer.analyzeText(sourceText);
  console.log('Step 1 - Analysis:', analysis.technicalTermDensity);

  // Step 2: Generate new content
  const generator = new TextGenerator();
  const generated = generator.generateText('Semantic Encoding System', {
    length: 'medium',
    style: 'technical'
  });
  console.log('\nStep 2 - Generated:', generated.substring(0, 100) + '...');

  // Step 3: Validate and adjust
  const matcher = new VoiceMatcher();
  const validation = matcher.validateVoice(generated);
  console.log('\nStep 3 - Validation Score:', validation.score);

  if (!validation.isValid) {
    const adjusted = matcher.adjustToVoice(generated);
    const newValidation = matcher.validateVoice(adjusted);
    console.log('Step 4 - Adjusted Score:', newValidation.score);
  }
}

// Run all examples (commented out - uncomment to run)
/*
exampleAnalyzeText();
exampleGenerateText();
exampleExtrapolate();
exampleExpandConcept();
exampleMatchVoice();
exampleExtractPatterns();
exampleGenerateRelated();
exampleValidateVoice();
exampleCompleteWorkflow();
*/

