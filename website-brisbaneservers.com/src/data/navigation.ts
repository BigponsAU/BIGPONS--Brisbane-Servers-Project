import { caseStudies } from './case-studies';
import { projectPurposeNav } from './brisbane-servers-project-objective';

const projectPurposeGroup = {
  title: projectPurposeNav.groupTitle,
  items: [
    projectPurposeNav.programPage,
    projectPurposeNav.inferenceHub,
    projectPurposeNav.contribute,
  ],
};

export interface NavItem {
  label: string;
  href: string;
  children?: NavItem[];
  /** Multi-column panel (desktop) */
  groups?: NavGroup[];
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export function navItemIsActive(item: NavItem, currentPath: string): boolean {
  const pathOnly = (href: string) => href.split('#')[0] || href;
  const matches = (href: string) => {
    const p = pathOnly(href);
    if (p === '/' && currentPath === '/') return true;
    if (p !== '/' && currentPath.startsWith(p)) return true;
    return false;
  };
  if (matches(item.href)) return true;
  if (item.href === '/projects' && currentPath.startsWith('/case-studies')) return true;
  const nested = [...(item.children ?? []), ...(item.groups?.flatMap((g) => g.items) ?? [])];
  return nested.some((child) => {
    const childPath = pathOnly(child.href);
    /* Portal framework lives at /account but is not the About section — don't light up About */
    if (item.href === '/about' && childPath === '/account') return false;
    return matches(child.href);
  });
}

/** Dropdown toggle highlight only — not cross-links in mega menus (e.g. /resources under Projects). */
export function navDropdownToggleIsActive(item: NavItem, currentPath: string): boolean {
  const pathOnly = item.href.split('#')[0] || item.href;
  if (pathOnly === '/' && currentPath === '/') return true;
  if (pathOnly !== '/' && currentPath.startsWith(pathOnly)) return true;
  if (item.href === '/projects' && currentPath.startsWith('/case-studies')) return true;
  return false;
}

export const navigation: NavItem[] = [
  {
    label: 'Home',
    href: '/',
  },
  {
    label: 'Resources',
    href: '/resources',
    groups: [
      {
        title: 'Start here',
        items: [
          { label: 'All resources', href: '/resources' },
        ],
      },
      projectPurposeGroup,
      {
        title: 'Industry hubs',
        items: [
          { label: 'Professional services', href: '/resources/professional-services' },
          { label: 'Retail and e-commerce', href: '/resources/retail' },
          { label: 'Healthcare', href: '/resources/healthcare' },
          { label: 'Hospitality', href: '/resources/hospitality' },
          { label: 'Construction', href: '/resources/construction' },
          { label: 'Finance and accounting', href: '/resources/finance' },
          { label: 'Manufacturing', href: '/resources/manufacturing' },
        ],
      },
    ],
  },
  {
    label: 'Projects',
    href: '/projects',
    groups: [
      projectPurposeGroup,
      {
        title: 'Delivery',
        items: [
          { label: 'Projects overview', href: '/projects' },
          { label: 'All case studies', href: '/case-studies' },
        ],
      },
      {
        title: 'Case studies',
        items: caseStudies.map((study) => ({
          label: study.navLabel ?? study.cardTitle,
          href: `/case-studies/${study.slug}`,
        })),
      },
    ],
  },
  {
    label: 'Services',
    href: '/services',
  },
  {
    label: 'About',
    href: '/about',
    groups: [
      projectPurposeGroup,
      {
        title: 'About Brisbane Servers',
        items: [
          { label: 'About us', href: '/about' },
          { label: 'Corrections welcome', href: '/about#corrections-welcome' },
        ],
      },
      {
        title: 'Workspace standards',
        items: [
          { label: 'Voice framework', href: '/account#portal-voice-framework' },
        ],
      },
    ],
  },
  {
    label: 'Sign in',
    href: '/account',
  },
];
