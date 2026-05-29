/**
 * Public site sections admins can review from the account workspace.
 */
import { valueProposition } from '~/data/value-proposition';

export interface SiteReviewSection {
  id: string;
  title: string;
  path: string;
  description: string;
  category: 'legal' | 'marketing' | 'community' | 'resources';
}

export function getSiteReviewSections(): SiteReviewSection[] {
  return [
    {
      id: 'corrections-welcome',
      title: 'Corrections welcome',
      path: '/about#corrections-welcome',
      description: valueProposition.about.correctionsBody,
      category: 'community'
    },
    {
      id: 'about-portal-voice',
      title: 'Portal voice framework (About)',
      path: '/about#portal-voice-framework',
      description: 'Public summary of voice rules before users open the account workspace.',
      category: 'marketing'
    },
    {
      id: 'contribute',
      title: 'Contribute page',
      path: '/contribute',
      description: 'Community contribution entry point and upload guidance.',
      category: 'community'
    },
    {
      id: 'resources-hub',
      title: 'Resources hub',
      path: '/resources',
      description: 'Industry resource index and public browsing experience.',
      category: 'resources'
    },
    {
      id: 'privacy-policy',
      title: 'Privacy policy',
      path: '/privacy-policy',
      description: 'Data collection, cookies, retention, and contact for privacy queries.',
      category: 'legal'
    },
    {
      id: 'terms-of-service',
      title: 'Terms of service',
      path: '/terms-of-service',
      description: 'Terms governing use of the site and account workspace.',
      category: 'legal'
    },
    {
      id: 'home',
      title: 'Home page',
      path: '/',
      description: 'Primary value proposition and service positioning.',
      category: 'marketing'
    }
  ];
}
