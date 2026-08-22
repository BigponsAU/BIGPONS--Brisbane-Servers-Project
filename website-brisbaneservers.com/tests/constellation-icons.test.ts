import { describe, expect, it } from 'vitest';
import {
  CONSTELLATION_ICON_INNER,
  CONSTELLATION_ICON_NAMES,
  CONSTELLATION_ICONS,
} from '../src/lib/marketing/constellation-icons';
import { buildSierpinskiSatelliteMarkup } from '../src/lib/sierpinski-satellite';

describe('constellation icons', () => {
  it('has a unique filled mark for every named icon', () => {
    const inners = CONSTELLATION_ICON_NAMES.map((name) => CONSTELLATION_ICON_INNER[name]);
    expect(inners).toHaveLength(15);
    expect(new Set(inners).size).toBe(15);
    for (const inner of inners) {
      expect(inner.length).toBeGreaterThan(40);
      expect(inner).toMatch(/<(path|circle|ellipse)\b/);
    }
  });

  it('is wired into the hero satellite field', () => {
    const markup = buildSierpinskiSatelliteMarkup();
    expect(markup.nodes).toContain('class="satellite-node-icon"');
    expect(markup.nodes).toContain(CONSTELLATION_ICONS[0].slice(0, 40));
    expect(markup.nodes).not.toContain('foreignObject');
    expect(markup.nodes).not.toContain('stroke-width="1.75"');
  });
});
