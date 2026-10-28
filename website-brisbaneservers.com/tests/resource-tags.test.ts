import { describe, expect, it } from 'vitest';
import type { Resource } from '../src/lib/resource-types';
import {
  isValidTagSlug,
  prepareIndustryForResourceWrite,
  buildTagDraftResource,
  upsertIndustryTagProposal,
} from '../src/lib/resource-tags';

const draft = (overrides: Partial<Resource> = {}): Resource => ({
  id: 'r1',
  industry: 'professional-services',
  topic: 'operational-compliance',
  title: 'Operational Compliance',
  description: 'Notes',
  content: 'Body',
  generatedAt: new Date().toISOString(),
  version: 1,
  status: 'draft',
  ownerId: 'user-1',
  ...overrides,
});

describe('resource tags', () => {
  it('accepts short hyphenated industry names', () => {
    expect(isValidTagSlug('legal-services')).toBe(true);
    expect(isValidTagSlug('ab')).toBe(false);
  });

  it('lets authors draft a custom industry without publishing', () => {
    const result = prepareIndustryForResourceWrite({
      industry: 'Legal Services',
      resources: [],
      userId: 'user-1',
      isAdmin: false,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.industry).toBe('legal-services');
      expect(result.tagProposal?.status).toBe('pending');
    }
  });

  it('blocks publish until the custom tag is approved', () => {
    const result = prepareIndustryForResourceWrite({
      industry: 'legal-services',
      resources: [draft({ industry: 'legal-services' })],
      userId: 'user-1',
      isAdmin: false,
      publishing: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('TAG_PENDING');
  });

  it('auto-approves when an admin publishes', () => {
    const result = prepareIndustryForResourceWrite({
      industry: 'legal-services',
      resources: [],
      userId: 'admin-1',
      isAdmin: true,
      publishing: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.tagProposal?.status).toBe('approved');
  });

  it('builds a hidden tag draft stub', () => {
    const stub = buildTagDraftResource({
      slug: 'legal-services',
      label: 'Legal Services',
      userId: 'user-1',
    });
    expect(stub.metadata?.tagDraftOnly).toBe(true);
    expect(stub.topic).toBe('tag-proposal');
    expect(stub.metadata?.tagProposal?.status).toBe('pending');
  });

  it('queues an author industry as an application', () => {
    const result = upsertIndustryTagProposal({
      label: 'Legal Services',
      resources: [],
      userId: 'user-1',
      userEmail: 'author@example.com',
      isAdmin: false,
    });
    expect(result.tag.status).toBe('pending');
    expect(result.resources).toHaveLength(1);
    expect(result.resources[0].metadata?.tagProposal?.status).toBe('pending');
  });

  it('lets an admin create an approved catalog industry', () => {
    const result = upsertIndustryTagProposal({
      label: 'Legal Services',
      resources: [],
      userId: 'admin-1',
      userEmail: 'admin@example.com',
      isAdmin: true,
    });
    expect(result.tag.status).toBe('approved');
    expect(result.resources[0].id).toContain('tag-catalog-');
    expect(result.resources[0].metadata?.tagProposal?.status).toBe('approved');
  });
});
