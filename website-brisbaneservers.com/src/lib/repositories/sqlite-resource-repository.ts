/**
 * SQLite-backed resource store (local Node / dev). Uses sql.js (WASM).
 * Set RESOURCE_STORAGE=sqlite for local Node-style hosting; not suitable for serverless file systems.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { Resource } from '../resource-types';
import { getSqliteDbFile } from '../storage-paths';
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
    const { locateSqlJsFile } = await import('../db/sql-js-locate');
    const SQL = await initSqlJs({
      locateFile: locateSqlJsFile
    });
    mkdirSync(path.dirname(getSqliteDbFile()), { recursive: true });
    let db: InstanceType<typeof SQL.Database>;
    if (existsSync(getSqliteDbFile())) {
      const buf = readFileSync(getSqliteDbFile());
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
    writeFileSync(getSqliteDbFile(), buffer);
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
