import * as path from 'path';
import { CORPUS_DOC_KEYS, readCorpusJson, saveCorpusJson } from './corpus-store';
import { voiceFrameworkStorageDir } from './monorepo-root';

const CONFIG_FILE = path.join(voiceFrameworkStorageDir(), 'pipeline-config.json');

export interface PipelineConfig {
  autoPublishThreshold: number;
  tokenMultiplier: number;
}

const defaultConfig: PipelineConfig = {
  autoPublishThreshold: 0.8,
  tokenMultiplier: 10,
};

export async function loadPipelineConfig(): Promise<PipelineConfig> {
  const parsed = await readCorpusJson<Partial<PipelineConfig>>(
    CORPUS_DOC_KEYS.PIPELINE_CONFIG,
    CONFIG_FILE,
    defaultConfig
  );
  return {
    autoPublishThreshold:
      typeof parsed.autoPublishThreshold === 'number'
        ? parsed.autoPublishThreshold
        : defaultConfig.autoPublishThreshold,
    tokenMultiplier:
      typeof parsed.tokenMultiplier === 'number'
        ? parsed.tokenMultiplier
        : defaultConfig.tokenMultiplier,
  };
}

export async function savePipelineConfig(config: PipelineConfig): Promise<void> {
  await saveCorpusJson(CORPUS_DOC_KEYS.PIPELINE_CONFIG, CONFIG_FILE, config);
}
