/**
 * Published case studies — single source for project cards, hub index, and detail pages.
 * Curated entries below; library-growth drafts merge in at build when present
 * (`voice-framework/storage/case-study-drafts.json`).
 */

import { loadCaseStudyDraftsForBuild } from '../lib/case-study-drafts-load';

export type CaseStudyMetaField = {
  label: string;
  value: string;
};

export type CaseStudyResult = {
  title: string;
  description: string;
  icon: string;
};

export type CaseStudy = {
  slug: string;
  pageTitle: string;
  metaDescription: string;
  pageId: string;
  cardTitle: string;
  /** Shorter label for navigation menus */
  navLabel?: string;
  cardDescription: string;
  icon: string;
  /** Industry filter slug for projects grid */
  industryFilter?: string;
  relatedResourcesHref?: string;
  heroTitle: string;
  heroSubtitle: string;
  metaFields: CaseStudyMetaField[];
  challenge: string;
  approach: string;
  results: CaseStudyResult[];
  technologies: string;
  lessons: string;
  inquiryTitle: string;
  inquirySubtitle: string;
  inquiryIndustry: string;
};

const curatedCaseStudies: CaseStudy[] = [
  {
    slug: 'retail-inventory-ecommerce',
    pageTitle: 'Retail: inventory and e-commerce integration — case study',
    metaDescription:
      'Grant-assisted inventory and e-commerce integration for a Brisbane retail SME — time saved, accuracy improved, and a platform sized for growth.',
    pageId: 'case-study-retail',
    cardTitle: 'Retail: inventory and e-commerce integration',
    navLabel: 'Retail inventory and e-commerce',
    cardDescription:
      'Small retail business transitioning from manual tracking to automated inventory with e-commerce integration. Grant-assisted implementation. Brisbane-based business.',
    icon: 'fas fa-store',
    industryFilter: 'retail',
    relatedResourcesHref: '/resources/retail',
    heroTitle: 'Retail: inventory and e-commerce integration',
    heroSubtitle:
      'Manual tracking replaced with a cloud inventory core, barcode workflows, and real-time sync to the online store — phased so trade never stopped.',
    metaFields: [
      { label: 'Industry', value: 'Retail and e-commerce' },
      { label: 'Location', value: 'Brisbane, QLD' },
      { label: 'Business size', value: 'Small business' },
      { label: 'Funding', value: 'Grant-assisted' },
    ],
    challenge: `A small retail business in Brisbane was struggling with manual inventory tracking. The owner spent hours each week updating spreadsheets, reconciling discrepancies, and manually syncing data between their physical store and online presence.

As the business grew, this manual process became unsustainable. Stock levels were frequently incorrect, leading to overselling online or missed sales opportunities in-store. The business needed an automated solution that could:
- Track inventory in real-time across physical and online channels
- Automatically update stock levels when sales occurred
- Provide accurate reporting for purchasing decisions
- Integrate with their existing e-commerce platform
- Be cost-effective for a small business budget`,
    approach: `We assessed the business's current operations, budget constraints, and growth trajectory. After identifying available digital transformation grants, we designed a phased implementation plan:

Phase 1: Core inventory system
- Implemented a cloud-based inventory management system
- Set up barcode scanning for efficient stock tracking
- Configured automated stock level alerts

Phase 2: E-commerce integration
- Integrated inventory system with existing e-commerce platform
- Automated stock synchronization between channels
- Real-time inventory updates for online customers

Phase 3: Reporting and analytics
- Custom reporting dashboard for purchasing decisions
- Sales trend analysis
- Inventory turnover metrics

The solution was designed to scale with the business while remaining cost-effective through grant assistance.`,
    results: [
      {
        title: 'Time savings',
        description:
          'Reduced inventory management time from 8 hours per week to 1 hour per week. Owner can focus on growing the business instead of data entry.',
        icon: 'fas fa-clock',
      },
      {
        title: 'Accuracy improvement',
        description:
          'Stock level accuracy increased from 75% to 98%. Eliminated overselling and missed sales opportunities.',
        icon: 'fas fa-check-circle',
      },
      {
        title: 'Cost efficiency',
        description:
          'Grant assistance covered 60% of implementation costs. Monthly operational savings exceed system costs.',
        icon: 'fas fa-dollar-sign',
      },
      {
        title: 'Scalability',
        description:
          'System designed to handle 3x current inventory levels without additional infrastructure costs.',
        icon: 'fas fa-chart-line',
      },
    ],
    technologies:
      'Cloud-based inventory management platform, RESTful API integration, barcode scanning hardware, automated reporting system, grant application assistance.',
    lessons: `This project demonstrated that small businesses can successfully implement enterprise-grade solutions when properly planned and grant-assisted. The key was understanding the business's immediate needs while building a foundation for future growth. Phased implementation allowed the business to adapt gradually without disrupting operations.`,
    inquiryTitle: 'Interested in similar outcomes?',
    inquirySubtitle:
      'We assess your context, map grant pathways where relevant, and propose a sequenced plan you can afford to operate.',
    inquiryIndustry: 'Retail & E-commerce',
  },
  {
    slug: 'gallery-semantic-search',
    pageTitle: 'Gallery: semantic search and categorisation — case study',
    metaDescription:
      'Australian art gallery: semantic product categorisation and NLP-powered collection search so visitors explore by style, theme, and technique — not folder names.',
    pageId: 'case-study-gallery',
    cardTitle: 'Gallery: semantic search and NLP categorisation',
    navLabel: 'Gallery semantic search',
    cardDescription:
      'Art gallery implementing semantic product categorisation with NLP-powered search. Visitors explore collections by style, theme, and technique.',
    icon: 'fas fa-palette',
    industryFilter: 'retail',
    relatedResourcesHref: '/resources/retail/customer-systems',
    heroTitle: 'Gallery: semantic search and categorisation',
    heroSubtitle:
      'A creative retail space replaced folder-based artwork lists with semantic categories and natural-language search — so visitors and staff find works by how people actually describe art.',
    metaFields: [
      { label: 'Industry', value: 'Creative retail / gallery' },
      { label: 'Location', value: 'Australia' },
      { label: 'Business size', value: 'Small team' },
      { label: 'Highlight', value: 'Semantic search' },
    ],
    challenge: `A commercial gallery sold original works and limited editions online and in-room. Inventory lived in spreadsheets and image folders named by artist or acquisition date — not by how buyers search.

Staff spent time answering repeat enquiries ("Do you have anything in this style?") because the public site only supported basic filters. The gallery needed:
- Consistent metadata across artists, mediums, and periods
- Search that understood style, theme, mood, and technique — not exact titles
- Fast publishing when new works arrived
- A browse experience that felt curated, not like a file dump`,
    approach: `We mapped how curators and visitors already talked about the collection, then designed a lightweight catalogue model and semantic layer:

Phase 1: Catalogue discipline
- Standardised fields for artist, medium, dimensions, price band, and availability
- Bulk import from existing folders with human review on edge cases
- Image pipeline with consistent crops and alt text for accessibility

Phase 2: Semantic categories
- Tagging schema aligned to style, theme, technique, and collection series
- Assisted labelling from titles and descriptions, with curator approval
- Related-work suggestions on each artwork page

Phase 3: NLP search and discovery
- Natural-language search over approved metadata and descriptions
- Featured collections driven by tags instead of manual HTML updates
- Enquiry forms pre-filled with the artwork context the visitor was viewing

Rollout stayed incremental — the in-room experience unchanged while the online catalogue improved week by week.`,
    results: [
      {
        title: 'Faster discovery',
        description:
          'Average time-to-relevant artwork on the site dropped sharply; fewer "nothing matched" search sessions.',
        icon: 'fas fa-search',
      },
      {
        title: 'Staff capacity',
        description:
          'Repeat style-and-theme enquiries reduced; curators spend more time on sales conversations and hang planning.',
        icon: 'fas fa-users',
      },
      {
        title: 'Publishing speed',
        description:
          'New works go live in one workflow — metadata, images, and related links — instead of ad hoc page edits.',
        icon: 'fas fa-bolt',
      },
      {
        title: 'Visitor engagement',
        description:
          'More pages per session and longer on-site time on collection and artwork routes after semantic browse launched.',
        icon: 'fas fa-chart-line',
      },
    ],
    technologies:
      'Structured catalogue database, semantic tagging layer, NLP-backed search index, image CDN, CMS integration, analytics on search queries and zero-result terms.',
    lessons: `Creative retail benefits when search vocabulary matches how people talk, not how files were stored. Curator sign-off on tags kept quality high; automation accelerated labelling but did not replace judgment. Measuring zero-result searches surfaced gaps in metadata early.`,
    inquiryTitle: 'Exploring search or catalogue work?',
    inquirySubtitle:
      'We scope semantic discovery to your collection size and team capacity — phased so publishing stays practical.',
    inquiryIndustry: 'Retail & E-commerce',
  },
  {
    slug: 'healthcare-patient-management',
    pageTitle: 'Healthcare: patient management system — case study',
    metaDescription:
      'APP-aligned patient management for a Brisbane practice — secure records, automated appointments, and phased rollout without compromising care.',
    pageId: 'case-study-healthcare',
    cardTitle: 'Healthcare: patient management system',
    navLabel: 'Healthcare patient management',
    cardDescription:
      'Medical practice implementing compliant patient management with automated appointments and secure data storage. APP-aligned, phased implementation. Brisbane-based practice.',
    icon: 'fas fa-heartbeat',
    industryFilter: 'healthcare',
    relatedResourcesHref: '/resources/healthcare',
    heroTitle: 'Healthcare: patient management system',
    heroSubtitle:
      'Compliant digital records, appointment automation, and reporting — implemented in phases so clinical staff could validate each step against Australian Privacy Principles.',
    metaFields: [
      { label: 'Industry', value: 'Healthcare and medical practices' },
      { label: 'Location', value: 'Brisbane, QLD' },
      { label: 'Compliance', value: 'APP aligned' },
      { label: 'Delivery', value: 'Phased rollout' },
    ],
    challenge: `A Brisbane-based medical practice was using a combination of paper records and basic software that no longer met their needs. The practice faced several critical challenges:

- Patient records were scattered across multiple systems and paper files
- Appointment scheduling was manual and prone to double-booking
- No automated reminders, leading to high no-show rates
- Concerns about Australian Privacy Principles (APP) compliance
- Difficulty generating reports for practice management
- Limited integration between clinical and administrative systems

The practice needed a comprehensive solution that prioritized patient privacy, streamlined operations, and maintained compliance with Australian healthcare regulations.`,
    approach: `We conducted a thorough assessment of the practice's workflows, compliance requirements, and technical infrastructure. The solution was implemented in carefully planned phases to minimize disruption:

Phase 1: Secure patient records
- Migrated all patient records to secure, encrypted cloud storage
- Implemented role-based access controls
- Ensured APP compliance with audit trails and consent management

Phase 2: Automated appointment system
- Integrated appointment scheduling with patient records
- Automated SMS and email reminders
- Online booking portal for patients

Phase 3: Practice management tools
- Custom reporting dashboard for practice analytics
- Billing integration
- Clinical note templates

Throughout implementation, we ensured all systems met Australian Privacy Principles and healthcare industry standards.`,
    results: [
      {
        title: 'Reduced no-shows',
        description:
          'Automated reminders reduced no-show rates from 25% to 8%, improving practice efficiency and patient care.',
        icon: 'fas fa-calendar-check',
      },
      {
        title: 'Compliance assurance',
        description:
          'Full APP alignment with automated audit trails, secure data storage, and consent management systems.',
        icon: 'fas fa-shield-alt',
      },
      {
        title: 'Time efficiency',
        description: 'Administrative time reduced by 40%, allowing staff to focus on patient care.',
        icon: 'fas fa-clock',
      },
      {
        title: 'Improved access',
        description:
          'Patients can book appointments online 24/7, improving accessibility and satisfaction.',
        icon: 'fas fa-user-check',
      },
    ],
    technologies:
      'Encrypted cloud infrastructure, secure database systems, automated SMS/email services, secure API integrations, Australian Privacy Principles compliance framework, role-based access control.',
    lessons: `Healthcare technology implementations require careful attention to compliance and patient privacy. Phased implementation was crucial to ensure staff training and system validation at each stage. The key success factor was maintaining patient trust while modernising operations.`,
    inquiryTitle: 'Need healthcare technology direction?',
    inquirySubtitle:
      'We design compliant implementations that respect patient privacy, staff workflows, and Australian regulatory context.',
    inquiryIndustry: 'Healthcare & Medical Practices',
  },
  {
    slug: 'professional-services-database',
    pageTitle: 'Professional services: spreadsheet to database — case study',
    metaDescription:
      'Australian professional services SME: from spreadsheet chaos to a governed database, semantic search, and automated reporting — less rework, clearer truth.',
    pageId: 'case-study-professional-services',
    cardTitle: 'Professional services: spreadsheet to database',
    navLabel: 'Spreadsheet to database',
    cardDescription:
      'Professional services company outgrowing spreadsheets. Database with semantic search and automated reporting. Time savings, improved accuracy, scalability.',
    icon: 'fas fa-database',
    industryFilter: 'professional-services',
    relatedResourcesHref: '/resources/professional-services',
    heroTitle: 'Professional services: spreadsheet to database',
    heroSubtitle:
      'A growing firm replaced fragmented spreadsheets with a single source of truth, semantic search across client work, and reporting that runs itself.',
    metaFields: [
      { label: 'Industry', value: 'Professional services' },
      { label: 'Location', value: 'Australia' },
      { label: 'Business size', value: 'SME' },
      { label: 'Highlight', value: 'Semantic search' },
    ],
    challenge: `A professional services company had grown from a small team to 20+ employees, but was still managing all client data, projects, and communications in spreadsheets. The limitations became increasingly apparent:

- Multiple team members editing the same spreadsheets caused version conflicts
- No way to search across historical client communications effectively
- Reporting required manual data compilation, taking hours each week
- No automated workflows for common tasks
- Difficulty tracking project timelines and deliverables
- Risk of data loss with no proper backup strategy

The company needed a proper database system that could handle their growing data volume while improving team collaboration and operational efficiency.`,
    approach: `We assessed the firm's data model, security requirements, and reporting needs before selecting a platform sized to SME operations:

Phase 1: Data foundation
- Migrated critical spreadsheets into a governed database schema
- Established roles, permissions, and backup policies
- Defined client, matter, and document relationships

Phase 2: Semantic search
- Indexed communications and deliverables for natural-language search
- Standardised metadata on client work products
- Reduced time spent hunting for prior advice and templates

Phase 3: Automation and reporting
- Scheduled reports for utilisation, pipeline, and delivery status
- Workflow triggers for onboarding and matter closure checklists
- Integration hooks for email and document storage

Training and change management ran alongside each phase so adoption matched technical rollout.`,
    results: [
      {
        title: 'Search efficiency',
        description:
          'Staff locate prior client work in minutes instead of hours — semantic search across approved content.',
        icon: 'fas fa-search',
      },
      {
        title: 'Reporting automation',
        description:
          'Weekly management reports run on schedule; partners review exceptions instead of rebuilding spreadsheets.',
        icon: 'fas fa-chart-bar',
      },
      {
        title: 'Data integrity',
        description:
          'Version conflicts eliminated; single source of truth for client and matter records.',
        icon: 'fas fa-database',
      },
      {
        title: 'Scalable operations',
        description:
          'System supports growing headcount without proportional admin overhead.',
        icon: 'fas fa-arrow-up',
      },
    ],
    technologies:
      'Relational database platform, semantic search index, role-based access control, automated reporting, document integration APIs, backup and audit logging.',
    lessons: `Spreadsheet culture dies slowly — wins came from picking one workflow to migrate first, then proving time saved. Semantic search only worked once metadata rules were agreed. Partners had to model the behaviour they wanted from staff.`,
    inquiryTitle: 'Outgrowing spreadsheets?',
    inquirySubtitle:
      'We map a sequenced path from spreadsheets to governed data — sized to how your firm actually delivers work.',
    inquiryIndustry: 'Professional Services',
  },
];

const curatedSlugs = new Set(curatedCaseStudies.map((study) => study.slug));
const growthDraftCaseStudies = loadCaseStudyDraftsForBuild().filter(
  (draft) => !curatedSlugs.has(draft.slug)
);

/** Curated case studies plus growth drafts (when storage file exists at build). */
export const caseStudies: CaseStudy[] = [...curatedCaseStudies, ...growthDraftCaseStudies];

export function getCaseStudyBySlug(slug: string): CaseStudy | undefined {
  return caseStudies.find((study) => study.slug === slug);
}
