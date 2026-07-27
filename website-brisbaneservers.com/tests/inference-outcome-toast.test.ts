import { describe, expect, it } from 'vitest';
import { describeInferenceOutcome } from '../src/scripts/account-workspace-utils';

describe('describeInferenceOutcome', () => {
  it('uses info toast for fidelity-guard / original / seed fallback', () => {
    expect(
      describeInferenceOutcome({
        verbPast: 'generated',
        inferenceMode: 'original',
        modelId: 'topic-fidelity-guard',
        voiceScore: 0.5,
        topicFidelity: 1,
      }).type
    ).toBe('info');
    expect(
      describeInferenceOutcome({
        verbPast: 'generated',
        modelId: 'topic-seed-fallback',
      }).type
    ).toBe('info');
    expect(
      describeInferenceOutcome({
        verbPast: 'uploaded',
        keptOriginal: true,
      }).message
    ).toMatch(/safeguards/i);
  });

  it('uses success toast for real rewrites', () => {
    const outcome = describeInferenceOutcome({
      verbPast: 'generated',
      inferenceMode: 'nvidia',
      modelId: 'meta/llama',
      voiceScore: 0.72,
      topicFidelity: 0.81,
    });
    expect(outcome.type).toBe('success');
    expect(outcome.message).toMatch(/generated via nvidia/i);
    expect(outcome.message).toMatch(/72%/);
    expect(outcome.message).toMatch(/81%/);
  });
});
