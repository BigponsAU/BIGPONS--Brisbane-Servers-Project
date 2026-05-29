import type { Resource } from '../resource-types';
import { CORPUS_DOC_KEYS, readCorpusJson, saveCorpusJson } from '../corpus-store';
import { RESOURCES_FILE } from '../storage-paths';
import type { ResourceRepository } from './resource-repository';

export class PgResourceRepository implements ResourceRepository {
  async loadAll(): Promise<Resource[]> {
    const resources = await readCorpusJson<Resource[]>(CORPUS_DOC_KEYS.RESOURCES, RESOURCES_FILE, []);
    return Array.isArray(resources) ? resources : [];
  }

  async saveAll(resources: Resource[]): Promise<void> {
    await saveCorpusJson(CORPUS_DOC_KEYS.RESOURCES, RESOURCES_FILE, resources);
  }
}
