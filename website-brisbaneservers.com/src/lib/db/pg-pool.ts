/**
 * Shared Postgres pool for auth + corpus (Neon recommended; Supabase also supported).
 * On Cloudflare Workers (Hyperdrive), routes through the `postgres` driver — `pg` Pool times out.
 */
import type { Pool, QueryResult, QueryResultRow } from 'pg';
import { Pool as PgPool } from 'pg';
import { isEdgeWorkerRuntime, withHyperdriveSql } from './edge-hyperdrive-sql';
import { getRuntimeEnv } from '../../utils/runtime-env';

let pool: Pool | null = null;

class EdgeHyperdrivePool {
  async query<R extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<R>> {
    return withHyperdriveSql(async (sql) => {
      const rows = (await sql.unsafe(text, (values ?? []) as never[])) as R[];
      return {
        rows,
        rowCount: rows.length,
        command: '',
        oid: 0,
        fields: [],
      } as QueryResult<R>;
    });
  }
}

let edgePool: EdgeHyperdrivePool | null = null;

export function usePostgres(): boolean {
  return Boolean(getRuntimeEnv('DATABASE_URL')?.trim());
}

export function getPoolSsl(connectionString: string): false | { rejectUnauthorized: boolean } {
  const lower = connectionString.toLowerCase();
  if (lower.includes('sslmode=disable') || lower.includes('ssl=false')) {
    return false;
  }
  if (/@dpg-[a-z0-9]+(?::\d+)?\//i.test(connectionString) && !lower.includes('.render.com')) {
    return false;
  }
  return { rejectUnauthorized: false };
}

export function getSharedPool(): Pool {
  if (isEdgeWorkerRuntime()) {
    if (!edgePool) {
      edgePool = new EdgeHyperdrivePool();
    }
    return edgePool as unknown as Pool;
  }

  if (!pool) {
    const connectionString = getRuntimeEnv('DATABASE_URL');
    if (!connectionString) {
      throw new Error('DATABASE_URL is required for Postgres');
    }
    const ssl = getPoolSsl(connectionString);
    pool = new PgPool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      ...(ssl === false ? {} : { ssl }),
    });
  }
  return pool;
}
