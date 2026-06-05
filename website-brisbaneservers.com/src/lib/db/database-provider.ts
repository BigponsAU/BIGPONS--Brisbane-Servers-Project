/**
 * Classify DATABASE_URL host for health checks and ops scripts (no secrets exposed).
 */
export type DatabaseProvider = 'neon' | 'render' | 'supabase' | 'other' | 'none';

export function detectDatabaseProvider(connectionString: string | undefined | null): DatabaseProvider {
  const url = connectionString?.trim();
  if (!url) return 'none';

  const lower = url.toLowerCase();
  if (lower.includes('neon.tech')) return 'neon';
  if (lower.includes('supabase.co') || lower.includes('supabase.com')) return 'supabase';
  if (lower.includes('.render.com') || /@dpg-[a-z0-9]+(?::\d+)?\//i.test(url)) return 'render';

  return 'other';
}

export function isProductionDatabaseProvider(provider: DatabaseProvider): boolean {
  return provider === 'neon' || provider === 'supabase' || provider === 'other';
}
