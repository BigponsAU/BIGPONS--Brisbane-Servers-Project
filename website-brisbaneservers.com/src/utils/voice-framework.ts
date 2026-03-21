/**
 * Voice Framework Initialization
 * Shared initialization of voice framework components for Astro API routes
 */

import { ToneAnalyzer } from '@voice-framework/analyzers/tone-analyzer';
import { PatternExtractor } from '@voice-framework/analyzers/pattern-extractor';
import { Shredder } from '@voice-framework/analyzers/shredder';
import { TextGenerator } from '@voice-framework/generators/text-generator';
import { Extrapolator } from '@voice-framework/generators/extrapolator';
import { VoiceMatcher } from '@voice-framework/generators/voice-matcher';
import { TestRunner } from '@voice-framework/testing/test-runner';
import { TextStorage } from '@voice-framework/storage/text-storage';
import { ProfileManager } from '@voice-framework/storage/profile-manager';
import { ProfileBuilder } from '@voice-framework/builders/profile-builder';
import { DocumentProcessor } from '@voice-framework/processors/document-processor';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize framework components (singleton pattern)
let toneAnalyzer: ToneAnalyzer | null = null;
let patternExtractor: PatternExtractor | null = null;
let shredder: Shredder | null = null;
let textGenerator: TextGenerator | null = null;
let extrapolator: Extrapolator | null = null;
let voiceMatcher: VoiceMatcher | null = null;
let testRunner: TestRunner | null = null;
let textStorage: TextStorage | null = null;
let profileManager: ProfileManager | null = null;
let profileBuilder: ProfileBuilder | null = null;
let documentProcessor: DocumentProcessor | null = null;

let initialized = false;

/**
 * Initialize voice framework components
 */
export async function initializeVoiceFramework() {
  if (initialized) {
    return;
  }

  try {
    // Initialize core components
    toneAnalyzer = new ToneAnalyzer();
    patternExtractor = new PatternExtractor();
    shredder = new Shredder();
    textGenerator = new TextGenerator();
    extrapolator = new Extrapolator();
    voiceMatcher = new VoiceMatcher();
    testRunner = new TestRunner(path.join(__dirname, '../../../voice-framework/test-results'));

    // Initialize storage
    const storageDir = path.join(__dirname, '../../../voice-framework/storage');
    textStorage = new TextStorage(path.join(storageDir, 'text-storage.json'));
    profileManager = new ProfileManager(path.join(storageDir, 'profiles.json'));
    profileBuilder = new ProfileBuilder();
    documentProcessor = new DocumentProcessor(textStorage);

    // Initialize storage systems
    await textStorage.initialize();
    await profileManager.initialize();

    initialized = true;
    console.log('✅ Voice framework initialized');
  } catch (error) {
    console.error('❌ Failed to initialize voice framework:', error);
    throw error;
  }
}

/**
 * Get voice framework components (initializes if needed)
 */
export async function getVoiceFramework() {
  if (!initialized) {
    await initializeVoiceFramework();
  }

  return {
    toneAnalyzer: toneAnalyzer!,
    patternExtractor: patternExtractor!,
    shredder: shredder!,
    textGenerator: textGenerator!,
    extrapolator: extrapolator!,
    voiceMatcher: voiceMatcher!,
    testRunner: testRunner!,
    textStorage: textStorage!,
    profileManager: profileManager!,
    profileBuilder: profileBuilder!,
    documentProcessor: documentProcessor!
  };
}
