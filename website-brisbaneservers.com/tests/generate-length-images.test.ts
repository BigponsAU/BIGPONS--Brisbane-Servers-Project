import { describe, expect, it } from 'vitest';
import { resolveGenerateLength } from '../src/lib/generate-length';
import {
  buildEmbeddedImageMarkdown,
  extractMarkdownImages,
  mergeRelatedImages,
  prependImageFigure,
} from '../src/lib/resource-images';
import { renderMarkdownHtml } from '../src/lib/markdown-render';

describe('resolveGenerateLength', () => {
  it('maps legacy presets to word bands', () => {
    expect(resolveGenerateLength('short').targetWords).toBe(600);
    expect(resolveGenerateLength('medium').targetWords).toBe(1100);
    expect(resolveGenerateLength('long').targetWords).toBe(1600);
    expect(resolveGenerateLength('full').targetWords).toBe(2200);
  });

  it('honours numeric wordCount over length', () => {
    const resolved = resolveGenerateLength('short', 2200);
    expect(resolved.targetWords).toBe(2200);
    expect(resolved.maxTokens).toBeGreaterThan(3000);
  });
});

describe('resource images', () => {
  it('embeds small images as markdown', () => {
    const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    const result = buildEmbeddedImageMarkdown({
      fileName: 'diagram.png',
      mimeType: 'image/png',
      bytes,
      alt: 'Diagram',
    });
    expect(result.embedded).toBe(true);
    expect(result.markdown).toContain('![Diagram](data:image/png;base64,');
  });

  it('prepends figures and merges related images', () => {
    const withTitle = prependImageFigure('# Title\n\nBody text.', '![A](data:image/png;base64,aa)');
    expect(withTitle.startsWith('# Title')).toBe(true);
    expect(withTitle).toContain('![A](data:image/png;base64,aa)');

    const merged = mergeRelatedImages('Just text about payroll.', [
      '![Chart](https://example.com/c.png)',
    ]);
    expect(merged).toContain('## Supporting visuals');
    expect(extractMarkdownImages(merged)).toHaveLength(1);
  });
});

describe('markdown image render', () => {
  it('renders safe image markdown', () => {
    const html = renderMarkdownHtml('See ![Alt](https://example.com/a.png) here');
    expect(html).toContain('<img src="https://example.com/a.png" alt="Alt"');
    expect(html).toContain('markdown-figure');
  });

  it('drops unsafe image protocols', () => {
    const html = renderMarkdownHtml('![x](javascript:alert(1))');
    expect(html).not.toContain('<img');
  });
});
