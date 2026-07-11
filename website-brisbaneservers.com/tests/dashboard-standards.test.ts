import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ACCOUNT_SCRIPTS = [
  'account-workspace-app.ts',
  'account-workspace-global-search.ts',
  'account-workspace-resources.ts',
  'account-workspace-profiles.ts',
  'account-workspace-voice-features.ts',
  'account-library-growth.ts',
  'account-admin-moderation.ts',
  'account-admin-ops.ts',
  'account-admin-billing.ts',
  'account-admin-users.ts',
];

const PANEL_FILES = [
  'AccountOverviewPanel.astro',
  'AccountResourcesPanel.astro',
  'AccountProfilesPanel.astro',
  'AccountAnalyticsPanel.astro',
  'AccountVoiceLabPanel.astro',
  'AccountVoiceMapPanel.astro',
  'AccountGrowthPanel.astro',
  'AccountModerationPanel.astro',
  'AccountSiteReviewPanel.astro',
  'AccountAdminUsersPanel.astro',
  'AccountAdminOpsPanel.astro',
  'AccountAdminBillingPanel.astro',
];

describe('dashboard production standards', () => {
  it('account workspace scripts avoid window.confirm and window.prompt', async () => {
    for (const file of ACCOUNT_SCRIPTS) {
      const source = await readFile(path.resolve('src/scripts', file), 'utf8');
      expect(source, file).not.toMatch(/\bwindow\.confirm\s*\(/);
      expect(source, file).not.toMatch(/\bwindow\.prompt\s*\(/);
    }
  });

  it('admin moderation and growth use styled confirms', async () => {
    for (const file of ['account-admin-moderation.ts', 'account-library-growth.ts', 'account-admin-ops.ts', 'account-admin-billing.ts']) {
      const source = await readFile(path.resolve('src/scripts', file), 'utf8');
      expect(source).toContain('showConfirmDialog');
    }
  });

  it('every panel uses panel-shell or marketing band wrapper', async () => {
    const componentsDir = path.resolve('src/components/account');
    for (const file of PANEL_FILES) {
      const source = await readFile(path.join(componentsDir, file), 'utf8');
      const hasShell = source.includes('panel-shell') || source.includes('account-workspace-panel-section');
      expect(hasShell, file).toBe(true);
    }
  });

  it('shared panel band component exists for consistency', async () => {
    const band = await readFile(
      path.resolve('src/components/account/AccountWorkspacePanelBand.astro'),
      'utf8',
    );
    expect(band).toContain('SectionIntro');
    expect(band).toContain('account-workspace-panel-section');
  });

  it('workspace header exposes wired global search markup', async () => {
    const header = await readFile(
      path.resolve('src/components/account/AccountWorkspaceHeader.astro'),
      'utf8',
    );
    expect(header).toContain('data-workspace-global-search');
    expect(header).toContain('header-global-search');
    expect(header).toContain('id="global-search"');
    expect(header).toContain('id="workspace-global-search-results"');
  });

  it('portal markov tracker exposes resource lineage API', async () => {
    const source = await readFile(path.resolve('src/scripts/portal-markov-tracker.ts'), 'utf8');
    expect(source).toContain('trackResourceCreation');
    expect(source).toContain('getPortalMarkovSummary');
    expect(source).toContain('registerPortalWorkspaceFunctions');
  });
});
