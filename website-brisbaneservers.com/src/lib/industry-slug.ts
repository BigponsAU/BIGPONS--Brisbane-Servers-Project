import { industries } from '../data/industries';

/** Map stored industry label/slug to the `<select>` option value (canonical slug). */
export function normalizeIndustrySlug(value: string | undefined | null): string {
  if (!value) return '';
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();
  for (const industry of industries) {
    if (
      industry.slug === lower ||
      industry.id === lower ||
      industry.name.toLowerCase() === lower
    ) {
      return industry.slug;
    }
  }
  return lower.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
