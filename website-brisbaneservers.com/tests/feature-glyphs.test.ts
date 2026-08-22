import { describe, expect, it } from 'vitest';
import {
  FEATURE_GLYPH_INNER,
  FEATURE_GLYPH_NAMES,
  resolveFeatureGlyph,
} from '../src/lib/marketing/feature-glyphs';

describe('feature glyphs', () => {
  it('has inner SVG for every named glyph', () => {
    for (const name of FEATURE_GLYPH_NAMES) {
      expect(FEATURE_GLYPH_INNER[name]?.length).toBeGreaterThan(10);
    }
  });

  it('resolves purpose names and leftover Font Awesome classes', () => {
    expect(resolveFeatureGlyph('healthcare')).toBe('healthcare');
    expect(resolveFeatureGlyph('fas fa-heartbeat')).toBe('healthcare');
    expect(resolveFeatureGlyph('fa-shield-alt')).toBe('privacy');
    expect(resolveFeatureGlyph('unknown-mark')).toBeUndefined();
  });
});
