import { promises as fs } from 'fs';
import * as path from 'path';
import { pid, platform } from 'node:process';
import type { Resource } from '../resource-types';
import { getResourcesFile } from '../storage-paths';
import type { ResourceRepository } from './resource-repository';

async function ensureResourcesFile(): Promise<void> {
  const resourcesFile = getResourcesFile();
  try {
    await fs.access(resourcesFile);
  } catch {
    await fs.mkdir(path.dirname(resourcesFile), { recursive: true });
    await fs.writeFile(resourcesFile, JSON.stringify([], null, 2));
  }
}

export class JsonResourceRepository implements ResourceRepository {
  async loadAll(): Promise<Resource[]> {
    try {
      await ensureResourcesFile();
      const data = await fs.readFile(getResourcesFile(), 'utf-8');
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
    const resourcesFile = getResourcesFile();
    const dir = path.dirname(resourcesFile);
    const base = path.basename(resourcesFile);
    const tmp = path.join(dir, `.${base}.${pid}.${Date.now()}.tmp`);
    const payload = JSON.stringify(resources, null, 2);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(tmp, payload, 'utf-8');
    try {
      if (platform === 'win32') {
        try {
          await fs.rename(tmp, resourcesFile);
        } catch {
          await fs.rm(resourcesFile, { force: true });
          await fs.rename(tmp, resourcesFile);
        }
      } else {
        await fs.rename(tmp, resourcesFile);
      }
    } catch (e) {
      await fs.unlink(tmp).catch(() => {});
      throw e;
    }
  }
}
