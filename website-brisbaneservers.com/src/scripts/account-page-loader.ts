/**
 * Loads the account workspace app in a separate chunk so sign-in HTML/CSS can paint first.
 */
import type { AccountWorkspaceBootConfig } from './account-workspace-app';

export type { AccountWorkspaceBootConfig };

let bootPromise: Promise<void> | null = null;

function startBoot(config: AccountWorkspaceBootConfig): Promise<void> {
  if (!bootPromise) {
    bootPromise = import('./account-workspace-app.ts').then(({ bootAccountWorkspace }) => {
      bootAccountWorkspace(config);
    });
  }
  return bootPromise;
}

export function bootAccountPage(config: AccountWorkspaceBootConfig): void {
  void startBoot(config);
}
