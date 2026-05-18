import { describe, expect, it, vi } from 'vitest';

describe('sitePath', () => {
  it('prefixes internal paths with BASE_URL', async () => {
    vi.stubEnv('BASE_URL', '/BIGPONS--Brisbane-Servers-Project/');
    const { sitePath, stripSiteBase } = await import('../src/lib/site-path.ts');
    expect(sitePath('/about')).toBe('/BIGPONS--Brisbane-Servers-Project/about');
    expect(sitePath('/about#corrections')).toBe('/BIGPONS--Brisbane-Servers-Project/about#corrections');
    expect(sitePath('/')).toBe('/BIGPONS--Brisbane-Servers-Project/');
    expect(sitePath('https://example.com')).toBe('https://example.com');
    expect(stripSiteBase('/BIGPONS--Brisbane-Servers-Project/about/')).toBe('/about/');
    vi.unstubAllEnvs();
  });
});
