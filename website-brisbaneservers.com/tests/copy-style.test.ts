import { describe, expect, it } from 'vitest';
import { formatHeadingCopy } from '../src/lib/copy-style';
import { buildSierpinskiSatelliteMarkup } from '../src/lib/sierpinski-satellite';

describe('formatHeadingCopy', () => {
  it('title-cases underlined section and card titles', () => {
    expect(formatHeadingCopy('Our core services')).toBe('Our Core Services');
    expect(formatHeadingCopy('Web development and digital presence')).toBe(
      'Web Development And Digital Presence',
    );
    expect(formatHeadingCopy('IT consulting and ongoing support')).toBe(
      'IT Consulting And Ongoing Support',
    );
    expect(formatHeadingCopy('Client management systems')).toBe('Client Management Systems');
  });

  it('keeps all-caps acronyms intact', () => {
    expect(formatHeadingCopy('POS integration')).toBe('POS Integration');
    expect(formatHeadingCopy('Inventory & POS systems')).toBe('Inventory & POS Systems');
  });
});

describe('hero satellite marks', () => {
  it('renders compact filled icons instead of stroke glyphs', () => {
    const markup = buildSierpinskiSatelliteMarkup();
    expect(markup.nodes).toContain('class="satellite-node-icon"');
    expect(markup.nodes).toContain('fill="#fff"');
    expect(markup.nodes).not.toContain('stroke-width="1.75"');
    expect(markup.nodes).not.toContain('foreignObject');
  });
});
