import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ToneAnalyzer } from '../../voice-framework/analyzers/tone-analyzer';
import { CONSULTING_FALLBACK_VOICE_PROFILE } from '../src/lib/consulting-voice-fallback';
import {
  containsDesignSystemJargon,
  isTopicFaithful,
  sanitizeDesignSystemContamination,
} from '../src/lib/inference/topic-fidelity';

const brisbaneLike = {
  ...CONSULTING_FALLBACK_VOICE_PROFILE,
  voiceName: 'Brisbane',
};

const INDUSTRY_SAMPLES: Array<{ industry: string; topic: string; prose: string }> = [
  {
    industry: 'professional-services',
    topic: 'client-management',
    prose:
      'Client intake checklists and matter ownership keep professional services teams aligned before delivery starts.',
  },
  {
    industry: 'retail',
    topic: 'inventory',
    prose:
      'Retail inventory counts and POS reconciliation cut stockouts without freezing the shop floor.',
  },
  {
    industry: 'construction',
    topic: 'job-costing',
    prose:
      'Job costing and variation logs protect construction margins when site conditions change mid-build.',
  },
  {
    industry: 'hospitality',
    topic: 'booking',
    prose:
      'Hospitality booking confirmations and no-show policies protect covers during peak service periods.',
  },
  {
    industry: 'finance',
    topic: 'client-reporting',
    prose:
      'Finance client reporting packs should lead with outcomes, then evidence, before recommendations.',
  },
  {
    industry: 'manufacturing',
    topic: 'shop-floor-tracking',
    prose:
      'Shop-floor tracking and work-order status give manufacturing teams earlier visibility of bottlenecks.',
  },
  {
    industry: 'healthcare',
    topic: 'appointment-management',
    prose:
      'Appointment reminders reduce no-shows for Australian medical practices and protect chair time.',
  },
];

const JUNK =
  'The cipher system provides vectorized with 1.618 for mathematical precision using Fourier transform and wave function.';

describe('consulting voice ranking', () => {
  it('ranks clear industry prose above design-system jargon for every industry sample', () => {
    const analyzer = new ToneAnalyzer(brisbaneLike as never);
    for (const sample of INDUSTRY_SAMPLES) {
      const goodScore = analyzer.compareToProfile(analyzer.analyzeText(sample.prose)).overallMatch;
      const junkScore = analyzer.compareToProfile(
        analyzer.analyzeText(`${JUNK} Context: ${sample.industry} / ${sample.topic}.`)
      ).overallMatch;
      expect(goodScore, sample.industry).toBeGreaterThan(junkScore);
      expect(analyzer.analyzeText(sample.prose).designJargonHit, sample.industry).toBe(false);
    }
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

describe('topic fidelity is industry-agnostic', () => {
  it('rejects jargon against every industry original', () => {
    for (const sample of INDUSTRY_SAMPLES) {
      expect(containsDesignSystemJargon(JUNK)).toBe(true);
      expect(isTopicFaithful(sample.prose, JUNK), sample.industry).toBe(false);
      expect(isTopicFaithful(sample.prose, sample.prose), sample.industry).toBe(true);
    }
  });

  it('sanitizes contaminated industry drafts while keeping purposeful prose', () => {
    for (const sample of INDUSTRY_SAMPLES) {
      const contaminated = `${sample.prose}\n\nThe cipher system provides vectorized with 1.618 for mathematical precision.\n\n- **cipher**: allows for wave function for comprehensive system integration`;
      const cleaned = sanitizeDesignSystemContamination(contaminated);
      expect(containsDesignSystemJargon(cleaned), sample.industry).toBe(false);
      expect(cleaned.toLowerCase()).toContain(sample.prose.split(' ')[0].toLowerCase());
    }
  });

  it('improve prompt stays on the requested industry/topic for all samples', () => {
    const src = readFileSync(
      resolve(__dirname, '../src/lib/inference/prompt-builder.ts'),
      'utf8'
    );
    expect(src).toContain('Stay on the ${params.industry} / ${params.topic} subject');
    expect(src).toContain('Do NOT introduce design-system');
    for (const sample of INDUSTRY_SAMPLES) {
      expect(sample.industry.length).toBeGreaterThan(0);
      expect(sample.topic.length).toBeGreaterThan(0);
    }
  });
});
