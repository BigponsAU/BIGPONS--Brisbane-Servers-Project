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
  | 'admin-users'
  | 'admin-ops';

export type WorkspaceNavSection = 'home' | 'create' | 'voice' | 'insights' | 'library' | 'platform';

export interface WorkspaceNavItem {
  panel: WorkspacePanelId;
  label: string;
  description: string;
  minRole: 'client' | 'editor' | 'admin';
  /** Which sidebar track shows this item */
  mode: WorkspaceNavMode;
  /** Sidebar grouping label (see workspaceNavSectionLabels) */
  section: WorkspaceNavSection;
  title: string;
}

export const workspaceNavSectionLabels: Record<WorkspaceNavSection, string> = {
  home: 'Home',
  create: 'Create',
  voice: 'Voice studio',
  insights: 'Insights',
  library: 'Library',
  platform: 'Platform',
};

/** Preserve section order within each mode track */
export const workspaceNavSectionOrder: Record<WorkspaceNavMode, WorkspaceNavSection[]> = {
  creator: ['home', 'create', 'voice', 'insights'],
  admin: ['library', 'platform'],
};

export function groupWorkspaceNavBySection(
  items: WorkspaceNavItem[],
  mode: WorkspaceNavMode,
): { section: WorkspaceNavSection; label: string; items: WorkspaceNavItem[] }[] {
  const bySection = new Map<WorkspaceNavSection, WorkspaceNavItem[]>();
  for (const item of items) {
    if (item.mode !== mode) continue;
    const list = bySection.get(item.section) ?? [];
    list.push(item);
    bySection.set(item.section, list);
  }
  return workspaceNavSectionOrder[mode]
    .filter((section) => (bySection.get(section)?.length ?? 0) > 0)
    .map((section) => ({
      section,
      label: workspaceNavSectionLabels[section],
      items: bySection.get(section)!,
    }));
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
  creatorModeDescription: 'Create content, voice tools, and insights',
  adminModeLabel: 'Admin console',
  adminModeDescription: 'Growth, moderation, hosting, and ops',
  voiceLabLabel: 'Voice lab',
  voiceLabDescription: 'Tone, patterns, and voice match',
  voiceMapLabel: 'Voice map',
  voiceMapDescription: 'Semantic vectors and profile topology',
  adminUsersLabel: 'Users',
  adminUsersDescription: 'Accounts and auth audit',
  adminOpsLabel: 'Ops & billing',
  adminOpsDescription: 'Usage, credits, and hosting',
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
    description: 'Stats and quick actions',
    minRole: 'client',
    mode: 'creator',
    section: 'home',
    title: 'Overview — activity, stats, and quick actions',
  },
  {
    panel: 'resources',
    label: 'Create content',
    description: 'Tree, generate, upload',
    minRole: 'client',
    mode: 'creator',
    section: 'create',
    title: 'Resources — generate, upload, and manage content',
  },
  {
    panel: 'profiles',
    label: 'Voice profiles',
    description: 'Library & voice detail',
    minRole: 'editor',
    mode: 'creator',
    section: 'voice',
    title: 'Voice Profiles — manage voice characteristics',
  },
  {
    panel: 'voice-lab',
    label: accountWorkspace.voiceLabLabel,
    description: 'Tone and pattern analysis',
    minRole: 'editor',
    mode: 'creator',
    section: 'voice',
    title: 'Voice lab — tone analysis and pattern extraction',
  },
  {
    panel: 'voice-map',
    label: accountWorkspace.voiceMapLabel,
    description: 'Profile topology map',
    minRole: 'editor',
    mode: 'creator',
    section: 'voice',
    title: 'Voice map — vector and principle topology',
  },
  {
    panel: 'analytics',
    label: 'Analytics',
    description: 'Performance & gaps',
    minRole: 'editor',
    mode: 'creator',
    section: 'insights',
    title: 'Analytics — resource performance and statistics',
  },
  {
    panel: 'library-growth',
    label: accountWorkspace.libraryGrowthLabel,
    description: 'Proposals and approve flow',
    minRole: 'admin',
    mode: 'admin',
    section: 'library',
    title: 'Library growth — scheduled proposals and voice generation',
  },
  {
    panel: 'moderation',
    label: 'Moderation',
    description: 'Pending uploads',
    minRole: 'admin',
    mode: 'admin',
    section: 'library',
    title: 'Moderation — review community uploads',
  },
  {
    panel: 'site-review',
    label: 'Site review',
    description: 'Public pages',
    minRole: 'admin',
    mode: 'admin',
    section: 'library',
    title: 'Site review — public pages and corrections',
  },
  {
    panel: 'admin-users',
    label: accountWorkspace.adminUsersLabel,
    description: 'Accounts and audit',
    minRole: 'admin',
    mode: 'admin',
    section: 'platform',
    title: 'Users — registered accounts, verification status, auth audit',
  },
  {
    panel: 'admin-ops',
    label: accountWorkspace.adminOpsLabel,
    description: 'Usage, credits, hosting',
    minRole: 'admin',
    mode: 'admin',
    section: 'platform',
    title: 'Ops — usage, AI gateway, hosting (super-admin sections gated in UI)',
  },
];
