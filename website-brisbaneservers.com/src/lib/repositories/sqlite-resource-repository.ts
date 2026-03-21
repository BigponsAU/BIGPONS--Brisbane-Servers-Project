/**
 * SQLite-backed resource store (local Node / dev). Uses sql.js (WASM).
 * Set RESOURCE_STORAGE=sqlite. On Cloudflare Workers use json or D1 — not this driver.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { Resource } from '../resource-types';
import { SQLITE_DB_FILE } from '../storage-paths';
import type { ResourceRepository } from './resource-repository';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class SqliteResourceRepository implements ResourceRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private db: any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private constructor(db: any) {
    this.db = db;
  }

  static async create(): Promise<SqliteResourceRepository> {
    const initSqlJs = (await import('sql.js')).default;
    const wasmDir = path.join(__dirname, '../../../node_modules/sql.js/dist');
    const SQL = await initSqlJs({
      locateFile: (file: string) => path.join(wasmDir, file)
    });
    mkdirSync(path.dirname(SQLITE_DB_FILE), { recursive: true });
    let db: InstanceType<typeof SQL.Database>;
    if (existsSync(SQLITE_DB_FILE)) {
      const buf = readFileSync(SQLITE_DB_FILE);
      db = new SQL.Database(buf);
    } else {
      db = new SQL.Database();
    }
    db.run(
      `CREATE TABLE IF NOT EXISTS resources (
        id TEXT PRIMARY KEY NOT NULL,
        payload TEXT NOT NULL
      )`
    );
    return new SqliteResourceRepository(db);
  }

  private persist(): void {
    const data = this.db.export();
    const buffer = Buffer.from(data);
    writeFileSync(SQLITE_DB_FILE, buffer);
  }

  async loadAll(): Promise<Resource[]> {
    const stmt = this.db.prepare('SELECT payload FROM resources ORDER BY id');
    const rows: Resource[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as { payload: string };
      try {
        rows.push(JSON.parse(row.payload) as Resource);
      } catch {
        // skip bad row
      }
    }
    stmt.free();
    return rows;
  }

  async saveAll(resources: Resource[]): Promise<void> {
    this.db.run('BEGIN');
    try {
      this.db.run('DELETE FROM resources');
      const stmt = this.db.prepare('INSERT INTO resources (id, payload) VALUES (?, ?)');
      for (const r of resources) {
        stmt.run([r.id, JSON.stringify(r)]);
      }
      stmt.free();
      this.db.run('COMMIT');
    } catch (e) {
      this.db.run('ROLLBACK');
      throw e;
    }
    this.persist();
  }
}
