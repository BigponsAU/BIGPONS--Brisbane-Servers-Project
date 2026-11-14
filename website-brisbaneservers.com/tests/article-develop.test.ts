import { describe, expect, it } from 'vitest';
import { detectArticleShape, planArticleStructure } from '../src/lib/inference/article-structure-seed';
import { countWords, developArticle, fillArticleToBand } from '../src/lib/inference/article-develop';

describe('article shape', () => {
  it('picks a shape from the topic rather than a shared template', () => {
    expect(detectArticleShape({ topic: 'patient-scheduling', industry: 'healthcare' })).toBe('roster');
    expect(detectArticleShape({ topic: 'e-commerce', industry: 'retail' })).toBe('client');
    expect(detectArticleShape({ topic: 'operational-compliance', industry: 'professional-services' })).toBe(
      'sequence',
    );
    expect(detectArticleShape({ topic: 'clinical-handover', industry: 'healthcare' })).toBe('handover');
  });

  it('keeps existing headings when developing a draft', () => {
    const plan = planArticleStructure({
      industry: 'healthcare',
      topic: 'rosters',
      existingMarkdown: '# Rosters\n\n## Who covers Thursday\n\nBody.\n\n## The live roster path\n\nJoin.\n',
    });
    expect(plan.sections.map((section) => section.title)).toContain('Who covers Thursday');
    expect(plan.sections.find((section) => section.diagram)?.title).toMatch(/live roster path/i);
  });
});

describe('develop article', () => {
  const draft = [
    '# Rosters',
    '',
    'Thesis.',
    '',
    '## Who covers Thursday',
    '',
    'The main claim.',
    '',
    '## Keep judgment on the swap',
    '',
    'Close.',
  ].join('\n');

  it('deepens the selected section without cloning a heading', () => {
    const next = developArticle({
      content: draft,
      industry: 'healthcare',
      topic: 'rosters',
      mode: 'expand',
      heading: 'Who covers Thursday',
    });
    expect(next).toContain('## Who covers Thursday');
    expect(countWords(next)).toBeGreaterThan(countWords(draft));
    expect([...next.matchAll(/^## /gm)]).toHaveLength(2);
  });

  it('adds a supporting subsection under the current point', () => {
    const next = developArticle({
      content: draft,
      industry: 'healthcare',
      topic: 'rosters',
      mode: 'support',
      heading: 'Who covers Thursday',
    });
    expect(next).toMatch(/^### /m);
    expect(next.indexOf('### ')).toBeGreaterThan(next.indexOf('## Who covers Thursday'));
    expect(next.indexOf('### ')).toBeLessThan(next.indexOf('## Keep judgment on the swap'));
  });

  it('fills length by deepening instead of appending a canned spine', () => {
    const filled = fillArticleToBand(draft, {
      industry: 'healthcare',
      topic: 'rosters',
      title: 'Rosters',
      minWords: 220,
      maxWords: 400,
    });
    expect(filled).toContain('## Who covers Thursday');
    expect(filled).not.toMatch(/Why rosters is the operating problem/i);
    expect(countWords(filled)).toBeGreaterThanOrEqual(220);
  });
});

