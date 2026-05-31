/**
 * Canonical naming for the signed-in workspace at /account.
 * URL: /account (legacy /portal redirects). Internal DOM ids may still use historical names.
 */
export const accountWorkspace = {
  productName: 'Account workspace',
  productNameShort: 'Workspace',
  /** Default panel after sign-in (internal id remains `dashboard`). */
  overviewLabel: 'Overview',
  overviewDescription: 'Your activity, resources, contributions, and quick actions in one place.',
  libraryGrowthLabel: 'Library growth',
  libraryGrowthDescription:
    'Automates new guides, resources, and case study materials — not voice profiles. You create profiles in Voice profiles; growth writes content using your default site voice after you approve each proposal.',
} as const;
