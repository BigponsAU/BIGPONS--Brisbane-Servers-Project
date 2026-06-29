import type { Resource } from '../resource-types';
import { CORPUS_DOC_KEYS, readCorpusArray, saveCorpusJson } from '../corpus-store';
import { getResourcesFile } from '../storage-paths';
import type { ResourceRepository } from './resource-repository';

export class PgResourceRepository implements ResourceRepository {
  async loadAll(): Promise<Resource[]> {
    return readCorpusArray<Resource>(CORPUS_DOC_KEYS.RESOURCES, getResourcesFile(), []);
  }

  async saveAll(resources: Resource[]): Promise<void> {
    await saveCorpusJson(CORPUS_DOC_KEYS.RESOURCES, getResourcesFile(), resources);
  }
}
