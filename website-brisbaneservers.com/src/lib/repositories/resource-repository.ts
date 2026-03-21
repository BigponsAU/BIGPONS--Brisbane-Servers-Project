import type { Resource } from '../resource-types';

export interface ResourceRepository {
  loadAll(): Promise<Resource[]>;
  saveAll(resources: Resource[]): Promise<void>;
}
