import { describe, expect, it } from 'vitest';
import { industryLabel } from '../src/scripts/account-workspace-voice-features';

describe('voice map industryLabel', () => {
  it('uses human labels for known industry slugs', () => {
    expect(industryLabel('retail')).toBe('Retail');
    expect(industryLabel('professional-services')).toBe('Professional services');
    expect(industryLabel('healthcare')).toBe('Healthcare');
  });

  it('does not prefer coverage.name when it is only the slug', () => {
    expect(
      industryLabel('retail', [{ id: 'retail', name: 'retail', indexedCount: 1, status: 'covered' }]),
    ).toBe('Retail');
  });

  it('title-cases unknown slugs', () => {
    expect(industryLabel('custom-vertical')).toBe('Custom Vertical');
  });
});
