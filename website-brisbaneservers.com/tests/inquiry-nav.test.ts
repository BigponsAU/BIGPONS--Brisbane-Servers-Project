import { describe, expect, it } from 'vitest';
import { inquiryNavHref } from '../src/lib/inquiry-nav';

function mockSitePath(path: string): string {
  if (path.startsWith('http')) return path;
  return path;
}

describe('inquiryNavHref', () => {
  it('links account routes to home inquiry section', () => {
    expect(inquiryNavHref('/account', mockSitePath)).toBe('/#inquiry-section');
    expect(inquiryNavHref('/account/', mockSitePath)).toBe('/#inquiry-section');
  });

  it('uses on-page inquiry anchors when the page has a form', () => {
    expect(inquiryNavHref('/case-studies', mockSitePath)).toBe('/case-studies#inquiry-section');
    expect(inquiryNavHref('/resources/professional-services', mockSitePath)).toBe(
      '/resources/professional-services#inquiry-section',
    );
    expect(inquiryNavHref('/services', mockSitePath)).toBe('/services#consultation');
  });

  it('falls back to home inquiry for pages without a form section', () => {
    expect(inquiryNavHref('/projects', mockSitePath)).toBe('/#inquiry-section');
    expect(inquiryNavHref('/contact', mockSitePath)).toBe('/#inquiry-section');
  });
});
