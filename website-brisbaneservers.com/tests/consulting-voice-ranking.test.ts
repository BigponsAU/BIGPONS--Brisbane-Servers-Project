import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ToneAnalyzer } from '../../voice-framework/analyzers/tone-analyzer';
import { CONSULTING_FALLBACK_VOICE_PROFILE } from '../src/lib/consulting-voice-fallback';

const brisbaneLike = {
  ...CONSULTING_FALLBACK_VOICE_PROFILE,
  voiceName: 'Brisbane',
};

describe('consulting voice ranking', () => {
  it('ranks clear healthcare prose above design-system jargon', () => {
    const analyzer = new ToneAnalyzer(brisbaneLike as never);
    const good =
      'Appointment reminders reduce no-shows for Australian medical practices. Waitlists fill cancelled slots and protect chair time.';
    const junk =
      'The cipher system provides vectorized with 1.618 for mathematical precision using Fourier transform and wave function.';

    const goodScore = analyzer.compareToProfile(analyzer.analyzeText(good)).overallMatch;
    const junkScore = analyzer.compareToProfile(analyzer.analyzeText(junk)).overallMatch;

    expect(goodScore).toBeGreaterThan(junkScore);
    expect(analyzer.analyzeText(junk).designJargonHit).toBe(true);
    expect(analyzer.analyzeText(good).designJargonHit).toBe(false);
  });

  it('does not treat arbitrary integers as precision wins', () => {
    const analyzer = new ToneAnalyzer(brisbaneLike as never);
    const withCounts = 'There are 3 clinics and 2 reception desks in the pilot.';
    const analysis = analyzer.analyzeText(withCounts);
    expect(analysis.numericalPrecision.hasSpecificValues).toBe(false);
  });

  it('profiles API no longer synthesizes Design System card', () => {
    const src = readFileSync(
      resolve(__dirname, '../src/pages/_api/profiles/index.ts'),
      'utf8'
    );
    expect(src).not.toContain("id: 'default'");
    expect(src).toContain('design system');
    expect(src).toContain('.filter(');
  });
});
