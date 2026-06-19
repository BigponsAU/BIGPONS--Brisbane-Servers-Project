import { describe, expect, it } from 'vitest';
import { curatedCaseStudies } from '../src/data/case-studies-curated';
import {
  caseStudyToResource,
  isCaseStudyCorpusResource,
} from '../src/lib/case-study-corpus';

describe('case-study-corpus', () => {
  it('maps curated case study to published resource', () => {
    const study = curatedCaseStudies[0];
    const resource = caseStudyToResource(study);
    expect(resource.id).toBe(`case-study-${study.slug}`);
    expect(resource.status).toBe('published');
    expect(resource.metadata?.growthKind).toBe('case_study');
    expect(resource.content).toContain(study.heroTitle);
    expect(isCaseStudyCorpusResource(resource)).toBe(true);
  });

  it('covers all curated slugs with stable ids', () => {
    for (const study of curatedCaseStudies) {
      expect(caseStudyToResource(study).id).toBe(`case-study-${study.slug}`);
    }
  });
});
