/**
 * Voice Framework - Main Entry Point
 * 
 * A comprehensive NLP framework for capturing, analyzing, and generating text
 * in the voice and tone of the Brisbane Servers design system documentation.
 */

// Export analyzers (classes only - interfaces can be imported directly from source files)
export { ToneAnalyzer } from './analyzers/tone-analyzer';
// Note: ToneAnalysis, VoiceMatch interfaces can be imported from './analyzers/tone-analyzer' if needed
export { PatternExtractor } from './analyzers/pattern-extractor';
// Note: ExtractedPatterns interface can be imported from './analyzers/pattern-extractor' if needed
export { Shredder } from './analyzers/shredder';
// Note: ShreddedTruth, ShredderAnalysis interfaces can be imported from './analyzers/shredder' if needed
export { Panner } from './analyzers/panner';
// Note: PannedTruth, PannedResult interfaces can be imported from './analyzers/panner' if needed

// Export generators (classes only - interfaces can be imported directly from source files)
export { TextGenerator } from './generators/text-generator';
// Note: GenerationOptions interface can be imported from './generators/text-generator' if needed
export { Extrapolator } from './generators/extrapolator';
// Note: ExtrapolationOptions interface can be imported from './generators/extrapolator' if needed
export { VoiceMatcher } from './generators/voice-matcher';
// Note: ValidationResult interface can be imported from './generators/voice-matcher' if needed

// Export models
export * from './models/voice-profile';
export * from './models/text-patterns';

// Re-export voice profile data
import * as voiceProfileData from './voice-profile.json';
export { voiceProfileData };

// Import components for createVoiceFramework
import { ToneAnalyzer } from './analyzers/tone-analyzer';
import { PatternExtractor } from './analyzers/pattern-extractor';
import { Shredder } from './analyzers/shredder';
import { TextGenerator } from './generators/text-generator';
import { Extrapolator } from './generators/extrapolator';
import { VoiceMatcher } from './generators/voice-matcher';

// Export storage and management systems (classes only - interfaces can be imported directly from source files)
export { TextStorage } from './storage/text-storage';
// Note: TextSample, SemanticPrinciple, SemanticRelationship interfaces can be imported from './storage/text-storage' if needed
export { VectorStorage } from './storage/vector-storage';
// Note: DocumentVector interface can be imported from './storage/vector-storage' if needed
export { ProfileManager } from './storage/profile-manager';
// Note: ProfileMetadata, ProfileEntry interfaces can be imported from './storage/profile-manager' if needed
export { ProfileBuilder } from './builders/profile-builder';
// Note: ProfileBuilderOptions interface can be imported from './builders/profile-builder' if needed

// Export document processing (classes only - interfaces can be imported directly from source files)
export { DocumentParser } from './parsers/document-parser';
// Note: ParsedDocument interface can be imported from './parsers/document-parser' if needed
export { DocumentProcessor } from './processors/document-processor';
// Note: ProcessedDocument interface can be imported from './processors/document-processor' if needed

/**
 * Quick start function - creates all framework components
 */
export function createVoiceFramework() {
  return {
    analyzer: new ToneAnalyzer(),
    patternExtractor: new PatternExtractor(),
    shredder: new Shredder(),
    generator: new TextGenerator(),
    extrapolator: new Extrapolator(),
    matcher: new VoiceMatcher()
  };
}

/**
 * Create an enhanced framework with storage and profile management
 */
export async function createEnhancedFramework(storagePath?: string, profilesPath?: string) {
  const { TextStorage } = await import('./storage/text-storage');
  const { ProfileManager } = await import('./storage/profile-manager');
  const { ProfileBuilder } = await import('./builders/profile-builder');
  
  const textStorage = new TextStorage(storagePath);
  const profileManager = new ProfileManager(profilesPath);
  const profileBuilder = new ProfileBuilder();
  
  await textStorage.initialize();
  await profileManager.initialize();
  
  return {
    // Core framework components
    analyzer: new ToneAnalyzer(),
    patternExtractor: new PatternExtractor(),
    shredder: new Shredder(),
    generator: new TextGenerator(),
    extrapolator: new Extrapolator(),
    matcher: new VoiceMatcher(),
    
    // Enhanced features
    textStorage,
    profileManager,
    profileBuilder
  };
}

