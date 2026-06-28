import { describe, expect, it, vi } from 'vitest';

describe('sitePath', () => {
  it('prefixes internal paths with BASE_URL', async () => {
    vi.stubEnv('BASE_URL', '/BIGPONS--Brisbane-Servers-Project/');
    vi.resetModules();
    const { sitePath, stripSiteBase } = await import('../src/lib/site-path.ts');
    expect(sitePath('/about')).toBe('/BIGPONS--Brisbane-Servers-Project/about');
    expect(sitePath('/about#corrections')).toBe('/BIGPONS--Brisbane-Servers-Project/about#corrections');
    expect(sitePath('/')).toBe('/BIGPONS--Brisbane-Servers-Project/');
    expect(sitePath('/#inquiry-section')).toBe('/BIGPONS--Brisbane-Servers-Project#inquiry-section');
    expect(sitePath('https://example.com')).toBe('https://example.com');
    expect(stripSiteBase('/BIGPONS--Brisbane-Servers-Project/about/')).toBe('/about/');
    vi.unstubAllEnvs();
  });

  it('keeps root hash links on the site root, not the current page', async () => {
    vi.stubEnv('BASE_URL', '/');
    vi.resetModules();
    const { sitePath } = await import('../src/lib/site-path.ts');
    expect(sitePath('/#inquiry-section')).toBe('/#inquiry-section');
    expect(sitePath('/case-studies#inquiry-section')).toBe('/case-studies#inquiry-section');
    vi.unstubAllEnvs();
  });

  it('normalizes search-index URLs and applies BASE_URL', async () => {
    vi.stubEnv('BASE_URL', '/BIGPONS--Brisbane-Servers-Project/');
    vi.resetModules();
    const { resolveContentPath } = await import('../src/lib/site-path.ts');
    expect(resolveContentPath('resources/professional-services/index.html')).toBe(
      '/BIGPONS--Brisbane-Servers-Project/resources/professional-services/',
    );
    expect(resolveContentPath('/about')).toBe('/BIGPONS--Brisbane-Servers-Project/about');
    expect(resolveContentPath('https://example.com/x')).toBe('https://example.com/x');
    expect(resolveContentPath('#')).toBe('#');
    vi.unstubAllEnvs();
  });
});
