import { promises as fs } from 'fs';
import * as path from 'path';
import type { Resource } from '../resource-types';
import { RESOURCES_FILE } from '../storage-paths';
import type { ResourceRepository } from './resource-repository';

async function ensureResourcesFile(): Promise<void> {
  try {
    await fs.access(RESOURCES_FILE);
  } catch {
    await fs.mkdir(path.dirname(RESOURCES_FILE), { recursive: true });
    await fs.writeFile(RESOURCES_FILE, JSON.stringify([], null, 2));
  }
}

export class JsonResourceRepository implements ResourceRepository {
  async loadAll(): Promise<Resource[]> {
    try {
      await ensureResourcesFile();
      const data = await fs.readFile(RESOURCES_FILE, 'utf-8');
      const resources = JSON.parse(data);
      if (!Array.isArray(resources)) {
        return [];
      }
      return resources as Resource[];
    } catch (error) {
      console.error('[JsonResourceRepository] Error loading resources:', error);
      return [];
    }
  }

  async saveAll(resources: Resource[]): Promise<void> {
    await fs.mkdir(path.dirname(RESOURCES_FILE), { recursive: true });
    await fs.writeFile(RESOURCES_FILE, JSON.stringify(resources, null, 2));
  }
}
