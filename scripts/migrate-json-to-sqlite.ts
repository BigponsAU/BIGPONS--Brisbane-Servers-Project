/**
 * One-off: copy resources.json into SQLite (RESOURCE_STORAGE=sqlite).
 * Run from repo root: npx tsx scripts/migrate-json-to-sqlite.ts
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const jsonPath = path.join(projectRoot, 'voice-framework', 'storage', 'resources.json');
const dbPath = path.join(projectRoot, 'voice-framework', 'storage', 'resources.db');

async function main() {
  const initSqlJs = (await import('sql.js')).default;
  const wasmDir = path.join(projectRoot, 'website-brisbaneservers.com/node_modules/sql.js/dist');
  const SQL = await initSqlJs({
    locateFile: (file: string) => path.join(wasmDir, file)
  });

  const raw = readFileSync(jsonPath, 'utf-8');
  const resources = JSON.parse(raw) as Array<{ id: string }>;
  if (!Array.isArray(resources)) {
    throw new Error('resources.json must be an array');
  }

  mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new SQL.Database();
  db.run(
    `CREATE TABLE IF NOT EXISTS resources (
      id TEXT PRIMARY KEY NOT NULL,
      payload TEXT NOT NULL
    )`
  );
  db.run('DELETE FROM resources');
  const stmt = db.prepare('INSERT INTO resources (id, payload) VALUES (?, ?)');
  for (const r of resources) {
    stmt.run([r.id, JSON.stringify(r)]);
  }
  stmt.free();
  const data = db.export();
  writeFileSync(dbPath, Buffer.from(data));
  console.log(`Migrated ${resources.length} resources to ${dbPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
