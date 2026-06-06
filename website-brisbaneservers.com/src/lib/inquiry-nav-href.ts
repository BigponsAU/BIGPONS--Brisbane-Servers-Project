/** Hash link to the on-page inquiry form, or home inquiry when none exists (e.g. account). */
export function inquiryNavHref(currentPath: string, toSitePath: (path: string) => string): string {
  const normalized = currentPath.replace(/\/$/, '') || '/';
  if (normalized === '/account' || normalized.startsWith('/account/')) {
    return toSitePath('/#inquiry-section');
  }
  return '#inquiry-section';
}
