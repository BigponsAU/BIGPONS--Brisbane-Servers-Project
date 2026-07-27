import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  containsDesignSystemJargon,
  isDesignSystemVoiceProfile,
  isTopicFaithful,
  scoreTopicFidelity,
} from '../src/lib/inference/topic-fidelity';

describe('topic-fidelity', () => {
  it('detects design-system jargon cluster', () => {
    const junk =
      'The cipher system provides vectorized with 1.618 for mathematical precision using Fourier transform.';
    expect(containsDesignSystemJargon(junk)).toBe(true);
  });

  it('does not flag normal healthcare prose', () => {
    const ok =
      'Appointment management reduces no-shows for medical practices across Australia.';
    expect(containsDesignSystemJargon(ok)).toBe(false);
  });

  it('rejects jargon injection as unfaithful when original is clean', () => {
    const original =
      'Appointment Management for Healthcare & Medical Practices. Reduce no-shows and manual scheduling.';
    const junk =
      'The wave function system provides vectorized with 61.8 for comprehensive integration and mathematical precision.';
    expect(isTopicFaithful(original, junk)).toBe(false);
  });

  it('still rejects jargon when the original was already contaminated', () => {
    const original =
      'Appointment management. The cipher system provides vectorized with 1.618 for mathematical precision.';
    const junk =
      'The wave function system provides vectorized with 61.8 for comprehensive integration and mathematical precision.';
    expect(isTopicFaithful(original, junk)).toBe(false);
  });

  it('keeps high fidelity for near-paraphrase healthcare text', () => {
    const original =
      'Appointment management helps healthcare practices reduce no-shows and improve chair time utilisation.';
    const improved =
      'Appointment management helps healthcare practices cut no-shows and improve chair-time utilisation.';
    expect(scoreTopicFidelity(original, improved)).toBeGreaterThan(0.5);
    expect(isTopicFaithful(original, improved)).toBe(true);
  });

  it('recognises design system voice profile by name', () => {
    expect(isDesignSystemVoiceProfile({ voiceName: 'Brisbane Servers Design System Voice' })).toBe(
      true
    );
    expect(isDesignSystemVoiceProfile({ voiceName: 'Brisbane Consulting Voice' })).toBe(false);
  });
});

describe('improve API scopes voice tools to resolved profile', () => {
  it('constructs Extrapolator and VoiceMatcher from resolved.profile', () => {
    const src = readFileSync(
      resolve(__dirname, '../src/pages/_api/resources/[id]/improve.ts'),
      'utf8'
    );
    expect(src).toContain('new Extrapolator(resolved.profile)');
    expect(src).toContain('new VoiceMatcher(resolved.profile)');
    expect(src).not.toMatch(
      /const \{ profileManager, profileBuilder, extrapolator, voiceMatcher \} = await getVoiceFramework\(\)/
    );
  });

  it('process and upload ingest paths also scope Extrapolator to resolved.profile', () => {
    const processSrc = readFileSync(
      resolve(__dirname, '../src/pages/_api/resources/process.ts'),
      'utf8'
    );
    const uploadSrc = readFileSync(
      resolve(__dirname, '../src/pages/_api/resources/upload.ts'),
      'utf8'
    );
    expect(processSrc).toContain('new Extrapolator(resolved.profile)');
    expect(uploadSrc).toContain('new Extrapolator(resolved.profile)');
  });

  it('generate API already scopes the same way', () => {
    const src = readFileSync(
      resolve(__dirname, '../src/pages/_api/resources/generate.ts'),
      'utf8'
    );
    expect(src).toContain('new Extrapolator(resolved.profile)');
    expect(src).toContain('new VoiceMatcher(resolved.profile)');
  });

  it('resource-improve keeps original when topic fidelity fails', () => {
    const src = readFileSync(
      resolve(__dirname, '../src/lib/inference/resource-improve.ts'),
      'utf8'
    );
    expect(src).toContain('isTopicFaithful');
    expect(src).toContain("inferenceMode: 'original'");
    expect(src).toContain('keepOriginal');
  });

  it('generate applies the same purpose-health fidelity guards', () => {
    const src = readFileSync(
      resolve(__dirname, '../src/lib/inference/resource-generate.ts'),
      'utf8'
    );
    expect(src).toContain('isGenerateFaithful');
    expect(src).toContain('minimalSeedFallback');
    expect(src).toContain('isDesignSystemVoiceProfile');
  });

  it('community-upload preserves contributor text and resolves profile', () => {
    const src = readFileSync(
      resolve(__dirname, '../src/pages/_api/resources/community-upload.ts'),
      'utf8'
    );
    expect(src).toContain('resolveResourceVoiceProfile');
    expect(src).toContain('improveResourceBody');
    expect(src).not.toContain('textGenerator.generateText');
    expect(src).toContain('autoPublishEligible');
  });

  it('document rewrite fails closed on structure/fidelity drift', () => {
    const src = readFileSync(
      resolve(__dirname, '../src/lib/documents/voice-document-rewrite.ts'),
      'utf8'
    );
    expect(src).toContain('isStructurePreserved');
    expect(src).toContain('isTopicFaithful');
    expect(src).toContain('keptOriginal');
  });

  it('improve prompt bans design-system jargon', () => {
    const src = readFileSync(
      resolve(__dirname, '../src/lib/inference/prompt-builder.ts'),
      'utf8'
    );
    expect(src).toContain('Do NOT introduce design-system');
    expect(src).toContain('allowDesignSystemJargon');
  });
});

describe('generate fidelity helpers', () => {
  it('rejects jargon and accepts on-topic healthcare generate candidates', async () => {
    const { isGenerateFaithful, isStructurePreserved } = await import(
      '../src/lib/inference/topic-fidelity'
    );
    expect(
      isGenerateFaithful({
        industry: 'healthcare',
        topic: 'appointment-management',
        title: 'Appointment Management',
        seedText: 'Reduce no-shows for medical practices',
        candidate:
          'The cipher system provides vectorized with 1.618 for mathematical precision.',
      })
    ).toBe(false);
    expect(
      isGenerateFaithful({
        industry: 'healthcare',
        topic: 'appointment-management',
        title: 'Appointment Management for Healthcare',
        seedText: 'Reduce no-shows for medical practices across Australia.',
        candidate:
          'Appointment management helps healthcare practices reduce no-shows and improve chair time.',
      })
    ).toBe(true);
    expect(
      isStructurePreserved(
        '# Intro\n\nHello\n\n## Details\n\nMore',
        '# Intro\n\nRewritten\n\n## Details\n\nAlso rewritten'
      )
    ).toBe(true);
    expect(
      isStructurePreserved('# Intro\n\nHello\n\n## Details\n\nMore', 'No headings here at all')
    ).toBe(false);
  });
});
