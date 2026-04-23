export interface NavItem {
  label: string;
  href: string;
  children?: NavItem[];
}

export const navigation: NavItem[] = [
  {
    label: 'Home',
    href: '/'
  },
  {
    label: 'Resources',
    href: '/resources',
    children: [
      { label: 'All Resources', href: '/resources' },
      { label: 'Contribute', href: '/contribute' },
      { label: 'Professional Services', href: '/resources/professional-services' },
      { label: 'Retail & E-commerce', href: '/resources/retail' },
      { label: 'Healthcare', href: '/resources/healthcare' },
      { label: 'Hospitality', href: '/resources/hospitality' },
      { label: 'Construction', href: '/resources/construction' },
      { label: 'Finance & Accounting', href: '/resources/finance' },
      { label: 'Manufacturing', href: '/resources/manufacturing' }
    ]
  },
  {
    label: 'Projects',
    href: '/projects'
  },
  {
    label: 'Services',
    href: '/services'
  },
  {
    label: 'About',
    href: '/about',
    children: [
      { label: 'About Brisbane Servers', href: '/about' },
      { label: 'Portal Voice Framework', href: '/account' },
      { label: 'Corrections Welcome', href: '/about#corrections-welcome' }
    ]
  },
  {
    label: 'Account',
    href: '/account'
  }
];

