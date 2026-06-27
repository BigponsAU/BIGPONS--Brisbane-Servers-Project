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

/**
 * Persist ProfileManager state into Postgres corpus (edge: no filesystem mirror).
 */
export async function syncVoiceProfilesToCorpus(manager?: ProfileManager): Promise<void> {
  const { usePostgres } = await import('../lib/db/pg-pool');
  if (!usePostgres()) return;
  const { saveProfilesData } = await import('../lib/profiles-api');

  if (manager) {
    await saveProfilesData(manager.serializeForCorpus() as unknown as import('../lib/profiles-api').ProfilesData);
    return;
  }

  const storageDir = voiceFrameworkStorageDir();
  const profilesPath = path.join(storageDir, 'profiles.json');
  const { promises: fs } = await import('fs');
  try {
    const raw = await fs.readFile(profilesPath, 'utf-8');
    const data = JSON.parse(raw);
    await saveProfilesData(data);
  } catch {
    /* ProfileManager has not flushed to disk yet */
  }
}

/** Persist text-storage (principles, samples) into Postgres corpus. */
export async function syncVoiceTextStorageToCorpus(): Promise<void> {
  const { usePostgres } = await import('../lib/db/pg-pool');
  if (!usePostgres() || !textStorage) return;
  const { saveTextStorageData } = await import('../lib/text-storage-api');
  const exported = textStorage.export();
  const serializable = JSON.parse(JSON.stringify(exported)) as import('../lib/text-storage-api').TextStorageJsonData;
  await saveTextStorageData(serializable);
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
    const { CORPUS_DOC_KEYS, exportCorpusToFile } = await import('../lib/corpus-store');

    profileManager = new ProfileManager(profilesPath);
    textStorage = new TextStorage(textStoragePath);

    if (isEdgeWorkerRuntime()) {
      const { loadProfilesData } = await import('../lib/profiles-api');
      const { loadTextStorageData } = await import('../lib/text-storage-api');
      profileManager.hydrateFromStoredJson(await loadProfilesData() as unknown as Parameters<ProfileManager['hydrateFromStoredJson']>[0]);
      textStorage.hydrateFromStoredJson(await loadTextStorageData() as unknown as Record<string, unknown>);
    } else {
      await exportCorpusToFile(CORPUS_DOC_KEYS.PROFILES, profilesPath);
      await exportCorpusToFile(CORPUS_DOC_KEYS.TEXT_STORAGE, textStoragePath);
    }

    textStorage.setOnAfterSave(() => syncVoiceTextStorageToCorpus());
    profileManager.setOnAfterSave(() => syncVoiceProfilesToCorpus(profileManager!));

    await textStorage.initialize();
    await profileManager.initialize();

    profileBuilder = new ProfileBuilder();
    documentProcessor = new DocumentProcessor(textStorage);

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
