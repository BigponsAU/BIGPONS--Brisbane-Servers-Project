import type { MiddlewareHandler } from 'astro';

const INDUSTRY_SLUGS = new Set([
  'professional-services',
  'retail',
  'healthcare',
  'hospitality',
  'construction',
  'finance',
  'manufacturing',
]);

export const onRequest: MiddlewareHandler = async (context, next) => {
  const pathname = context.url.pathname;
  const resourcesMatch = pathname.match(/^\/resources\/([^\/]+)$/);

  if (resourcesMatch) {
    const maybeIndustrySlug = resourcesMatch[1];
    if (INDUSTRY_SLUGS.has(maybeIndustrySlug)) {
      const rewriteUrl = new URL(`/resources/${maybeIndustrySlug}/`, context.url);
      return context.rewrite(rewriteUrl);
    }
  }

  return next();
};
