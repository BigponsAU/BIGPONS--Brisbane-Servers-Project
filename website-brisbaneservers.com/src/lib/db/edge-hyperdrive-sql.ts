/**
 * Hyperdrive on Cloudflare Workers requires the `postgres` driver (short-lived connections).
 * node-postgres (`pg` Pool) times out when used via Hyperdrive on the edge.
 */
import { getRuntimeEnv } from '../../utils/runtime-env';

export function isEdgeWorkerRuntime(): boolean {
  return getRuntimeEnv('EDGE_WORKER') === '1';
}

type PostgresSql = import('postgres').Sql;

export async function withHyperdriveSql<T>(fn: (sql: PostgresSql) => Promise<T>): Promise<T> {
  const connectionString = getRuntimeEnv('DATABASE_URL')?.trim();
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for Hyperdrive');
  }
  const postgres = (await import('postgres')).default;
  const sql = postgres(connectionString, {
    max: 1,
    prepare: false,
    fetch_types: false,
  });
  try {
    return await fn(sql);
  } finally {
    await sql.end({ timeout: 5 });
  }
}
