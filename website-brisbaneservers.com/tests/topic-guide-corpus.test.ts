import { describe, expect, it } from 'vitest';
import { industries } from '../src/data/industries';
import { getTopicGuide } from '../src/data/topic-guides';
import { isTopicGuideCorpusResource, topicGuideToResource } from '../src/lib/topic-guide-corpus';

describe('topic-guide-corpus', () => {
  it('maps topic guide to published resource', () => {
    const industry = industries[0];
    const topic = industry.topics[0];
    const guide = getTopicGuide(industry.slug, topic.slug);
    expect(guide).toBeDefined();
    const content = guide ? `${guide.proposition}\n\n## Section` : '';
    const resource = topicGuideToResource({
      industrySlug: industry.slug,
      topicSlug: topic.slug,
      title: topic.name,
      description: topic.description,
      content,
    });
    expect(resource.id).toBe(`topic-guide-${industry.slug}-${topic.slug}`);
    expect(resource.status).toBe('published');
    expect(isTopicGuideCorpusResource(resource)).toBe(true);
  });

  it('every industry topic has a curated guide', () => {
    for (const industry of industries) {
      for (const topic of industry.topics) {
        expect(getTopicGuide(industry.slug, topic.slug)).toBeDefined();
      }
    }
  });
});
