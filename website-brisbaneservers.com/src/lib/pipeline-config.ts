import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '../../../../');
const CONFIG_FILE = path.join(projectRoot, 'voice-framework', 'storage', 'pipeline-config.json');

export interface PipelineConfig {
  autoPublishThreshold: number;
  tokenMultiplier: number;
}

const defaultConfig: PipelineConfig = {
  autoPublishThreshold: 0.8,
  tokenMultiplier: 10
};

async function ensureConfigFile(): Promise<void> {
  try {
    await fs.access(CONFIG_FILE);
  } catch {
    await fs.mkdir(path.dirname(CONFIG_FILE), { recursive: true });
    await fs.writeFile(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));
  }
}

export async function loadPipelineConfig(): Promise<PipelineConfig> {
  await ensureConfigFile();
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    return {
      autoPublishThreshold:
        typeof parsed.autoPublishThreshold === 'number'
          ? parsed.autoPublishThreshold
          : defaultConfig.autoPublishThreshold,
      tokenMultiplier:
        typeof parsed.tokenMultiplier === 'number'
          ? parsed.tokenMultiplier
          : defaultConfig.tokenMultiplier
    };
  } catch {
    return defaultConfig;
  }
}

export async function savePipelineConfig(config: PipelineConfig): Promise<void> {
  await ensureConfigFile();
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}

