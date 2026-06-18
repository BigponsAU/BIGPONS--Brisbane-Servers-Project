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
import { TextStorage } from '@voice-framework/storage/text-storage';
import { ProfileManager } from '@voice-framework/storage/profile-manager';
import { ProfileBuilder } from '@voice-framework/builders/profile-builder';
import { DocumentProcessor } from '@voice-framework/processors/document-processor';
import * as path from 'path';
import { voiceFrameworkStorageDir } from '../lib/monorepo-root';

// Initialize framework components (singleton pattern)
let toneAnalyzer: ToneAnalyzer | null = null;
let patternExtractor: PatternExtractor | null = null;
let shredder: Shredder | null = null;
let textGenerator: TextGenerator | null = null;
let extrapolator: Extrapolator | null = null;
let voiceMatcher: VoiceMatcher | null = null;
let textStorage: TextStorage | null = null;
let profileManager: ProfileManager | null = null;
let profileBuilder: ProfileBuilder | null = null;
let documentProcessor: DocumentProcessor | null = null;

let initialized = false;

function isEdgeWorkerRuntime(): boolean {
  try {
    return (
      process.env.EDGE_WORKER === '1' ||
      (typeof navigator !== 'undefined' && /Cloudflare-Workers/i.test(navigator.userAgent ?? ''))
    );
  } catch {
    return process.env.EDGE_WORKER === '1';
  }
}

const EMPTY_PROFILES_DATA = {
  profiles: [],
  version: '1.0.0',
  lastUpdated: new Date().toISOString(),
};

const EMPTY_TEXT_STORAGE_DATA = {
  samples: [],
  principles: [],
  archivedPrinciples: [],
  relationships: [],
  version: '1.0.0',
  lastUpdated: new Date().toISOString(),
};

/**
 * Persist profiles.json mirror into Postgres corpus (edge worker uses /tmp for ProfileManager).
 */
export async function syncVoiceProfilesToCorpus(): Promise<void> {
  const { usePostgres } = await import('../lib/db/pg-pool');
  if (!usePostgres()) return;
  const storageDir = voiceFrameworkStorageDir();
  const { CORPUS_DOC_KEYS, importFileToCorpus } = await import('../lib/corpus-store');
  await importFileToCorpus(CORPUS_DOC_KEYS.PROFILES, path.join(storageDir, 'profiles.json'));
}

/**
 * Initialize voice framework components
 */
export async function initializeVoiceFramework() {
  if (initialized) {
    return;
  }

  try {
    toneAnalyzer = new ToneAnalyzer();
    patternExtractor = new PatternExtractor();
    shredder = new Shredder();
    textGenerator = new TextGenerator();
    extrapolator = new Extrapolator();
    voiceMatcher = new VoiceMatcher();

    const storageDir = voiceFrameworkStorageDir();
    const profilesPath = path.join(storageDir, 'profiles.json');
    const textStoragePath = path.join(storageDir, 'text-storage.json');
    const { CORPUS_DOC_KEYS, exportCorpusToFile, materializeCorpusToEphemeralFile } = await import(
      '../lib/corpus-store'
    );

    if (isEdgeWorkerRuntime()) {
      await materializeCorpusToEphemeralFile(CORPUS_DOC_KEYS.PROFILES, profilesPath, EMPTY_PROFILES_DATA);
      await materializeCorpusToEphemeralFile(
        CORPUS_DOC_KEYS.TEXT_STORAGE,
        textStoragePath,
        EMPTY_TEXT_STORAGE_DATA,
      );
    } else {
      await exportCorpusToFile(CORPUS_DOC_KEYS.PROFILES, profilesPath);
      await exportCorpusToFile(CORPUS_DOC_KEYS.TEXT_STORAGE, textStoragePath);
    }

    textStorage = new TextStorage(textStoragePath);
    profileManager = new ProfileManager(profilesPath);
    profileBuilder = new ProfileBuilder();
    documentProcessor = new DocumentProcessor(textStorage);

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
    textStorage: textStorage!,
    profileManager: profileManager!,
    profileBuilder: profileBuilder!,
    documentProcessor: documentProcessor!,
  };
}
