/**
 * Canonical filesystem paths for local Node-backed storage.
 * Not durable on ephemeral/serverless file systems; use an external database in production.
 */

import * as path from 'path';
import { getMonorepoRoot } from './monorepo-root';

const storageDir = path.join(getMonorepoRoot(), 'voice-framework', 'storage');

export const RESOURCES_FILE = path.join(storageDir, 'resources.json');
export const SEMANTIC_INDEX_FILE = path.join(storageDir, 'semantic-index.json');
export const SQLITE_DB_FILE = path.join(storageDir, 'resources.db');
export const AUTH_SQLITE_DB_FILE = path.join(storageDir, 'auth.db');
