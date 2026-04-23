/**
 * Canonical filesystem paths for local Node-backed storage.
 * Not durable on ephemeral/serverless file systems; use an external database in production.
 */

import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '../../../');

export const RESOURCES_FILE = path.join(projectRoot, 'voice-framework', 'storage', 'resources.json');
export const SEMANTIC_INDEX_FILE = path.join(projectRoot, 'voice-framework', 'storage', 'semantic-index.json');
export const SQLITE_DB_FILE = path.join(projectRoot, 'voice-framework', 'storage', 'resources.db');
export const AUTH_SQLITE_DB_FILE = path.join(projectRoot, 'voice-framework', 'storage', 'auth.db');
