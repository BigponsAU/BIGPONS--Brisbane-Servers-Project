export interface Industry {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  topics: Topic[];
}

export interface Topic {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
}

export const industries: Industry[] = [
  {
    id: 'professional-services',
    name: 'Professional Services',
    slug: 'professional-services',
    description: 'Technology solutions for lawyers, accountants, consultants, architects. Client management, document automation, billing systems, and practice management.',
    icon: 'fas fa-briefcase',
    topics: [
      {
        id: 'client-management',
        name: 'Client Management Systems',
        slug: 'client-management-systems',
        description: 'Centralized client information, matter tracking, communication logs, and relationship management.',
        icon: 'fas fa-users'
      },
      {
        id: 'document-automation',
        name: 'Document Automation',
        slug: 'document-automation',
        description: 'Automating repetitive document generation, templates, version control, and collaboration.',
        icon: 'fas fa-file-alt'
      },
      {
        id: 'billing-time',
        name: 'Billing & Time Tracking',
        slug: 'billing-time-tracking',
        description: 'Accurate time capture, automated invoicing, payment processing, and financial reporting.',
        icon: 'fas fa-dollar-sign'
      },
      {
        id: 'practice-management',
        name: 'Practice Management',
        slug: 'practice-management',
        description: 'Integrated practice management covering workflows, team collaboration, deadlines, compliance, and business intelligence.',
        icon: 'fas fa-building'
      }
    ]
  },
  {
    id: 'retail',
    name: 'Retail & E-commerce',
    slug: 'retail',
    description: 'Inventory systems, POS integration, e-commerce solutions, customer loyalty programs for retail businesses.',
    icon: 'fas fa-store',
    topics: [
      {
        id: 'inventory-pos',
        name: 'Inventory & POS Systems',
        slug: 'inventory-pos',
        description: 'Stock tracking, automated reordering, POS integration, sales reporting.',
        icon: 'fas fa-boxes'
      },
      {
        id: 'e-commerce',
        name: 'E-commerce Integration',
        slug: 'e-commerce',
        description: 'Online store setup, product management, payment processing, order fulfillment.',
        icon: 'fas fa-shopping-cart'
      },
      {
        id: 'customer-systems',
        name: 'Customer Systems',
        slug: 'customer-systems',
        description: 'Customer relationship management, loyalty programs, customer analytics, retention strategies.',
        icon: 'fas fa-star'
      }
    ]
  },
  {
    id: 'healthcare',
    name: 'Healthcare & Medical Practices',
    slug: 'healthcare',
    description: 'Patient management systems, compliance solutions, secure data handling, appointment automation.',
    icon: 'fas fa-heartbeat',
    topics: [
      {
        id: 'patient-management',
        name: 'Patient Management Systems',
        slug: 'patient-management',
        description: 'Electronic health records, patient information management, medical history tracking.',
        icon: 'fas fa-user-md'
      },
      {
        id: 'compliance',
        name: 'Compliance & Security',
        slug: 'compliance',
        description: 'Privacy compliance, secure data storage, access controls, audit trails.',
        icon: 'fas fa-shield-alt'
      },
      {
        id: 'appointments',
        name: 'Appointment Management',
        slug: 'appointments',
        description: 'Automated scheduling, patient reminders, calendar integration, waiting list management.',
        icon: 'fas fa-calendar-check'
      }
    ]
  },
  {
    id: 'hospitality',
    name: 'Hospitality & Tourism',
    slug: 'hospitality',
    description: 'Booking systems, point-of-sale solutions, customer relationship management, automation for restaurants, cafes, and accommodation.',
    icon: 'fas fa-utensils',
    topics: [
      {
        id: 'booking',
        name: 'Booking & Reservation Systems',
        slug: 'booking',
        description: 'Online booking platforms, reservation management, table management, accommodation bookings.',
        icon: 'fas fa-calendar-alt'
      },
      {
        id: 'pos-integration',
        name: 'POS Integration',
        slug: 'pos-integration',
        description: 'Point-of-sale system integration, payment processing, inventory tracking, sales reporting.',
        icon: 'fas fa-cash-register'
      },
      {
        id: 'automation',
        name: 'Automation & Efficiency',
        slug: 'automation',
        description: 'Automating repetitive tasks: customer communications, inventory alerts, reporting, staff scheduling.',
        icon: 'fas fa-robot'
      }
    ]
  },
  {
    id: 'construction',
    name: 'Construction & Trades',
    slug: 'construction',
    description: 'Project management, job tracking, quoting systems, and compliance for construction companies, tradespeople, and contractors.',
    icon: 'fas fa-hard-hat',
    topics: []
  },
  {
    id: 'finance',
    name: 'Finance & Accounting',
    slug: 'finance',
    description: 'Financial management systems, compliance, reporting, and automation for accounting practices, financial advisory firms, and finance departments.',
    icon: 'fas fa-chart-line',
    topics: []
  },
  {
    id: 'manufacturing',
    name: 'Manufacturing & Production',
    slug: 'manufacturing',
    description: 'Production tracking, quality control, inventory management, and supply chain systems for manufacturers.',
    icon: 'fas fa-industry',
    topics: []
  }
];

export function getIndustryBySlug(slug: string): Industry | undefined {
  return industries.find(industry => industry.slug === slug);
}

export function getTopicBySlug(industrySlug: string, topicSlug: string): Topic | undefined {
  const industry = getIndustryBySlug(industrySlug);
  return industry?.topics.find(topic => topic.slug === topicSlug);
}

