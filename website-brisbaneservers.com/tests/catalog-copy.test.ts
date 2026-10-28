import { describe, expect, it } from 'vitest';
import {
  catalogDescriptionFromArticle,
  displayCatalogDescription,
  isContaminatedCatalogCopy,
} from '../src/lib/catalog-copy';
import { generateResourceCatalogDescription } from '../src/lib/resource-voice-profile';

describe('catalog copy', () => {
  it('rejects design-system filler', () => {
    expect(
      isContaminatedCatalogCopy(
        'Every element creates wave function with mathematical precision precision.',
      ),
    ).toBe(true);
  });

  it('describes the article topic instead of the generator', () => {
    const text = catalogDescriptionFromArticle({
      title: 'Operational Compliance for professional-services',
      industry: 'professional-services',
      topicLabel: 'operational-compliance',
      bodyExcerpt:
        'Every element creates wave function with mathematical precision. This system allows for visual harmony.',
    });
    expect(text.toLowerCase()).toContain('operational compliance');
    expect(text.toLowerCase()).not.toContain('wave function');
  });

  it('generateResourceCatalogDescription stays on-topic', () => {
    const text = generateResourceCatalogDescription({
      title: 'Operational Compliance for professional-services',
      industry: 'professional-services',
      topicLabel: 'operational-compliance',
      bodyExcerpt: 'Practical notes on Operational Compliance for professional-services teams in Australia.',
    });
    expect(text.toLowerCase()).toContain('operational compliance');
    expect(isContaminatedCatalogCopy(text)).toBe(false);
  });

  it('displayCatalogDescription replaces stored jargon', () => {
    const text = displayCatalogDescription({
      description: 'Every element provides visual patterns with all-encompassing precision.',
      title: 'Operational Compliance for professional-services',
      industry: 'professional-services',
      topicLabel: 'operational-compliance',
      bodyExcerpt: 'Practical notes on Operational Compliance for professional-services organisations.',
    });
    expect(text.toLowerCase()).toContain('operational compliance');
    expect(isContaminatedCatalogCopy(text)).toBe(false);
  });
});
