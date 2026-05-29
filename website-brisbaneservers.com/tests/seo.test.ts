import { describe, expect, it } from 'vitest';
import {
  buildBreadcrumbListJsonLd,
  buildCanonicalUrl,
  formatPageTitle,
  mergeJsonLdGraph,
  toSitemapLastmod,
} from '../src/lib/seo';

describe('formatPageTitle', () => {
  it('appends brand suffix to short titles', () => {
    expect(formatPageTitle('About')).toBe('About | Brisbane Servers');
  });

  it('normalizes legacy dash suffix', () => {
    expect(formatPageTitle('Services - Brisbane Servers')).toBe('Services | Brisbane Servers');
  });

  it('leaves already-formatted titles unchanged', () => {
    expect(formatPageTitle('Case studies | Brisbane Servers')).toBe('Case studies | Brisbane Servers');
  });

  it('normalizes home legacy title', () => {
    expect(formatPageTitle('Brisbane Servers - Elite Technology Solutions')).toBe(
      'Elite Technology Solutions | Brisbane Servers',
    );
  });
});

describe('buildCanonicalUrl', () => {
  it('joins origin and path', () => {
    expect(buildCanonicalUrl('/about', 'https://brisbaneservers.com')).toBe(
      'https://brisbaneservers.com/about',
    );
  });

  it('prefixes Astro base when path omits it', () => {
    expect(buildCanonicalUrl('/about', 'https://brisbaneservers.com', '/O1/')).toBe(
      'https://brisbaneservers.com/O1/about',
    );
  });
});

describe('buildBreadcrumbListJsonLd', () => {
  it('emits ordered list items with absolute URLs', () => {
    const json = buildBreadcrumbListJsonLd(
      [
        { label: 'Resources', href: '/resources' },
        { label: 'Retail', href: '/resources/retail' },
        { label: 'Inventory' },
      ],
      'https://brisbaneservers.com',
    );

    expect(json['@type']).toBe('BreadcrumbList');
    const items = json.itemListElement as Array<Record<string, unknown>>;
    expect(items).toHaveLength(3);
    expect(items[0].item).toBe('https://brisbaneservers.com/resources');
    expect(items[2].item).toBeUndefined();
  });
});

describe('mergeJsonLdGraph', () => {
  it('filters empty nodes', () => {
    const raw = mergeJsonLdGraph({ '@type': 'WebSite' }, null, undefined);
    const parsed = JSON.parse(raw) as { '@graph': unknown[] };
    expect(parsed['@graph']).toHaveLength(1);
  });
});

describe('toSitemapLastmod', () => {
  it('returns YYYY-MM-DD for valid dates', () => {
    expect(toSitemapLastmod('2026-05-24T12:00:00.000Z')).toBe('2026-05-24');
  });

  it('returns undefined for invalid input', () => {
    expect(toSitemapLastmod('not-a-date')).toBeUndefined();
  });
});
