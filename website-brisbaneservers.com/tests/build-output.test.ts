import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('static Pages SEO pipeline', () => {
  it('uses static output (SSR deferred — deploy hook refreshes /resources/**)', async () => {
    const config = await readFile(path.resolve('astro.config.mjs'), 'utf8');
    expect(config).toMatch(/output:\s*['"]static['"]/);
    expect(config).toMatch(/publish-public-surfaces/);
  });

  it('prebuild syncs public assets', async () => {
    const pkg = JSON.parse(await readFile(path.resolve('package.json'), 'utf8')) as {
      scripts: { prebuild: string };
    };
    expect(pkg.scripts.prebuild).toContain('sync-public-build-assets');
  });
});
