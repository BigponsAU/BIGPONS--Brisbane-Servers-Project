#!/usr/bin/env npx tsx
/**
 * Regenerate public/search-index.json from static hubs + published resources.
 */
import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { caseStudies } from '../src/data/case-studies';
import { industries } from '../src/data/industries';
import { isIndexableResource } from '../src/lib/content-registry';
import type { Resource } from '../src/lib/resource-types';
import { isPublicResource } from '../src/lib/resource-types';
import { normalizeTopicSlug } from '../src/lib/resource-slug';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(projectRoot, '..');
const resourcesFile = path.join(repoRoot, 'voice-framework/storage/resources.json');
const outputFile = path.join(projectRoot, 'public/search-index.json');

export type SearchIndexItem = {
  id: string;
  title: string;
  description: string;
  url: string;
  industry?: string;
  topics?: string[];
  keywords?: string[];
};

function hubKeywords(industryName: string, topicNames: string[]): string[] {
  return [industryName, ...topicNames].map((s) => s.toLowerCase());
}

export async function loadResourcesForSearchIndex(): Promise<Resource[]> {
  try {
    const raw = await fs.readFile(resourcesFile, 'utf-8');
    const parsed = JSON.parse(raw) as Resource[];
    return Array.isArray(parsed) ? parsed.filter(isPublicResource) : [];
  } catch {
    return [];
  }
}

export function buildSearchIndexItems(resources: Resource[]): SearchIndexItem[] {
  const items: SearchIndexItem[] = [];

  for (const industry of industries) {
    const topicSlugs = industry.topics.map((t) => t.slug);
    items.push({
      id: `${industry.slug}-index`,
      title: `${industry.name} Resources`,
      description: industry.description,
      url: `resources/${industry.slug}/index.html`,
      industry: industry.slug,
      topics: topicSlugs,
      keywords: hubKeywords(industry.name, industry.topics.map((t) => t.name)),
    });

    for (const topic of industry.topics) {
      items.push({
        id: `${industry.slug}-${topic.slug}`,
        title: topic.name,
        description: topic.description,
        url: `resources/${industry.slug}/${topic.slug}/index.html`,
        industry: industry.slug,
        topics: [topic.slug],
        keywords: hubKeywords(industry.name, [topic.name]),
      });
    }
  }

  for (const study of caseStudies) {
    items.push({
      id: `case-${study.slug}`,
      title: study.pageTitle,
      description: study.metaDescription,
      url: `case-studies/${study.slug}/index.html`,
      keywords: [study.pageTitle, study.industryFilter, study.slug]
        .filter(Boolean)
        .map((s) => String(s).toLowerCase()),
    });
  }

  for (const resource of resources.filter(isIndexableResource)) {
    const topicSlug = normalizeTopicSlug(resource.topic);
    items.push({
      id: resource.id,
      title: resource.title,
      description: resource.description,
      url: `resources/item/${resource.id}/index.html`,
      industry: resource.industry,
      topics: [topicSlug],
      keywords: [resource.title, resource.industry, resource.topic, ...(resource.description ?? '').split(/\s+/).slice(0, 8)],
    });
  }

  return items;
}

export async function writeSearchIndex(resources?: Resource[]): Promise<number> {
  const published = resources ?? (await loadResourcesForSearchIndex());
  const items = buildSearchIndexItems(published);
  const payload = {
    version: '1.1',
    lastUpdated: new Date().toISOString().slice(0, 10),
    items,
  };
  await fs.mkdir(path.dirname(outputFile), { recursive: true });
  await fs.writeFile(outputFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8');
  return items.length;
}

async function main(): Promise<void> {
  const count = await writeSearchIndex();
  console.log(`Wrote ${count} search index entries → ${outputFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
