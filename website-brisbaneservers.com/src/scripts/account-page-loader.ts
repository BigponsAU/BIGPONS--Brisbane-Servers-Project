/**
 * Loads the account workspace app in a separate chunk so sign-in HTML/CSS can paint first.
 */
import type { AccountWorkspaceBootConfig } from './account-workspace-app';

export type { AccountWorkspaceBootConfig };

let bootPromise: Promise<void> | null = null;

export function bootAccountPage(config: AccountWorkspaceBootConfig): void {
  if (!bootPromise) {
    bootPromise = import('./account-workspace-app.ts').then(({ bootAccountWorkspace }) => {
      bootAccountWorkspace(config);
    });
  }
  void bootPromise;
}
