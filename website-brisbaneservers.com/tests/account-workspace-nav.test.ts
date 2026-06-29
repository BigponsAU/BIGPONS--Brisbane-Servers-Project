import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  workspaceNavItems,
  type WorkspacePanelId,
} from '../src/data/account-workspace';

const ALL_PANELS: WorkspacePanelId[] = [
  'dashboard',
  'resources',
  'profiles',
  'analytics',
  'voice-lab',
  'voice-map',
  'library-growth',
  'moderation',
  'site-review',
  'admin-users',
  'admin-ops',
];

describe('account workspace navigation', () => {
  it('lists every panel id in workspaceNavItems', () => {
    const navPanels = new Set(workspaceNavItems.map((item) => item.panel));
    for (const panel of ALL_PANELS) {
      expect(navPanels.has(panel), `missing nav item for ${panel}`).toBe(true);
    }
    expect(navPanels.size).toBe(ALL_PANELS.length);
  });

  it('refreshPanelData handles every navigable panel', async () => {
    const appSource = await readFile(
      path.resolve('src/scripts/account-workspace-app.ts'),
      'utf8',
    );
    const start = appSource.indexOf('function refreshPanelData(panelName: string)');
    const end = appSource.indexOf('(window as any).navigateToPanel = function', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const refreshBlock = appSource.slice(start, end);
    for (const panel of ALL_PANELS) {
      expect(
        refreshBlock.includes(`'${panel}'`) || refreshBlock.includes(`"${panel}"`),
        `refreshPanelData missing branch for ${panel}`,
      ).toBe(true);
    }
  });
});
