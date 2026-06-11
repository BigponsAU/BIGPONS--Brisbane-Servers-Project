import type { Resource } from '../resource-types';
import { CORPUS_DOC_KEYS, readCorpusJson, saveCorpusJson } from '../corpus-store';
import { getResourcesFile } from '../storage-paths';
import type { ResourceRepository } from './resource-repository';

export class PgResourceRepository implements ResourceRepository {
  async loadAll(): Promise<Resource[]> {
    const resources = await readCorpusJson<Resource[]>(CORPUS_DOC_KEYS.RESOURCES, getResourcesFile(), []);
    return Array.isArray(resources) ? resources : [];
  }

  async saveAll(resources: Resource[]): Promise<void> {
    await saveCorpusJson(CORPUS_DOC_KEYS.RESOURCES, getResourcesFile(), resources);
  }
}
