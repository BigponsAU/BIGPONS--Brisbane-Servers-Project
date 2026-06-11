/**
 * Canonical naming and navigation for the signed-in workspace at /account.
 * URL: /account (legacy /portal redirects).
 *
 * Two interchangeable sidebar modes (admin+ can toggle):
 * - creator: resources, profiles, voice lab, voice map
 * - admin: library growth, moderation, site review, ops
 */
export type WorkspaceNavMode = 'creator' | 'admin';

export type WorkspacePanelId =
  | 'dashboard'
  | 'resources'
  | 'profiles'
  | 'analytics'
  | 'voice-lab'
  | 'voice-map'
  | 'library-growth'
  | 'moderation'
  | 'site-review'
  | 'admin-ops';

export interface WorkspaceNavItem {
  panel: WorkspacePanelId;
  label: string;
  description: string;
  minRole: 'client' | 'editor' | 'admin';
  /** Which sidebar track shows this item */
  mode: WorkspaceNavMode;
  title: string;
}

export const accountWorkspace = {
  productName: 'Account workspace',
  productNameShort: 'Workspace',
  overviewLabel: 'Overview',
  overviewDescription:
    'Your activity, resources, contributions, and quick actions in one place.',
  libraryGrowthLabel: 'Library growth',
  libraryGrowthDescription:
    'Automates new guides, resources, and case study materials — not voice profiles. You create profiles in Voice profiles; growth writes content using your default site voice after you approve each proposal.',
  creatorModeLabel: 'Workspace',
  creatorModeDescription: 'Resources, profiles, and voice tools',
  adminModeLabel: 'Admin console',
  adminModeDescription: 'Growth, moderation, hosting, and ops',
  voiceLabLabel: 'Voice lab',
  voiceLabDescription: 'Analyze tone, patterns, and voice match (from voice-framework workspace)',
  voiceMapLabel: 'Voice map',
  voiceMapDescription: 'Semantic vectors and principles — profile topology visualisation',
  adminOpsLabel: 'Ops & billing',
  adminOpsDescription: 'Usage caps, AI credits, hosting status (super-admin)',
} as const;

/** Display name for the site default voice profile (every account). */
export const BRISBANE_PROFILE_NAME = 'Brisbane';

/** Default panel when switching modes */
export const workspaceModeDefaultPanel: Record<WorkspaceNavMode, WorkspacePanelId> = {
  creator: 'dashboard',
  admin: 'library-growth',
};

export const workspaceNavItems: WorkspaceNavItem[] = [
  {
    panel: 'dashboard',
    label: accountWorkspace.overviewLabel,
    description: 'Activity & quick actions',
    minRole: 'client',
    mode: 'creator',
    title: 'Overview — activity, stats, and quick actions',
  },
  {
    panel: 'resources',
    label: 'Resources',
    description: 'Content management',
    minRole: 'client',
    mode: 'creator',
    title: 'Resources — generate, upload, and manage content',
  },
  {
    panel: 'profiles',
    label: 'Voice Profiles',
    description: 'Content voice settings',
    minRole: 'editor',
    mode: 'creator',
    title: 'Voice Profiles — manage voice characteristics',
  },
  {
    panel: 'analytics',
    label: 'Analytics',
    description: 'Performance metrics',
    minRole: 'editor',
    mode: 'creator',
    title: 'Analytics — resource performance and statistics',
  },
  {
    panel: 'voice-lab',
    label: accountWorkspace.voiceLabLabel,
    description: accountWorkspace.voiceLabDescription,
    minRole: 'editor',
    mode: 'creator',
    title: 'Voice lab — tone analysis and pattern extraction',
  },
  {
    panel: 'voice-map',
    label: accountWorkspace.voiceMapLabel,
    description: accountWorkspace.voiceMapDescription,
    minRole: 'editor',
    mode: 'creator',
    title: 'Voice map — vector and principle topology',
  },
  {
    panel: 'library-growth',
    label: accountWorkspace.libraryGrowthLabel,
    description: 'Auto proposals & approve',
    minRole: 'admin',
    mode: 'admin',
    title: 'Library growth — scheduled proposals and voice generation',
  },
  {
    panel: 'moderation',
    label: 'Moderation',
    description: 'Pending uploads',
    minRole: 'admin',
    mode: 'admin',
    title: 'Moderation — review community uploads',
  },
  {
    panel: 'site-review',
    label: 'Site review',
    description: 'Public pages',
    minRole: 'admin',
    mode: 'admin',
    title: 'Site review — public pages and corrections',
  },
  {
    panel: 'admin-ops',
    label: accountWorkspace.adminOpsLabel,
    description: accountWorkspace.adminOpsDescription,
    minRole: 'admin',
    mode: 'admin',
    title: 'Ops — usage, AI gateway, hosting (super-admin sections gated in UI)',
  },
];
