import { describe, expect, it } from 'vitest';
import { wrapMarkdownDocument } from '../src/lib/markdown-render';
import { appendDiagramMarker, diagramMarker } from '../src/lib/resource-infographics';
import { buildFallbackInfographic } from '../src/lib/resource-infographic';

describe('markdown diagrams', () => {
  it('injects SVG wiring for diagram markers', () => {
    const spec = buildFallbackInfographic({
      industry: 'professional-services',
      topic: 'operational-compliance',
      title: 'Operational Compliance',
    });
    const html = wrapMarkdownDocument(`Intro\n\n${diagramMarker(spec.id)}\n\nOutro`, [spec]);
    expect(html).toContain('workspace-diagram');
    expect(html).toContain(spec.title);
    expect(html).not.toContain(':::diagram');
  });

  it('appends a marker only once', () => {
    const once = appendDiagramMarker('Hello', 'wiring-1');
    const twice = appendDiagramMarker(once, 'wiring-1');
    expect(once).toContain(diagramMarker('wiring-1'));
    expect(twice).toBe(once);
  });
});
