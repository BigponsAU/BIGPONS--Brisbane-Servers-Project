/**
 * Secondary account workspace modules (passkey registration, moderation, library growth).
 * Passkey *login* is wired in account-auth.ts so it works while signed out.
 */
import {
  bindPortalAccountExtensions,
  loadClientWorkspaceData,
  loadModerationQueue,
  loadPasskeyCredentials,
  loadHostingStatus,
  loadSiteReviewSections,
  type PortalAccountContext,
} from './portal-account-extensions';
import { bindLibraryGrowthPanel, loadLibraryGrowthPanel } from './account-library-growth';
import { bindVoiceFeaturePanels } from './account-workspace-voice-features';
import { bindAdminOpsPanel, loadAdminOpsPanel } from './account-admin-ops';
import { bindAdminBillingPanel, loadAdminBillingPanel } from './account-admin-billing';
import { syncPortalAccountContext, getPortalAccountContext } from './account-workspace-runtime';

export function bootAccountWorkspaceExtensions(): void {
  const win = window as unknown as {
    __portalAccountExt?: Record<string, unknown>;
    __portalAccountCtx?: PortalAccountContext;
    __portalBridge?: Record<string, unknown>;
  };

  // Register loaders first so Overview can still refresh if a later bind throws.
  win.__portalAccountExt = {
    loadClientWorkspaceData,
    loadPasskeyCredentials,
    loadModerationQueue,
    loadSiteReviewSections,
    loadHostingStatus,
    loadLibraryGrowthPanel,
    loadAdminOpsPanel,
    loadAdminBillingPanel,
  };

  const resolveCtx = (): PortalAccountContext => getPortalAccountContext() as unknown as PortalAccountContext;

  const bindSafely = (label: string, run: () => void): void => {
    try {
      run();
    } catch (error) {
      console.error(`[Portal] Failed to bind ${label}:`, error);
    }
  };

  bindSafely('portal account extensions', () => bindPortalAccountExtensions(resolveCtx));
  bindSafely('library growth', () => bindLibraryGrowthPanel(resolveCtx));
  bindSafely('voice feature panels', () => bindVoiceFeaturePanels());
  bindSafely('admin ops', () => bindAdminOpsPanel(resolveCtx));
  bindSafely('admin billing', () => bindAdminBillingPanel(resolveCtx));

  syncPortalAccountContext();
}
