/**
 * Canonical filesystem paths for JSON-backed storage (local dev / Node SSR).
 * Not durable on Cloudflare Workers; use JSON binding or external DB in production.
 */

import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '../../../../');

export const RESOURCES_FILE = path.join(projectRoot, 'voice-framework', 'storage', 'resources.json');
export const SEMANTIC_INDEX_FILE = path.join(projectRoot, 'voice-framework', 'storage', 'semantic-index.json');
export const SQLITE_DB_FILE = path.join(projectRoot, 'voice-framework', 'storage', 'resources.db');
