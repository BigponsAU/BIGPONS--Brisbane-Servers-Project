import { describe, expect, it } from 'vitest';
import { detectDatabaseProvider, isProductionDatabaseProvider } from '../src/lib/db/database-provider';

describe('detectDatabaseProvider', () => {
  it('detects Neon pooled URLs', () => {
    expect(
      detectDatabaseProvider(
        'postgresql://u:p@ep-abc-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require'
      )
    ).toBe('neon');
  });

  it('detects Render Postgres URLs', () => {
    expect(
      detectDatabaseProvider('postgresql://u:p@dpg-abc123-a.oregon-postgres.render.com/db')
    ).toBe('render');
  });

  it('returns none when unset', () => {
    expect(detectDatabaseProvider(undefined)).toBe('none');
  });
});

describe('isProductionDatabaseProvider', () => {
  it('accepts Neon as durable production DB', () => {
    expect(isProductionDatabaseProvider('neon')).toBe(true);
  });

  it('rejects Render free Postgres', () => {
    expect(isProductionDatabaseProvider('render')).toBe(false);
  });
});
