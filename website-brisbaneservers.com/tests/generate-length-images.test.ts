import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolveGenerateLength } from '../src/lib/generate-length';
import { buildOnTopicArticle, countWords, rewriteFillerHeadings } from '../src/lib/inference/on-topic-article';
import { buildDocumentStructureSeed, documentChapterTitles } from '../src/lib/inference/article-structure-seed';
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

describe('on-topic article word bands', () => {
  it.each([600, 1100, 1600, 2200] as const)('writes a complete ~%s-word article without padding', (target) => {
    const plan = resolveGenerateLength(undefined, target);
    const article = buildOnTopicArticle({
      industry: 'professional-services',
      topic: 'operational-compliance',
      title: 'Operational Compliance',
      minWords: plan.minWords,
      maxWords: plan.maxWords,
    });
    const words = countWords(article);
    expect(words).toBeGreaterThan(250);
    expect(words).toBeLessThanOrEqual(plan.maxWords + 1);
    expect(article.toLowerCase()).toContain('operational');
    expect(article.toLowerCase()).toContain('compliance');
    expect(article.toLowerCase()).not.toMatch(/wave function|1\.618|cipher/);
    expect(article).not.toMatch(/Going deeper on|Working detail:|Practice note |Pilot notes|before you wide/i);
    const headings = [...article.matchAll(/^#{1,4}\s+(.+)$/gm)].map((m) => m[1].trim().toLowerCase());
    expect(new Set(headings).size).toBe(headings.length);
    expect(article).toMatch(/^## /m);
    const diagramAt = article.indexOf(':::diagram-here:::');
    expect(diagramAt).toBeGreaterThan(article.search(/^## /m));
    expect(article.slice(Math.max(0, diagramAt - 280), diagramAt)).toMatch(/picture|figure|sequence|join|evidence|path/i);
    expect(article.slice(diagramAt, diagramAt + 280)).toMatch(/picture|figure|path|Thursday/i);
  });

  it('composes different outlines for different titles in the same industry', () => {
    const a = buildOnTopicArticle({
      industry: 'professional-services',
      topic: 'operational-compliance',
      title: 'Operational Compliance for Professional Services',
      maxWords: 900,
    });
    const b = buildOnTopicArticle({
      industry: 'professional-services',
      topic: 'practice-management',
      title: 'Practice Management for Professional Services',
      maxWords: 900,
    });
    const heads = (markdown: string) =>
      [...markdown.matchAll(/^##\s+(.+)$/gm)].map((match) => match[1].trim()).join('|');
    expect(heads(a)).not.toBe(heads(b));
    expect(a.toLowerCase()).toContain('compliance');
    expect(b.toLowerCase()).toContain('practice');
  });
});

describe('filler heading rewrite', () => {
  it('replaces repeating Going deeper headings with unique voice titles', () => {
    const rewritten = rewriteFillerHeadings(
      ['# Rosters', '## Going deeper on Rosters', '### Going deeper on Rosters', '## Working detail: Rosters'].join('\n'),
      'rosters',
      'healthcare',
    );
    expect(rewritten).not.toMatch(/Going deeper|Working detail:/i);
    const headings = [...rewritten.matchAll(/^#{1,3}\s+(.+)$/gm)].map((m) => m[1]);
    expect(new Set(headings).size).toBe(headings.length);
    expect(rewritten.toLowerCase()).toContain('healthcare');
  });
});

describe('document structure seed', () => {
  it('varies the spine by this article’s topic while keeping a discussed diagram', () => {
    const retail = buildDocumentStructureSeed({
      industry: 'retail',
      topic: 'e-commerce',
      title: 'E-commerce Integration',
    });
    const health = buildDocumentStructureSeed({
      industry: 'healthcare',
      topic: 'patient-scheduling',
      title: 'Patient scheduling',
    });
    const retailHeads = documentChapterTitles('e commerce', 'retail');
    const healthHeads = documentChapterTitles('patient scheduling', 'healthcare');
    expect(retailHeads.join('|')).not.toBe(healthHeads.join('|'));
    expect(retail).toContain(':::diagram-here:::');
    expect(health).toContain(':::diagram-here:::');
    expect(retail).toMatch(/path a retail client can see/i);
    expect(health).toMatch(/live patient scheduling coverage path/i);
    expect(retail).not.toMatch(/^## Going /m);
    expect(health).toContain('healthcare');
    expect(retail).toContain('retail');
  });

  it('tells Improve to keep this draft’s headings and deepen by importance', () => {
    const src = readFileSync(resolve(__dirname, '../src/lib/inference/prompt-builder.ts'), 'utf8');
    expect(src).not.toMatch(/do not replace the headings/);
    expect(src).toMatch(/Keep existing headings unless they are filler/);
    expect(src).toMatch(/Suggested spine for THIS article only/);
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
