#!/usr/bin/env node
/**
 * Validates SEO-required fields on static content (case studies, industries, topic guides).
 * Warnings do not fail the build; errors do.
 */
import { validateStaticContentSeo, validatePublishedResourcesSeo } from '../src/lib/content-registry';
import { loadResourcesForSearchIndex } from './generate-search-index';

export async function runContentSeoValidation(): Promise<{ passed: boolean; message: string }> {
  const issues = validateStaticContentSeo();

  try {
    const publishedResources = await loadResourcesForSearchIndex();
    issues.push(...validatePublishedResourcesSeo(publishedResources));
  } catch (error) {
    issues.push({
      id: 'corpus:load',
      message: `Could not load published resources for SEO validation: ${error instanceof Error ? error.message : 'unknown'}`,
      severity: 'warning',
    });
  }
  const errors = issues.filter((issue) => issue.severity === 'error');
  const warnings = issues.filter((issue) => issue.severity === 'warning');

  for (const warning of warnings) {
    console.warn(`⚠️  [content-seo] ${warning.id}: ${warning.message}`);
  }

  if (errors.length === 0) {
    const warningText =
      warnings.length > 0 ? ` (${warnings.length} warning${warnings.length === 1 ? '' : 's'})` : '';
    return {
      passed: true,
      message: `All static content passes SEO validation${warningText}`,
    };
  }

  const detail = errors.map((issue) => `${issue.id}: ${issue.message}`).join('; ');
  return {
    passed: false,
    message: detail,
  };
}

const isDirectRun = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));

if (isDirectRun) {
  runContentSeoValidation().then((result) => {
    if (!result.passed) {
      console.error(`❌ Content SEO validation failed: ${result.message}`);
      process.exit(1);
    }
    console.log(`✅ Content SEO validation passed — ${result.message}`);
  });
}
