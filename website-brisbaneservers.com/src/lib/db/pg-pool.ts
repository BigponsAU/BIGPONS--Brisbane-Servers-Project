/**
 * Shared Postgres pool for auth + corpus (Neon, Supabase, Render Postgres, etc.).
 */
import { Pool } from 'pg';
import { getRuntimeEnv } from '../../utils/runtime-env';

let pool: Pool | null = null;

export function usePostgres(): boolean {
  return Boolean(getRuntimeEnv('DATABASE_URL')?.trim());
}

export function getPoolSsl(connectionString: string): false | { rejectUnauthorized: boolean } {
  const lower = connectionString.toLowerCase();
  if (lower.includes('sslmode=disable') || lower.includes('ssl=false')) {
    return false;
  }
  // Render private network hostname (no public suffix) — no TLS to the DB process.
  if (/@dpg-[a-z0-9]+(?::\d+)?\//i.test(connectionString) && !lower.includes('.render.com')) {
    return false;
  }
  return { rejectUnauthorized: false };
}

export function getSharedPool(): Pool {
  if (!pool) {
    const connectionString = getRuntimeEnv('DATABASE_URL');
    if (!connectionString) {
      throw new Error('DATABASE_URL is required for Postgres');
    }
    const ssl = getPoolSsl(connectionString);
    pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      ...(ssl === false ? {} : { ssl })
    });
  }
  return pool;
}
