#!/usr/bin/env node
/**
 * Print a typed case study stub for src/data/case-studies.ts.
 * Usage: npx tsx scripts/scaffold-case-study.ts my-project-slug
 */
const slug = process.argv[2]?.trim().replace(/[^a-z0-9-]/g, '-');
if (!slug) {
  console.error('Usage: npx tsx scripts/scaffold-case-study.ts <slug>');
  process.exit(1);
}

const title = slug
  .split('-')
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ');

const template = `  {
    slug: '${slug}',
    pageTitle: '${title} — case study',
    metaDescription:
      'Describe the business context, what was delivered, and measurable outcomes for this ${title.toLowerCase()} project.',
    pageId: 'case-study-${slug}',
    cardTitle: '${title}',
    navLabel: '${title}',
    cardDescription:
      'One-sentence summary for cards and navigation — industry, scope, and outcome.',
    icon: 'fas fa-briefcase',
    industryFilter: 'professional-services',
    relatedResourcesHref: '/resources/professional-services',
    heroTitle: '${title}',
    heroSubtitle:
      'Lead paragraph for the hero — context, constraints, and the result in plain language.',
    metaFields: [
      { label: 'Industry', value: 'TBD' },
      { label: 'Location', value: 'Brisbane, QLD' },
      { label: 'Business size', value: 'SME' },
    ],
    challenge: \`Describe the operating problem and constraints before delivery.\`,
    approach: \`Describe phased delivery, trade-offs, and how scope was agreed.\`,
    results: [
      {
        title: 'Outcome headline',
        description: 'Measurable or observable result the client can evaluate.',
        icon: 'fas fa-chart-line',
      },
    ],
    technologies: 'List the core systems, integrations, or platforms used.',
    lessons: 'What future readers should take away for their own context.',
    inquiryTitle: 'Discuss a similar initiative',
    inquirySubtitle: 'Share your industry context and objectives. We respond with practical next steps.',
    inquiryIndustry: 'professional-services',
  },`;

console.log('Add this object to the caseStudies array in src/data/case-studies.ts:\n');
console.log(template);
console.log('\nAfter adding: nav, projects grid, sitemap, breadcrumbs, and JSON-LD follow automatically on deploy.');
