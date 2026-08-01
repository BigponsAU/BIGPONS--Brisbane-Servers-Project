import { describe, expect, it } from 'vitest';
import {
  buildFallbackInfographic,
  normalizeInfographicSpec,
} from '../src/lib/resource-infographic';

describe('resource infographic', () => {
  it('builds a valid fallback wiring', () => {
    const spec = buildFallbackInfographic({
      industry: 'healthcare',
      topic: 'patient-portals',
      title: 'Patient portals that stick',
    });
    expect(spec.nodes.length).toBeGreaterThanOrEqual(5);
    expect(spec.edges.length).toBeGreaterThanOrEqual(4);
    expect(spec.viewBox).toBe('0 0 800 300');
  });

  it('normalizes AI JSON and drops bad edges', () => {
    const spec = normalizeInfographicSpec(
      {
        id: 'test',
        title: 'Test model',
        caption: 'Caption here',
        description: 'A diagram',
        nodes: [
          { id: 'hub', x: 400, y: 150, label: 'Hub', kind: 'hub' },
          { id: 'a', x: 120, y: 80, label: 'A', kind: 'node' },
          { id: 'b', x: 680, y: 80, label: 'B', kind: 'outcome' },
        ],
        edges: [
          { from: 'hub', to: 'a' },
          { from: 'hub', to: 'b' },
          { from: 'hub', to: 'missing' },
        ],
      },
      'fallback-id'
    );
    expect(spec).not.toBeNull();
    expect(spec!.edges).toHaveLength(2);
    expect(spec!.nodes).toHaveLength(3);
  });

  it('rejects under-specified diagrams', () => {
    expect(
      normalizeInfographicSpec(
        { title: 'x', nodes: [{ id: 'a', x: 1, y: 1, label: 'A', kind: 'node' }], edges: [] },
        'x'
      )
    ).toBeNull();
  });
});
