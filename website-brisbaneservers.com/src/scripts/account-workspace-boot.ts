/**
 * Secondary account workspace modules (passkeys, moderation, library growth).
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

export function bootAccountWorkspaceExtensions(): void {
  const bridge = () => (window as unknown as { __portalBridge?: Record<string, unknown> }).__portalBridge;

  const ctx = (): PortalAccountContext => ({
    apiBaseUrl: (bridge()?.apiBaseUrl as string) ?? '',
    getAuthToken: () => (bridge()?.getAuthToken as () => string | null)?.() ?? null,
    setAuthToken: (token) => (bridge()?.setAuthToken as (t: string | null) => void)?.(token),
    showDashboard: (user) =>
      (bridge()?.showDashboard as (u: { email?: string; role?: string }) => void)?.(user),
    showLogin: () => (bridge()?.showLogin as () => void)?.(),
    showAuthBanner: (message, isError) =>
      (bridge()?.showAuthBanner as (m: string, e?: boolean) => void)?.(message, isError),
    navigateToPanel: (panel) => (bridge()?.navigateToPanel as (p: string) => void)?.(panel),
    selectResource: (id) => (bridge()?.selectResource as (id: string) => void)?.(id),
  });

  const win = window as unknown as {
    __portalAccountExt?: Record<string, unknown>;
    __portalAccountCtx?: PortalAccountContext;
    __portalBridge?: Record<string, unknown>;
  };

  win.__portalAccountExt = {
    loadClientWorkspaceData,
    loadPasskeyCredentials,
    loadModerationQueue,
    loadSiteReviewSections,
    loadHostingStatus,
    loadLibraryGrowthPanel,
  };

  const context = ctx();
  win.__portalAccountCtx = context;
  bindPortalAccountExtensions(context);
  bindLibraryGrowthPanel(context);
  bindVoiceFeaturePanels();

  if (win.__portalBridge) {
    win.__portalAccountCtx = ctx();
  }
}
