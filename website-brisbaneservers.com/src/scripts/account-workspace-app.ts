// @ts-nocheck — legacy client bundle migrated from portal.astro; incremental typing planned.
/**
 * Account workspace dashboard (lazy-loaded after sign-in).
 * Auth lives in account-auth.ts.
 */
import {
  workspaceFetch,
  setInMemorySessionToken,
  getInMemorySessionToken,
  setAccountNavSignedIn,
} from '../lib/client-api';
import { initWorkspaceModeSwitcher, setWorkspaceMode } from './account-workspace-mode';
import { trackPortalPanel, trackPortalAction, registerPortalWorkspaceFunctions } from './portal-markov-tracker';
import { closeMobileNav } from './nav-mobile';
import {
  type AccountWorkspaceBootConfig,
  getPortalRuntime,
  tryGetPortalRuntime,
  applySessionToken,
  clearSessionToken,
  handleWorkspaceSessionExpired,
  syncAccountPageTitle,
  setMessage,
  showAuthBanner,
  publishPortalBridge,
  syncPortalAccountContext,
  getPortalAccountContext,
  hasWorkspaceSession,
} from './account-workspace-runtime';
import { ensureProfilesPanel, ensureResourcesPanel, registerPanelLoaderStubs } from './account-workspace-panel-loader';
import { createVoiceContext } from './account-workspace-voice-context';
import { fetchAuthenticatedResources, fetchStarterBlocks } from './account-workspace-resource-api';
import { getWorkspaceResources, setWorkspaceResources, upsertWorkspaceResource } from './account-workspace-resource-store';
import { escapeHtml, escapeJsString, treeGroupLabel, treeSlug, resourceExcerpt, showWorkspaceNotification, runWorkspaceGuardedAction, setStarterBlockCardsBusy, setElementBusy, workspaceErrorMessage } from './account-workspace-utils';
import { hasWorkspaceCapability, type WorkspaceMinRole } from '../lib/workspace-roles';
import { workspaceNavItems } from '../data/account-workspace';
import { showConfirmDialog } from './portal-confirm-dialog';
import {
  bootWorkspaceGlobalSearch,
  focusWorkspaceGlobalSearch,
} from './account-workspace-global-search';

export type { AccountWorkspaceBootConfig };

let dashboardBooted = false;

function applyAccountWorkspaceFormDefaults(): void {
  document.querySelectorAll('form.resource-form, #edit-resource-form').forEach((node) => {
    const form = node as HTMLFormElement;
    form.removeAttribute('method');
    const action = form.getAttribute('action') ?? '';
    if (!action || action === '#') {
      form.setAttribute('action', 'javascript:void(0)');
    }
  });
}

type ResourceCreateSection = 'generate' | 'upload' | 'paste';

/** @deprecated Use bootAccountAuth + lazy bootAccountWorkspaceDashboard */
export function bootAccountWorkspace(config: AccountWorkspaceBootConfig): void {
  void import('./account-auth.ts').then((mod) => mod.bootAccountAuth(config));
}

export function bootAccountWorkspaceDashboard(): void {
  if (dashboardBooted) return;
  dashboardBooted = true;

  applyAccountWorkspaceFormDefaults();

  const rt = tryGetPortalRuntime();
  if (!rt) {
    throw new Error('Portal runtime must be initialized before loading the dashboard');
  }

  let VOICE_API_URL = rt.voiceApiUrl;
  let sessionActive = rt.sessionActive;
  const ACCOUNT_PATH = rt.accountPath;
  const pageTitleSignedIn = rt.pageTitleSignedIn;
  const pageTitleSignedOut = rt.pageTitleSignedOut;
  const isDev = import.meta.env.MODE === 'development';
  const showNotification = showWorkspaceNotification;

  const getVoiceApiUrl = (): string => rt.voiceApiUrl || VOICE_API_URL;

  function clearDashboardLoadingPlaceholders(message?: string): void {
    const activityList = document.getElementById('recent-activity-list');
    if (activityList) {
      activityList.innerHTML = message
        ? `<div class="activity-loading"><p>${escapeHtml(message)}</p></div>`
        : activityList.innerHTML;
    }
    const previewGrid = document.getElementById('recent-resources-preview');
    if (previewGrid?.querySelector('.preview-loading, .preview-loading p')) {
      previewGrid.innerHTML = message
        ? `<div class="preview-loading"><p>${escapeHtml(message)}</p></div>`
        : previewGrid.innerHTML;
    }
  }

  function setDashboardStatsError(message: string): void {
    ['dashboard-total-resources', 'dashboard-published', 'dashboard-drafts', 'dashboard-avg-score'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = '—';
    });
    clearDashboardLoadingPlaceholders(message);
  }

  const syncRuntimeFromLocals = (): void => {
    VOICE_API_URL = rt.voiceApiUrl;
    sessionActive = rt.sessionActive;
    publishPortalBridge({});
  };

  async function syncBaseVoiceProfile(user: { role?: string }): Promise<void> {
    const roles = ['super-admin', 'admin', 'editor'];
    if (!user?.role || !roles.includes(user.role)) return;
    try {
      const res = await workspaceFetch(`${getVoiceApiUrl()}/profiles/create-base`, {
        method: 'POST',
        headers: {
        }
      });
      if (res.ok && import.meta.env.MODE === 'development') {
        const data = await res.json().catch(() => ({}));
        console.log('[Portal] Base voice profile:', (data as { message?: string }).message ?? 'synced');
      }
    } catch (e) {
      console.warn('[Portal] Base voice profile sync failed (non-fatal):', e);
    }
  }

  let workspaceSidebarViewportMode: 'desktop' | 'mobile' | null = null;

  function setMobileSidebarOpen(open: boolean): void {
    const sidebar = document.getElementById('portal-sidebar');
    const mobileToggle = document.getElementById('mobile-menu-toggle');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (!sidebar) return;
    sidebar.classList.toggle('open', open);
    // Keep closed drawer from intercepting taps on the page/header.
    sidebar.style.pointerEvents = open || window.innerWidth >= 1024 ? '' : 'none';
    document.body.classList.toggle('portal-mobile-nav-open', open && window.innerWidth <= 1023);
    const expanded = open ? 'true' : 'false';
    mobileToggle?.setAttribute('aria-expanded', expanded);
    sidebarToggle?.setAttribute('aria-expanded', expanded);
  }

  function syncWorkspaceSidebarLayout(force = false): void {
    const sidebar = document.getElementById('portal-sidebar');
    if (!sidebar) return;
    sidebar.style.removeProperty('transform');
    sidebar.style.removeProperty('display');
    sidebar.style.removeProperty('position');
    const nextMode = window.innerWidth >= 1024 ? 'desktop' : 'mobile';
    // iOS URL-bar show/hide fires resize — only reset open state when crossing breakpoints.
    if (!force && workspaceSidebarViewportMode === nextMode) {
      if (nextMode === 'desktop') setMobileSidebarOpen(true);
      return;
    }
    workspaceSidebarViewportMode = nextMode;
    setMobileSidebarOpen(nextMode === 'desktop');
  }

  let extensionsBooted = false;
  let extensionsBootPromise: Promise<void> | null = null;

  function ensureWorkspaceExtensions(): Promise<void> {
    if (extensionsBooted && extensionsBootPromise) return extensionsBootPromise;
    if (!extensionsBootPromise) {
      extensionsBootPromise = import('./account-workspace-boot.ts')
        .then((mod) => {
          mod.bootAccountWorkspaceExtensions();
          extensionsBooted = true;
        })
        .catch((error) => {
          // Allow a later Overview refresh to retry after a transient chunk/bind failure.
          extensionsBootPromise = null;
          extensionsBooted = false;
          throw error;
        });
    }
    return extensionsBootPromise;
  }

  async function loadOverviewClientInsights(): Promise<void> {
    syncPortalAccountContext();
    const accountCtx = getPortalAccountContext();
    try {
      await ensureWorkspaceExtensions();
      window.__portalAccountExt?.loadClientWorkspaceData(accountCtx);
      window.__portalAccountExt?.loadPasskeyCredentials(accountCtx);
    } catch (error) {
      console.error('[Portal] Workspace extensions failed; loading AI usage fallback:', error);
      try {
        const billing = await import('./account-billing.ts');
        await billing.loadOverviewAiBilling(accountCtx as Parameters<typeof billing.loadOverviewAiBilling>[0]);
      } catch (fallbackError) {
        console.error('[Portal] AI usage fallback failed:', fallbackError);
        const summaryEl = document.getElementById('client-ai-usage-summary');
        if (summaryEl && /loading/i.test(summaryEl.textContent || '')) {
          summaryEl.textContent = 'Could not load usage.';
        }
      }
    }
  }

  function showLogin(): void {
    const bridge = (window as Window & { __portalBridge?: { showLogin?: () => void } }).__portalBridge;
    bridge?.showLogin?.();
  }

  let workspaceUser: { id?: string; role?: string } | null = null;

  // Show dashboard
  function showDashboard(user: any): void {
    workspaceUser = user;
    (window as Window & { __workspaceSessionUser?: { role?: string } }).__workspaceSessionUser = user;
    sessionActive = true;
    rt.sessionActive = true;
    syncRuntimeFromLocals();
    void ensureWorkspaceExtensions();

    if (import.meta.env.MODE === 'development') {
      console.log('[Portal] Showing dashboard for user:', user);
    }
    document.getElementById('login-screen')!.style.display = 'none';
    const basicHome = document.getElementById('account-basic-home');
    if (basicHome) {
      basicHome.style.display = 'none';
      basicHome.classList.remove('is-visible');
    }
    const authBoot = document.getElementById('account-auth-boot');
    if (authBoot) authBoot.hidden = true;

    syncPortalAccountContext();
    applyRoleAccess(user);

    const dashboardEl = document.getElementById('admin-dashboard');
    if (dashboardEl) {
      dashboardEl.style.display = 'block';
    }
    document.body.classList.add('account-workspace-dashboard-active');
    closeMobileNav();

    const greeting = document.getElementById('workspace-greeting');
    if (greeting) {
      greeting.textContent = user?.email ? `Welcome back, ${user.email}` : 'Welcome back';
    }
    
    const userInfo = document.getElementById('user-info');
    const sidebarUserInfo = document.getElementById('sidebar-user-info');
    if (userInfo) {
      userInfo.textContent = `Logged in as ${user.email}`;
    }
    if (sidebarUserInfo) {
      sidebarUserInfo.textContent = user.email;
    }

    registerPortalWorkspaceFunctions();
    bootWorkspaceGlobalSearch({
      navigateToPanel,
      applyResourceSearchQuery,
      filterProfileCardsByQuery,
      canAccessPanel: canAccessWorkspacePanel,
    });

    syncWorkspaceSidebarLayout();
    setAccountNavSignedIn(true);
    syncAccountPageTitle(true);

    // Show dashboard panel by default
    navigateToPanel('dashboard');

    // Load dashboard data and resources
    console.log('[Portal] Loading dashboard data');
    void ensureWorkspaceExtensions().then(() => {
      void syncBaseVoiceProfile(user);
      // navigateToPanel('dashboard') already loads overview data — avoid duplicate /resources calls.
      // Ensure tree view is shown by default
      const workspace = document.getElementById('resource-workspace');
      const listView = document.getElementById('resources-list-view');
      if (workspace && listView) {
        workspace.classList.remove('hidden');
        listView.classList.add('hidden');
      }

      // Resource filters bind when the Resources chunk loads (setupResourceFilters there).
      void loadOverviewClientInsights();
    }).catch((error) => {
      console.error('[Portal] Workspace extensions boot failed:', error);
      void loadOverviewClientInsights();
    });
  }

  getPortalRuntime().showDashboardImpl = showDashboard;

  function applyRoleAccess(user: { id?: string; role?: string; emailVerified?: boolean; workspaceEnabled?: boolean }): void {
    document.querySelectorAll<HTMLElement>('[data-min-role]').forEach((el) => {
      const minRole = el.dataset.minRole as 'client' | 'viewer' | 'editor' | 'admin';
      const allowed = hasWorkspaceCapability(user, minRole);
      if (allowed) {
        el.style.removeProperty('display');
        // Content-managed sections keep [hidden] until their loader reveals them
        // (e.g. analytics suggestions/index). Role chrome clears hidden immediately.
        if (el.dataset.visibility !== 'content') {
          el.removeAttribute('hidden');
        }
        el.setAttribute('aria-hidden', el.hasAttribute('hidden') ? 'true' : 'false');
      } else {
        el.style.display = 'none';
        el.setAttribute('aria-hidden', 'true');
      }
    });
    document.querySelectorAll<HTMLElement>('[data-require-role]').forEach((el) => {
      const requiredRole = el.dataset.requireRole;
      const allowed = requiredRole ? user?.role === requiredRole : true;
      if (allowed) {
        el.style.removeProperty('display');
        if (el.dataset.visibility !== 'content') {
          el.removeAttribute('hidden');
        }
        el.setAttribute('aria-hidden', el.hasAttribute('hidden') ? 'true' : 'false');
      } else {
        el.style.display = 'none';
        el.setAttribute('aria-hidden', 'true');
      }
    });
    syncNavSectionVisibility();
    initWorkspaceModeSwitcher(user);
    const isAdmin = user?.role === 'admin' || user?.role === 'super-admin';
    document.querySelectorAll<HTMLOptionElement>('.admin-only-option').forEach((el) => {
      el.hidden = !isAdmin;
    });
    document.querySelectorAll<HTMLElement>('.filter-btn--admin[data-min-role="admin"]').forEach((el) => {
      if (isAdmin) {
        el.hidden = false;
        el.removeAttribute('hidden');
      } else {
        el.hidden = true;
      }
    });
  }

  function syncNavSectionVisibility(): void {
    document.querySelectorAll<HTMLElement>('.nav-section[data-nav-section]').forEach((section) => {
      const items = section.querySelectorAll<HTMLElement>('.sidebar-nav-item');
      const hasVisible = Array.from(items).some(
        (item) => !item.hidden && item.style.display !== 'none',
      );
      section.hidden = !hasVisible;
      section.setAttribute('aria-hidden', hasVisible ? 'false' : 'true');
    });
  }

  const voiceContext = createVoiceContext({ getVoiceApiUrl, isDev });

  const panelDeps = {
    profiles: {
      getVoiceApiUrl,
      navigateToPanel: (panelName: string) => (window as any).navigateToPanel(panelName),
      ensureWorkspaceVoiceProfiles: () => voiceContext.ensureWorkspaceVoiceProfiles(),
      populateWorkspaceVoiceProfileSelect: (profiles: unknown[]) =>
        voiceContext.populateWorkspaceVoiceProfileSelect(profiles),
      isDev,
    },
    resources: {
      getVoiceApiUrl,
      isDev,
      sessionActive,
      showNotification,
      loadDashboardData,
      handleWorkspaceSessionExpired,
      navigateToPanel: (panelName: string) => (window as any).navigateToPanel(panelName),
      voiceContext,
      getWorkspaceUser: () => workspaceUser,
      hasWorkspaceCapability,
      updateAnalyticsDisplay,
      applyDashboardResourceSnapshot,
    },
  };

  registerPanelLoaderStubs(panelDeps.profiles, panelDeps.resources);

  let loadResources: (options?: { revealResourceId?: string }) => Promise<void> = async (opts) => {
    const api = await ensureResourcesPanel(panelDeps.resources);
    return api.loadResources(opts);
  };

  let loadProfiles: () => Promise<void> = async () => {
    const api = await ensureProfilesPanel(panelDeps.profiles);
    return api.loadProfiles();
  };


  // Navigate to panel with smooth transitions
  let panelNavGeneration = 0;

  function refreshPanelData(panelName: string): void {
    if (panelName === 'dashboard') {
      trackPortalAction('loadDashboardData');
      loadDashboardData();
      void loadOverviewClientInsights();
    } else if (panelName === 'resources') {
      trackPortalAction('loadResources');
      const workspace = document.getElementById('resource-workspace');
      const listView = document.getElementById('resources-list-view');
      if (workspace && listView) {
        workspace.classList.remove('hidden');
        listView.classList.add('hidden');
      }
      loadResources();
      void voiceContext.ensureWorkspaceVoiceProfiles();
    } else if (panelName === 'profiles') {
      trackPortalAction('loadProfiles');
      setTimeout(() => {
        loadProfiles();
      }, 100);
    } else if (panelName === 'analytics') {
      trackPortalAction('loadAnalytics');
      loadAnalytics();
    } else if (panelName === 'voice-map' || panelName === 'voice-lab') {
      void import('./account-workspace-voice-features.ts').then((mod) => mod.onVoicePanelShown(panelName));
    } else if (panelName === 'library-growth') {
      trackPortalAction('loadLibraryGrowthPanel');
      void ensureWorkspaceExtensions().then(() => {
        window.__portalAccountExt?.loadLibraryGrowthPanel(getPortalAccountContext());
      }).catch((err) => {
        console.error('[Portal] Failed to boot extensions for library growth:', err);
      });
    } else if (panelName === 'moderation') {
      trackPortalAction('loadModerationQueue');
      void ensureWorkspaceExtensions().then(() => {
        window.__portalAccountExt?.loadModerationQueue(getPortalAccountContext());
      }).catch((err) => {
        console.error('[Portal] Failed to boot extensions for moderation:', err);
      });
    } else if (panelName === 'site-review') {
      trackPortalAction('loadSiteReviewSections');
      void ensureWorkspaceExtensions().then(() => {
        const ctx = getPortalAccountContext();
        window.__portalAccountExt?.loadSiteReviewSections(ctx);
        window.__portalAccountExt?.loadHostingStatus(ctx);
      }).catch((err) => {
        console.error('[Portal] Failed to boot extensions for site review:', err);
      });
    } else if (panelName === 'admin-users') {
      trackPortalAction('loadAdminUsersPanel');
      void import('./account-admin-users.ts')
        .then((mod) => mod.loadAdminUsersPanel(getVoiceApiUrl()))
        .catch((err) => {
          console.error('[Portal] Failed to load admin users panel module:', err);
          const tbody = document.getElementById('admin-users-tbody');
          const summary = document.getElementById('admin-users-summary');
          const auditBody = document.getElementById('admin-auth-audit-tbody');
          if (tbody) tbody.innerHTML = '<tr><td colspan="5">Could not load users panel.</td></tr>';
          if (summary) summary.textContent = 'Failed to load users panel.';
          if (auditBody) auditBody.innerHTML = '<tr><td colspan="4">Could not load auth events.</td></tr>';
        });
    } else if (panelName === 'admin-ops') {
      trackPortalAction('loadAdminOpsPanel');
      void ensureWorkspaceExtensions().then(() => {
        window.__portalAccountExt?.loadAdminOpsPanel(getPortalAccountContext());
      }).catch((err) => {
        console.error('[Portal] Failed to boot extensions for admin ops:', err);
      });
    } else if (panelName === 'admin-billing') {
      trackPortalAction('loadAdminBillingPanel');
      void ensureWorkspaceExtensions().then(() => {
        window.__portalAccountExt?.loadAdminBillingPanel(getPortalAccountContext());
      }).catch((err) => {
        console.error('[Portal] Failed to boot extensions for admin billing:', err);
      });
    }
  }

  function canAccessWorkspacePanel(panelName: string): boolean {
    const nav = workspaceNavItems.find((item) => item.panel === panelName);
    const minRole = (document.getElementById(`${panelName}-panel`)?.dataset.minRole ??
      nav?.minRole) as WorkspaceMinRole | undefined;
    if (!minRole) return Boolean(nav);
    return hasWorkspaceCapability(workspaceUser, minRole);
  }

  function navigateToPanel(panelName: string): void {
    if (import.meta.env.MODE === 'development') {
      console.log('[Portal] Navigating to panel:', panelName);
    }

    const targetPanel = document.getElementById(`${panelName}-panel`) as HTMLElement | null;
    const navMeta = workspaceNavItems.find((item) => item.panel === panelName);
    const minRole = (targetPanel?.dataset.minRole ?? navMeta?.minRole) as WorkspaceMinRole | undefined;
    if (minRole && !hasWorkspaceCapability(workspaceUser, minRole)) {
      if (import.meta.env.MODE === 'development') {
        console.warn('[Portal] Access denied for panel:', panelName);
      }
      if (panelName !== 'dashboard') {
        navigateToPanel('dashboard');
      }
      return;
    }

    if (navMeta?.mode) {
      const tracks = document.getElementById('sidebar-nav-tracks');
      if (tracks?.dataset.workspaceMode !== navMeta.mode) {
        setWorkspaceMode(navMeta.mode, false);
      }
    }

    if (targetPanel?.classList.contains('active')) {
      refreshPanelData(panelName);
      if (window.innerWidth <= 1023) setMobileSidebarOpen(false);
      return;
    }

    const generation = ++panelNavGeneration;
    
    // Hide all panels with fade out
    document.querySelectorAll('.portal-panel').forEach((panel: Element) => {
      const panelEl = panel as HTMLElement;
      if (panelEl === targetPanel) {
        return;
      }
      if (panelEl.classList.contains('active')) {
        panelEl.style.opacity = '0';
        panelEl.style.transform = 'translateY(10px)';
        setTimeout(() => {
          if (generation !== panelNavGeneration) return;
          panelEl.classList.remove('active');
          panelEl.style.display = 'none';
          panelEl.style.opacity = '';
          panelEl.style.transform = '';
        }, 150);
      } else {
        panelEl.classList.remove('active');
        panelEl.style.display = 'none';
      }
    });

    // Show selected panel with fade in
    const panel = targetPanel;
    if (panel) {
      panel.style.display = 'block';
      panel.style.opacity = '0';
      panel.style.transform = 'translateY(10px)';
      panel.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      
      // Trigger animation
      setTimeout(() => {
        if (generation !== panelNavGeneration) return;
        panel.classList.add('active');
        panel.style.opacity = '1';
        panel.style.transform = 'translateY(0)';
        if (import.meta.env.MODE === 'development') {
          console.log('[Portal] Panel shown:', panelName);
        }
      }, 50);
    } else {
      console.error('[Portal] Panel not found:', `${panelName}-panel`);
    }

    // Update sidebar navigation
    document.querySelectorAll('.sidebar-nav-item').forEach((item: Element) => {
      item.classList.remove('active');
    });
    const navItem = document.querySelector(`.sidebar-nav-item[data-panel="${panelName}"]`);
    if (navItem) {
      navItem.classList.add('active');
      // Scroll nav item into view if needed
      navItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Close mobile drawer after navigation; keep desktop sidebar visible.
    if (window.innerWidth <= 1023) {
      setMobileSidebarOpen(false);
    } else {
      const sidebar = document.getElementById('portal-sidebar');
      if (sidebar) {
        sidebar.style.transform = 'translateX(0)';
        sidebar.style.display = 'flex';
      }
    }

    refreshPanelData(panelName);

    trackPortalPanel(panelName);
    if (panelName === 'voice-lab') {
      void import('./portal-markov-tracker').then((mod) => mod.renderPortalMarkovIntoVoiceLab());
    }
  }

  (window as any).navigateToPanel = navigateToPanel;

  // Sidebar nav must bind here (always-loaded), not in the lazy resources chunk —
  // otherwise Admin console links are dead until Resources has been visited.
  document.getElementById('portal-sidebar')?.addEventListener('click', (event) => {
    const item = (event.target as HTMLElement).closest('.sidebar-nav-item[data-panel]') as HTMLElement | null;
    if (!item) return;
    event.preventDefault();
    const panel = item.getAttribute('data-panel');
    if (panel) navigateToPanel(panel);
  });

  // Sidebar / mobile menu toggle — direct bind + capture delegation for iOS reliability.
  const isSidebarToggleTarget = (target: EventTarget | null): boolean => {
    const el = target as Element | null;
    if (!el || typeof (el as Element).closest !== 'function') return false;
    return Boolean((el as Element).closest('#mobile-menu-toggle, #sidebar-toggle, .mobile-menu-toggle, .sidebar-toggle'));
  };

  let lastSidebarToggleAt = 0;

  const toggleMobileSidebar = (event?: Event) => {
    event?.preventDefault();
    event?.stopPropagation();
    // Guard: iOS can fire pointerup + click for one tap.
    const now = Date.now();
    if (now - lastSidebarToggleAt < 450) return;
    lastSidebarToggleAt = now;
    const sidebar = document.getElementById('portal-sidebar');
    if (!sidebar) return;
    setMobileSidebarOpen(!sidebar.classList.contains('open'));
  };

  const bindSidebarToggle = (el: Element | null) => {
    if (!el || (el as HTMLElement).dataset.sidebarToggleBound === '1') return;
    (el as HTMLElement).dataset.sidebarToggleBound = '1';
    el.addEventListener('click', toggleMobileSidebar);
  };

  bindSidebarToggle(document.getElementById('mobile-menu-toggle'));
  bindSidebarToggle(document.getElementById('sidebar-toggle'));

  document.addEventListener(
    'click',
    (e) => {
      if (!isSidebarToggleTarget(e.target)) return;
      const btn = (e.target as Element).closest('#mobile-menu-toggle, #sidebar-toggle');
      if (btn && (btn as HTMLElement).dataset.sidebarToggleBound === '1') return;
      toggleMobileSidebar(e);
    },
    true,
  );

  // Close sidebar when clicking overlay / outside (mobile)
  document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('portal-sidebar');
    if (!sidebar?.classList.contains('open') || window.innerWidth > 1023) return;
    if (isSidebarToggleTarget(e.target)) return;
    const target = e.target as Node | null;
    if (target && !sidebar.contains(target)) {
      setMobileSidebarOpen(false);
    }
  });

  // Load dashboard data
  async function loadDashboardData(retryCount = 0): Promise<void> {
    try {
      const result = await fetchAuthenticatedResources(getVoiceApiUrl());

      if (result.ok) {
        applyDashboardResourceSnapshot(result.resources as any[]);
      } else if (result.status === 401) {
        if (hasWorkspaceSession() && retryCount < 2) {
          await new Promise((resolve) => window.setTimeout(resolve, 350 * (retryCount + 1)));
          return loadDashboardData(retryCount + 1);
        }
        if (hasWorkspaceSession()) {
          await handleWorkspaceSessionExpired();
          return;
        }
        clearSessionToken();
        showLogin();
        showAuthBanner('Your session expired. Please sign in again.', 'warning');
      } else {
        setDashboardStatsError('Could not load workspace data. Please try again in a moment.');
      }
    } catch (error) {
      console.error('[Portal] Error loading dashboard data:', error);
      setDashboardStatsError('Could not reach the workspace service. Please try again in a moment.');
    }
  }

  // Update recent activity - sync with actual resources
  function updateRecentActivity(resources: any[]): void {
    const activityList = document.getElementById('recent-activity-list');
    if (!activityList) return;

    // Filter out starter blocks for recent activity (show user's own resources)
    const userResources = resources.filter((r: any) => !r.isStarterBlock);
    
    const recent = userResources
      .sort((a: any, b: any) => {
        const dateA = new Date(a.generatedAt || 0).getTime();
        const dateB = new Date(b.generatedAt || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 5);

    if (recent.length === 0) {
      activityList.innerHTML = `
        <div class="activity-loading">
          <p>No recent activity</p>
          <p style="font-size: var(--text-xs); color: var(--portal-text-tertiary); margin-top: var(--space-sm);">
            Create or upload a resource to see activity here
          </p>
        </div>
      `;
      return;
    }

    activityList.innerHTML = recent.map((resource: any) => {
      const date = new Date(resource.generatedAt || Date.now());
      const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const action = resource.generatedBy === 'system-seed' ? 'Created' : resource.generatedBy ? 'Updated' : 'Created';
      const canBin = resource.status === 'draft' || resource.status === 'archived';
      return `
        <div
          class="activity-item${canBin ? ' activity-item--binnable' : ''}"
          data-resource-id="${escapeHtml(resource.id)}"
          data-can-bin="${canBin ? '1' : '0'}"
          title="${canBin ? 'Click to open · Double-click to move to bin' : 'Click to open'}"
          style="cursor: pointer;"
        >
          <div class="activity-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
          </div>
          <div class="activity-content">
            <p class="activity-title">${escapeHtml(resource.title || 'Untitled Resource')}</p>
            <p class="activity-meta">${action} • ${escapeHtml(resource.industry || 'N/A')} • ${escapeHtml(resource.topic || 'N/A')} • ${dateStr}</p>
          </div>
          <span class="activity-badge badge-${escapeHtml(resource.status || 'draft')}">${escapeHtml((resource.status || 'draft').charAt(0).toUpperCase() + (resource.status || 'draft').slice(1))}</span>
        </div>
      `;
    }).join('');

    bindRecentActivityInteractions(activityList);
  }

  let recentActivityClickTimer: ReturnType<typeof setTimeout> | null = null;

  function bindRecentActivityInteractions(activityList: HTMLElement): void {
    activityList.querySelectorAll<HTMLElement>('.activity-item[data-resource-id]').forEach((item) => {
      const id = item.dataset.resourceId;
      if (!id) return;

      item.addEventListener('click', (event) => {
        if ((event as MouseEvent).detail > 1) return;
        if (recentActivityClickTimer) clearTimeout(recentActivityClickTimer);
        recentActivityClickTimer = setTimeout(() => {
          recentActivityClickTimer = null;
          (window as any).navigateToPanel?.('resources');
          setTimeout(() => (window as any).selectResource?.(id), 100);
        }, 280);
      });

      item.addEventListener('dblclick', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (recentActivityClickTimer) {
          clearTimeout(recentActivityClickTimer);
          recentActivityClickTimer = null;
        }
        if (item.dataset.canBin !== '1') {
          showNotification('Only draft or archived resources can be moved to the bin.', 'warning');
          return;
        }
        void (window as any).deleteResource?.(id);
      });
    });
  }

  // Update recent resources preview - show user's own resources (not starter blocks)
  function updateRecentResourcesPreview(resources: any[]): void {
    const previewGrid = document.getElementById('recent-resources-preview');
    if (!previewGrid) return;

    // Filter out starter blocks - show only user's own resources
    const userResources = resources.filter((r: any) => !r.isStarterBlock);
    
    const recent = userResources
      .sort((a: any, b: any) => {
        const dateA = new Date(a.generatedAt || 0).getTime();
        const dateB = new Date(b.generatedAt || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 6);

    if (recent.length === 0) {
      previewGrid.innerHTML = `
        <div class="preview-loading">
          <p>No resources yet</p>
          <p style="font-size: var(--text-xs); color: var(--portal-text-tertiary); margin-top: var(--space-sm);">
            Browse starter blocks below or create a new resource
          </p>
        </div>
      `;
      return;
    }

    previewGrid.innerHTML = recent.map((resource: any) => {
      return `
        <div class="resource-preview-card" onclick="navigateToPanel('resources'); setTimeout(() => selectResource('${escapeJsString(resource.id)}'), 100);">
          <h4 class="preview-card-title">${escapeHtml(resource.title || 'Untitled')}</h4>
          <p class="preview-card-meta">${escapeHtml(resource.industry || 'N/A')} • ${escapeHtml(resource.topic || 'N/A')}</p>
          <span class="preview-card-badge badge-${escapeHtml(resource.status || 'draft')}">${escapeHtml((resource.status || 'draft').charAt(0).toUpperCase() + (resource.status || 'draft').slice(1))}</span>
        </div>
      `;
    }).join('');
  }

  function computeWorkspaceResourceStats(resources: any[]): {
    total: number;
    userTotal: number;
    published: number;
    drafts: number;
    archived: number;
    starterBlocks: number;
    avgScorePercent: string;
    avgScoreRaw: number;
  } {
    const starterBlocks = resources.filter((r: any) => r.isStarterBlock === true).length;
    const userResources = resources.filter((r: any) => !r.isStarterBlock);
    const total = resources.length;
    const userTotal = userResources.length;
    const published = userResources.filter((r: any) => r.status === 'published').length;
    const drafts = userResources.filter((r: any) => r.status === 'draft').length;
    const archived = userResources.filter((r: any) => r.status === 'archived').length;
    const scores = userResources
      .map((r: any) => r.metadata?.voiceScore)
      .filter((s: any) => s !== undefined && s !== null && !isNaN(s));
    const avgScoreRaw = scores.length > 0
      ? scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length
      : 0;
    const avgScorePercent = scores.length > 0
      ? (avgScoreRaw * 100).toFixed(1)
      : 'N/A';
    return { total, userTotal, published, drafts, archived, starterBlocks, avgScorePercent, avgScoreRaw };
  }

  function applyDashboardResourceSnapshot(resources: any[]): void {
    setWorkspaceResources(resources);

    const stats = computeWorkspaceResourceStats(resources);

    const totalEl = document.getElementById('dashboard-total-resources');
    const publishedEl = document.getElementById('dashboard-published');
    const draftsEl = document.getElementById('dashboard-drafts');
    const avgScoreEl = document.getElementById('dashboard-avg-score');

    if (totalEl) totalEl.textContent = stats.userTotal.toString();
    if (publishedEl) publishedEl.textContent = stats.published.toString();
    if (draftsEl) draftsEl.textContent = stats.drafts.toString();
    if (avgScoreEl) {
      avgScoreEl.textContent = stats.avgScorePercent === 'N/A'
        ? 'N/A'
        : `${Math.round(stats.avgScoreRaw * 100)}%`;
    }

    updateRecentActivity(resources.filter((r: any) => !r.isStarterBlock));
    updateRecentResourcesPreview(resources.filter((r: any) => !r.isStarterBlock));

    void loadStarterBlocks();
  }

  // Load starter blocks
  let starterBlocksLoading = false;

  async function fetchStarterBlocksList(): Promise<any[]> {
    const apiBase = getVoiceApiUrl();
    try {
      const blocks = await fetchStarterBlocks(apiBase);
      if (blocks.length) return blocks as any[];
      if (getWorkspaceResources().length) {
        return getWorkspaceResources().filter((r: any) => r.isStarterBlock === true);
      }
      return [];
    } catch (error) {
      if ((error as { status?: number })?.status === 401) {
        await handleWorkspaceSessionExpired();
        return [];
      }
      throw error;
    }
  }

  function renderStarterBlocksGrid(starterBlocks: any[]): void {
    const grid = document.getElementById('starter-blocks-grid');
    if (!grid) return;

    const countEl = document.getElementById('starter-blocks-count');
    if (countEl) {
      countEl.textContent =
        starterBlocks.length > 0
          ? `${starterBlocks.length} template${starterBlocks.length === 1 ? '' : 's'} in library`
          : '';
    }

    if (starterBlocks.length === 0) {
      grid.innerHTML = `
        <div class="starter-blocks-loading">
          <p>No starter blocks available</p>
          <p style="font-size: var(--text-xs); color: var(--portal-text-tertiary); margin-top: var(--space-sm);">
            Starter blocks will appear here once created
          </p>
        </div>
      `;
      return;
    }

    const displayBlocks = starterBlocks.slice(0, 12);
    grid.innerHTML = displayBlocks.map((block: any) => {
      const industryName = String(block.industry ?? 'Uncategorized')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (l: string) => l.toUpperCase());
        const descriptionSource = resourceExcerpt(block, 320);
      const blockId = escapeJsString(block.id);
      return `
        <div class="starter-block-card" onclick="createFromStarterBlock('${blockId}')">
          <div class="starter-block-header">
            <div class="starter-block-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
              </svg>
            </div>
            <div class="starter-block-content">
              <h4 class="starter-block-title">${escapeHtml(block.title || 'Untitled')}</h4>
              <div class="starter-block-meta">
                <span class="starter-block-meta-item">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  </svg>
                  ${escapeHtml(industryName)}
                </span>
                <span class="starter-block-meta-item">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                  </svg>
                  ${escapeHtml(block.topic || 'N/A')}
                </span>
              </div>
              <p class="starter-block-description">${escapeHtml(descriptionSource || 'No description available')}</p>
            </div>
          </div>
          <div class="starter-block-actions">
            <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); createFromStarterBlock('${blockId}');">
              <svg class="btn-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Use This Block
            </button>
            <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); navigateToPanel('resources'); setTimeout(() => selectResource('${blockId}'), 100);">
              <svg class="btn-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              Preview
            </button>
          </div>
        </div>
      `;
    }).join('');

    if (starterBlocks.length > 12) {
      grid.innerHTML += `
        <div class="starter-block-card" style="border-style: dashed; cursor: pointer;" onclick="navigateToPanel('resources'); const f = document.getElementById('resource-type-filter'); if (f) f.value = 'starter'; loadResources();">
          <div style="text-align: center; padding: var(--space-xl);">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity: 0.3; margin-bottom: var(--space-md);">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
            <p style="font-weight: var(--font-weight-semibold); margin-bottom: var(--space-xs);">View all starter blocks</p>
            <p style="font-size: var(--text-sm); color: var(--portal-text-tertiary);">${starterBlocks.length - 12} more available</p>
          </div>
        </div>
      `;
    }
  }

  async function loadStarterBlocks(): Promise<void> {
    const grid = document.getElementById('starter-blocks-grid');
    if (!grid) return;
    if (starterBlocksLoading) return;
    starterBlocksLoading = true;

    grid.innerHTML = '<div class="starter-blocks-loading">Loading starter blocks...</div>';

    try {
      const starterBlocks = await fetchStarterBlocksList();
      renderStarterBlocksGrid(starterBlocks);
    } catch (error) {
      console.error('[Portal] Error loading starter blocks:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      grid.innerHTML = `
        <div class="starter-blocks-loading" style="color: var(--portal-error);">
          <p>Error loading starter blocks${message ? `: ${escapeHtml(message)}` : ''}</p>
          <button class="btn btn-secondary btn-sm" onclick="loadStarterBlocks()" style="margin-top: var(--space-md);">Retry</button>
        </div>
      `;
    } finally {
      starterBlocksLoading = false;
    }
  }

  // Create resource from starter block
  async function createFromStarterBlock(starterBlockId: string): Promise<void> {
    await runWorkspaceGuardedAction(`starter:create:${starterBlockId}`, {
      onBusy: (busy) => setStarterBlockCardsBusy(starterBlockId, busy),
      run: async () => {
        showNotification('Creating resource from starter block...', 'info', 0);
        try {
          const response = await workspaceFetch(`${getVoiceApiUrl()}/resources/from-starter-block`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              starterBlockId: starterBlockId,
            }),
          });

          const data = await response.json();

          if (response.ok && data.success) {
            const score =
              typeof data.resource?.metadata?.voiceScore === 'number'
                ? Math.round(data.resource.metadata.voiceScore * 100)
                : null;
            let message = 'Resource created from starter block.';
            if (data.profileCreated) {
              message += ' Base voice profile created automatically.';
            }
            if (score != null) {
              message += ` Voice score: ${score}%.`;
            }
            showNotification(message, 'success');
            if (data.resource) {
              upsertWorkspaceResource(data.resource);
            }
            navigateToPanel('resources');
            const createdId = data.resource?.id as string | undefined;
            void loadResources(createdId ? { revealResourceId: createdId } : undefined).then(() => {
              void loadDashboardData();
              if (data.profileCreated && typeof loadProfiles === 'function') {
                setTimeout(() => loadProfiles(), 1000);
              }
            });
          } else {
            showNotification(`Failed to create resource: ${data.error || 'Unknown error'}`, 'error');
          }
        } catch (error) {
          console.error('[Portal] Error creating from starter block:', error);
          showNotification('Error creating resource from starter block', 'error');
        }
      },
    });
  }

  // Make functions globally accessible
  (window as any).loadStarterBlocks = loadStarterBlocks;
  (window as any).createFromStarterBlock = createFromStarterBlock;

  // Clear filters function
  (window as any).clearFilters = function(): void {
    const searchInput = document.getElementById('resource-search') as HTMLInputElement;
    const treeSearch = document.getElementById('tree-search') as HTMLInputElement;
    const globalSearch = document.getElementById('global-search') as HTMLInputElement;
    const statusFilter = document.getElementById('status-filter') as HTMLSelectElement;
    const typeFilter = document.getElementById('resource-type-filter') as HTMLSelectElement;
    
    if (searchInput) searchInput.value = '';
    if (treeSearch) treeSearch.value = '';
    if (globalSearch) globalSearch.value = '';
    if (statusFilter) statusFilter.value = '';
    if (typeFilter) typeFilter.value = 'user';
    
    // Reset quick filter buttons
    document.querySelectorAll('.quick-filters .btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.getElementById('filter-all')?.classList.add('active');
    
    loadResources();
  };

  // Make loadDashboardData globally accessible
  (window as any).loadDashboardData = loadDashboardData;
  (window as any).refreshOverviewPanel = () => {
    trackPortalAction('refreshOverviewPanel');
    void loadDashboardData();
    void loadOverviewClientInsights();
  };

  function filterProfileCardsByQuery(query: string): void {
    const needle = query.trim().toLowerCase();
    document.querySelectorAll<HTMLElement>('.profile-card-v1, .profile-item').forEach((item) => {
      if (!needle) {
        item.style.removeProperty('display');
        return;
      }
      const title = item.querySelector('.profile-card-v1__title, .profile-name')?.textContent?.toLowerCase() ?? '';
      item.style.display = title.includes(needle) ? '' : 'none';
    });
  }

  function applyResourceSearchQuery(query: string): void {
    const trimmed = query.trim();
    navigateToPanel('resources');
    window.setTimeout(() => {
      const resourceSearch = document.getElementById('resource-search') as HTMLInputElement | null;
      const treeSearch = document.getElementById('tree-search') as HTMLInputElement | null;
      if (resourceSearch) resourceSearch.value = trimmed;
      if (treeSearch) treeSearch.value = trimmed;
      void loadResources().then(() => {
        if (trimmed) (window as any).filterTree(trimmed);
      });
    }, 150);
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Only activate shortcuts when not typing in inputs
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    // Ctrl/Cmd + K for global search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      focusWorkspaceGlobalSearch();
    }

    // Number keys for navigation (mode-aware)
    if (e.key >= '1' && e.key <= '9' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const adminMode = document.getElementById('header-workspace-mode-admin')?.classList.contains('is-active');
      const panels = adminMode
        ? ['library-growth', 'moderation', 'site-review', 'admin-users', 'admin-ops', 'admin-billing']
        : ['dashboard', 'resources', 'profiles', 'voice-lab', 'voice-map', 'analytics'];
      const index = parseInt(e.key, 10) - 1;
      if (panels[index]) {
        navigateToPanel(panels[index]);
      }
    }

    // Escape to close modals/sidebar
    if (e.key === 'Escape') {
      // Close mobile sidebar if open
      const sidebar = document.getElementById('portal-sidebar');
      if (sidebar && sidebar.classList.contains('open') && window.innerWidth <= 1023) {
        sidebar.classList.remove('open');
        return;
      }

      // Close modals (handlers live on window after Resources chunk / local assignment)
      const win = window as Window & {
        closeViewModal?: () => void;
        closeEditModal?: () => void;
        closePreviewModal?: () => void;
        toggleInfoCard?: () => void;
      };
      const modals = document.querySelectorAll('.modal[aria-hidden="false"]');
      modals.forEach((modal: Element) => {
        const modalId = (modal as HTMLElement).id;
        if (modalId === 'view-resource-modal') {
          win.closeViewModal?.();
        } else if (modalId === 'edit-resource-modal') {
          win.closeEditModal?.();
        } else if (modalId === 'preview-resource-modal') {
          win.closePreviewModal?.();
        } else if (modalId === 'portal-confirm-host' || modal.classList.contains('portal-confirm-modal')) {
          document.getElementById('portal-confirm-host')!.innerHTML = '';
          document.body.style.overflow = '';
        }
      });

      // Close info card
      const infoCard = document.getElementById('info-card');
      if (infoCard && infoCard.classList.contains('active')) {
        win.toggleInfoCard?.();
      }
    }
  });

  // Navigation Tabs — legacy .nav-tab UI removed; sidebar uses navigateToPanel.

  let analyticsTopicRows: any[] = [];

  function formatVoiceScore(score: number | null | undefined): string {
    if (typeof score !== 'number' || Number.isNaN(score)) return '—';
    return `${Math.round(score * 100)}%`;
  }

  function formatPercent(rate: number | null | undefined): string {
    if (typeof rate !== 'number' || Number.isNaN(rate)) return '—';
    return `${Math.round(rate * 100)}%`;
  }

  function setAnalyticsText(id: string, value: string): void {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function revealAnalyticsSection(id: string, show: boolean): void {
    const el = document.getElementById(id);
    if (!el) return;
    el.hidden = !show;
    if (show) el.removeAttribute('hidden');
    else el.setAttribute('hidden', '');
  }

  function resetAnalyticsFailureState(message: string): void {
    const statusEl = document.getElementById('analytics-load-status');
    if (statusEl) {
      statusEl.hidden = false;
      statusEl.className = 'analytics-status analytics-status--error';
      statusEl.innerHTML = `<span>${escapeHtml(message)}</span>
        <button type="button" class="btn btn-secondary btn-sm" id="analytics-retry-btn">Retry</button>`;
      statusEl.querySelector('#analytics-retry-btn')?.addEventListener('click', () => {
        void loadAnalytics();
      });
    }
    revealAnalyticsSection('analytics-kpi-grid', false);
    revealAnalyticsSection('analytics-gaps-section', false);
    revealAnalyticsSection('analytics-topics-section', false);
    revealAnalyticsSection('analytics-suggestions-section', false);
    revealAnalyticsSection('analytics-index-section', false);
  }

  function renderAnalyticsGaps(gaps: any[]): void {
    const list = document.getElementById('analytics-gaps-list');
    if (!list) return;
    if (!Array.isArray(gaps) || gaps.length === 0) {
      list.innerHTML = '<p class="form-hint">No priority gaps — catalog slots look covered.</p>';
      return;
    }
    list.innerHTML = gaps
      .map((row) => {
        const tone = row.status === 'gap' ? 'gap' : row.status === 'sparse' ? 'sparse' : 'pending';
        const metaParts = [
          row.status === 'covered' ? 'covered' : row.status,
          `${row.published} published`,
          row.pending > 0 ? `${row.pending} pending` : null,
          row.drafts > 0 ? `${row.drafts} draft${row.drafts === 1 ? '' : 's'}` : null,
        ].filter(Boolean);
        return `<button type="button" class="analytics-gap-chip analytics-gap-chip--${tone}" data-industry="${escapeHtml(row.industry)}" data-topic="${escapeHtml(row.topic)}" title="Open Library growth for ${escapeHtml(row.topicName)}">
          <span class="analytics-gap-chip__name">${escapeHtml(row.industryName)} · ${escapeHtml(row.topicName)}</span>
          <span class="analytics-gap-chip__meta">${escapeHtml(metaParts.join(' · '))}</span>
        </button>`;
      })
      .join('');
    list.querySelectorAll('.analytics-gap-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!canAccessWorkspacePanel('library-growth')) {
          showNotification(
            'Library growth is admin-only. Open Resources to draft coverage for this gap.',
            'info',
          );
          navigateToPanel('resources');
          return;
        }
        navigateToPanel('library-growth');
      });
    });
  }

  function renderAnalyticsTopics(filter = 'all'): void {
    const body = document.getElementById('analytics-topics-body');
    if (!body) return;
    const rows = analyticsTopicRows.filter((row) => {
      if (filter === 'all') return true;
      if (filter === 'pending') return row.pending > 0;
      return row.status === filter;
    });
    if (rows.length === 0) {
      body.innerHTML = '<tr><td colspan="9" class="form-hint">No topics match this filter.</td></tr>';
      return;
    }
    body.innerHTML = rows
      .map((row) => {
        const voice = row.avgResourceVoiceScore ?? row.avgVoiceScore;
        return `<tr data-status="${escapeHtml(row.status)}">
          <td>${escapeHtml(row.industryName)}</td>
          <td>${escapeHtml(row.topicName)}</td>
          <td><span class="analytics-status analytics-status--${escapeHtml(row.status)}">${escapeHtml(row.status)}</span></td>
          <td>${row.published}</td>
          <td>${row.drafts}</td>
          <td>${row.pending}</td>
          <td>${row.accepted}</td>
          <td>${row.rejected}</td>
          <td>${formatVoiceScore(voice)}</td>
        </tr>`;
      })
      .join('');
  }

  function renderCorpusAnalytics(data: any): void {
    const statusEl = document.getElementById('analytics-load-status');
    if (statusEl) {
      statusEl.hidden = true;
      statusEl.className = 'analytics-status';
      statusEl.textContent = '';
    }

    const coverage = data.coverage || {};
    const corpus = data.corpus || {};
    const global = data.summary?.global || {};

    setAnalyticsText('analytics-kpi-coverage', `${coverage.coveragePercent ?? 0}%`);
    setAnalyticsText(
      'analytics-kpi-coverage-meta',
      `${coverage.covered ?? 0} covered · ${coverage.sparse ?? 0} sparse · ${coverage.totalSlots ?? 0} slots`
    );
    setAnalyticsText('analytics-kpi-gaps', String(coverage.gap ?? 0));
    setAnalyticsText('analytics-kpi-gaps-meta', `${coverage.sparse ?? 0} sparse topics`);
    setAnalyticsText('analytics-kpi-contributions', String(global.totalContributions ?? 0));
    setAnalyticsText(
      'analytics-kpi-contributions-meta',
      `${global.totalPending ?? 0} pending · ${global.totalAccepted ?? 0} accepted`
    );
    setAnalyticsText('analytics-kpi-acceptance', formatPercent(global.acceptanceRate));
    setAnalyticsText(
      'analytics-kpi-acceptance-meta',
      `${global.totalRejected ?? 0} rejected · voice ${formatVoiceScore(global.avgVoiceScore)}`
    );
    setAnalyticsText('analytics-kpi-published', String(corpus.published ?? 0));
    setAnalyticsText(
      'analytics-kpi-published-meta',
      `${corpus.drafts ?? 0} drafts · ${corpus.starters ?? 0} starters`
    );
    setAnalyticsText('analytics-kpi-voice', formatVoiceScore(corpus.avgVoiceScore));
    setAnalyticsText('analytics-kpi-voice-meta', 'Published + draft resource average');

    // Coverage meter for visual weight on the primary KPI
    const coverageMeter = document.getElementById('analytics-kpi-coverage-meter');
    if (coverageMeter) {
      const pct = Math.max(0, Math.min(100, Number(coverage.coveragePercent) || 0));
      coverageMeter.style.setProperty('--analytics-meter', `${pct}%`);
      coverageMeter.setAttribute('aria-valuenow', String(pct));
    }

    revealAnalyticsSection('analytics-kpi-grid', true);
    revealAnalyticsSection('analytics-gaps-section', true);
    revealAnalyticsSection('analytics-topics-section', true);

    analyticsTopicRows = Array.isArray(data.topics) ? data.topics : [];
    renderAnalyticsGaps(Array.isArray(data.gaps) ? data.gaps : []);
    const filterEl = document.getElementById('analytics-topic-filter') as HTMLSelectElement | null;
    renderAnalyticsTopics(filterEl?.value || 'all');

    const isAdmin = workspaceUser?.role === 'admin' || workspaceUser?.role === 'super-admin';
    const indexSection = document.getElementById('analytics-index-section');
    const indexBody = document.getElementById('analytics-index-body');
    if (isAdmin && indexSection && indexBody) {
      revealAnalyticsSection('analytics-index-section', true);
      const index = data.index || {};
      const models = index.embeddingModels && typeof index.embeddingModels === 'object'
        ? Object.entries(index.embeddingModels)
            .map(([model, count]) => `${model}: ${count}`)
            .join(', ')
        : '—';
      const publishCoverage =
        typeof index.publishCoveragePercent === 'number'
          ? `${index.publishCoveragePercent}% of published guides indexed`
          : 'No published guides to compare';
      indexBody.innerHTML = `<dl class="analytics-index-dl">
        <div><dt>Semantic chunks</dt><dd>${index.chunkCount ?? 0}</dd></div>
        <div><dt>Indexed resources</dt><dd>${index.indexedResources ?? 0}</dd></div>
        <div><dt>Publish → index</dt><dd>${escapeHtml(publishCoverage)}</dd></div>
        <div><dt>Embedding models</dt><dd>${escapeHtml(models)}</dd></div>
      </dl>`;
    } else if (indexSection) {
      revealAnalyticsSection('analytics-index-section', false);
    }
  }

  async function loadAnalytics(): Promise<void> {
    const statusEl = document.getElementById('analytics-load-status');
    if (statusEl) {
      statusEl.hidden = false;
      statusEl.className = 'analytics-status';
      statusEl.textContent = 'Loading corpus analytics…';
    }
    revealAnalyticsSection('analytics-kpi-grid', false);
    revealAnalyticsSection('analytics-gaps-section', false);
    revealAnalyticsSection('analytics-topics-section', false);
    try {
      console.log('[Portal] Loading corpus analytics...');
      const res = await workspaceFetch(`${getVoiceApiUrl()}/analytics/corpus`);
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const detail =
          typeof errBody?.error === 'string' && errBody.error
            ? errBody.error
            : res.status === 401 || res.status === 403
              ? 'Corpus analytics requires an editor or admin session.'
              : `Unable to load corpus analytics (${res.status}).`;
        resetAnalyticsFailureState(detail);
        return;
      }
      const data = await res.json();
      if (!data.success) {
        resetAnalyticsFailureState(data.error || 'Unable to load corpus analytics.');
        return;
      }
      renderCorpusAnalytics(data);
      loadAnalyticsSuggestions();
    } catch (error) {
      console.error('[Portal] Error loading analytics:', error);
      resetAnalyticsFailureState(
        `Could not load corpus analytics: ${workspaceErrorMessage(error, 'Unknown error')}`,
      );
    }
  }

  async function loadAnalyticsSuggestions(): Promise<void> {
    const section = document.getElementById('analytics-suggestions-section');
    const configEl = document.getElementById('analytics-config-display');
    const listEl = document.getElementById('analytics-suggestions-list');
    if (!configEl || !listEl) return;

    const isAdmin = workspaceUser?.role === 'admin' || workspaceUser?.role === 'super-admin';
    if (!isAdmin) {
      if (section) revealAnalyticsSection('analytics-suggestions-section', false);
      return;
    }
    if (section) revealAnalyticsSection('analytics-suggestions-section', true);

    try {
      const res = await workspaceFetch(`${getVoiceApiUrl()}/analytics/suggestions`);
      if (!res.ok) {
        configEl.innerHTML = '<p class="form-hint">Unable to load pipeline suggestions.</p>';
        listEl.innerHTML = '';
        return;
      }
      const data = await res.json();
      if (!data.success) {
        configEl.innerHTML = '';
        listEl.innerHTML = '';
        return;
      }
      const cfg = data.config || {};
      configEl.innerHTML = `<p><strong>Current pipeline:</strong> autoPublishThreshold = ${cfg.autoPublishThreshold ?? '—'}, tokenMultiplier = ${cfg.tokenMultiplier ?? '—'}</p>`;
      const suggestions = Array.isArray(data.suggestions) ? data.suggestions : [];
      if (suggestions.length === 0) {
        listEl.innerHTML = '<p class="form-hint">No suggestions right now — contribution quality looks aligned with the threshold.</p>';
        return;
      }
      listEl.innerHTML = suggestions.map((s: any) => {
        const applyBtn = s.recommendedChange
          ? `<button type="button" class="btn btn-secondary btn-sm apply-suggestion-btn" data-key="${escapeHtml(s.recommendedChange.configKey)}" data-value="${s.recommendedChange.newValue}">Apply</button>`
          : '';
        return `<div class="suggestion-card"><p>${escapeHtml(s.message || '')}</p>${applyBtn}</div>`;
      }).join('');
      listEl.querySelectorAll('.apply-suggestion-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const key = (btn as HTMLElement).getAttribute('data-key');
          const value = parseFloat((btn as HTMLElement).getAttribute('data-value') || '0');
          if (!key) return;
          await runWorkspaceGuardedAction(`analytics:apply:${key}`, {
            onBusy: (busy) => setElementBusy(btn as HTMLButtonElement, busy, busy ? 'Applying…' : 'Apply'),
            run: async () => {
              try {
                const patchRes = await workspaceFetch(`${getVoiceApiUrl()}/admin/pipeline-config`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ [key]: value }),
                });
                const data = await patchRes.json().catch(() => ({}));
                if (!patchRes.ok || data.success === false) {
                  showNotification(
                    data.error || `Could not apply suggestion (${patchRes.status}).`,
                    'error',
                  );
                  return;
                }
                showNotification(`Applied pipeline setting: ${key}.`, 'success');
                loadAnalyticsSuggestions();
              } catch (e) {
                console.error(e);
                showNotification(workspaceErrorMessage(e, 'Could not apply suggestion.'), 'error');
              }
            },
          });
        });
      });
    } catch (e) {
      const detail = workspaceErrorMessage(e, 'Could not load suggestions.');
      configEl.innerHTML = `<p class="form-hint">${escapeHtml(detail)}</p>`;
      listEl.innerHTML = '';
    }
  }

  /** Kept for resource-panel deps; Insights loads from `/analytics/corpus` only. */
  function updateAnalyticsDisplay(_resources: any[]): void {
    // Intentionally empty — Overview owns personal resource stats.
  }

  document.getElementById('analytics-topic-filter')?.addEventListener('change', (event) => {
    const value = (event.target as HTMLSelectElement).value || 'all';
    renderAnalyticsTopics(value);
  });

  (window as any).loadAnalytics = loadAnalytics;


  // Toggle Information Card
  (window as any).toggleInfoCard = function() {
    const card = document.getElementById('info-card') as HTMLElement | null;
    if (!card) return;
    
    const isActive = card.classList.contains('active');
    
    if (isActive) {
      // Close card
      card.classList.remove('active');
      card.classList.remove('railed');
      card.setAttribute('aria-hidden', 'true');
      card.style.pointerEvents = 'none';
      // Ensure body is scrollable
      document.body.style.overflow = '';
    } else {
      // Open card
      card.classList.add('active');
      card.setAttribute('aria-hidden', 'false');
      card.style.pointerEvents = 'all';
      
      // Add "railed" state after animation completes (when card reaches center)
      setTimeout(() => {
        if (card.classList.contains('active')) {
          card.classList.add('railed');
        }
      }, 800); // Match transition duration
    }
  };

  // Export Resources
  (window as any).exportResources = async () => {
    try {
      // Get all resources, not just filtered ones
      const response = await workspaceFetch(`${getVoiceApiUrl()}/resources`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch resources for export');
      }
      
      const data = await response.json();
      const resources = data.resources || getWorkspaceResources();
      
      if (resources.length === 0) {
        showNotification('No resources to export.', 'info');
        return;
      }
      
      const exportData = {
        exportedAt: new Date().toISOString(),
        exportedBy: sessionActive ? 'admin' : 'unknown',
        totalResources: resources.length,
        resources: resources
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `resources-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showNotification(`Exported ${resources.length} resource(s) successfully.`, 'success');
    } catch (error) {
      showNotification('Error exporting resources: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
      console.error('[Portal] Export error:', error);
    }
  };

  // Bulk Improve Resources
  (window as any).bulkImproveResources = async () => {
    const drafts = getWorkspaceResources().filter((r: any) => r.status === 'draft');
    if (drafts.length === 0) {
      showNotification('No draft resources to improve.', 'info');
      return;
    }

    await runWorkspaceGuardedAction('bulk:improve', {
      confirm: () =>
        showConfirmDialog({
          title: 'Improve draft resources',
          message: `Improve ${drafts.length} draft resource(s) using voice profile + RAG + inference?`,
          details: 'This may take a while. Only drafts in your library are included.',
          confirmLabel: 'Improve all',
          variant: 'primary',
        }),
      run: async () => {
        showNotification(`Improving ${drafts.length} resources...`, 'info', 0);

        let successCount = 0;
        let keptOriginalCount = 0;
        let failCount = 0;
        const errors: string[] = [];

        try {
          const batchSize = 5;
          for (let i = 0; i < drafts.length; i += batchSize) {
            const batch = drafts.slice(i, i + batchSize);
            const results = await Promise.allSettled(
              batch.map(async (resource) => {
                const r = await workspaceFetch(`${getVoiceApiUrl()}/resources/${resource.id}/improve`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({}),
                });
                const data = await r.json().catch(() => ({}));
                return { ok: r.ok, data };
              }),
            );

            results.forEach((result, idx) => {
              if (result.status === 'fulfilled' && result.value.ok && result.value.data?.success) {
                const mode = result.value.data?.inference?.mode;
                if (mode === 'original') {
                  keptOriginalCount++;
                } else {
                  successCount++;
                }
              } else {
                failCount++;
                const resource = batch[idx];
                const err =
                  result.status === 'rejected'
                    ? result.reason
                    : result.value.data?.error || `HTTP ${result.value.ok ? 'ok' : 'error'}`;
                errors.push(`${resource.title || resource.id}: ${err}`);
              }
            });

            if (i + batchSize < drafts.length) {
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
          }

          const parts: string[] = [];
          if (successCount > 0) parts.push(`rewrote ${successCount}`);
          if (keptOriginalCount > 0) parts.push(`kept ${keptOriginalCount} original (fidelity guard)`);
          if (failCount > 0) parts.push(`${failCount} failed`);
          const message =
            parts.length > 0
              ? `Bulk improve: ${parts.join('; ')}.`
              : 'Bulk improve finished with no changes.';

          const toastType =
            failCount > 0 ? 'warning' : keptOriginalCount > 0 && successCount === 0 ? 'info' : 'success';
          showNotification(message, toastType);
          if (failCount > 0) console.error('[Portal] Bulk improve errors:', errors);
          setTimeout(() => loadResources(), 1000);
        } catch (error) {
          showNotification('Error during bulk improve operation.', 'error');
          console.error('[Portal] Bulk improve error:', error);
        }
      },
    });
  };

  // Reset stuck overlays when this module boots (dashboard loads after DOMContentLoaded).
  function resetStuckOverlays(): void {
    document.body.style.overflow = '';
    document.body.style.pointerEvents = '';
    document.body.classList.remove('portal-mobile-nav-open');

    document.querySelectorAll('.modal').forEach((modal: Element) => {
      const htmlModal = modal as HTMLElement;
      htmlModal.setAttribute('aria-hidden', 'true');
      htmlModal.style.display = 'none';
      htmlModal.classList.remove('active');
    });

    document.querySelectorAll('.modal-overlay').forEach((overlay: Element) => {
      const htmlOverlay = overlay as HTMLElement;
      htmlOverlay.style.pointerEvents = 'none';
      htmlOverlay.style.display = 'none';
    });

    const infoCard = document.getElementById('info-card');
    if (infoCard) {
      infoCard.classList.remove('active', 'railed');
      infoCard.setAttribute('aria-hidden', 'true');
      (infoCard as HTMLElement).style.pointerEvents = 'none';
    }

    for (const id of ['main-content', 'admin-portal', 'login-screen', 'admin-dashboard']) {
      const el = document.getElementById(id);
      if (el) (el as HTMLElement).style.pointerEvents = '';
    }
  }

  function initWorkspaceShellAfterDomReady(): void {
    resetStuckOverlays();
    const filterAll = document.getElementById('filter-all');
    if (filterAll) filterAll.classList.add('active');
    voiceContext.initWorkspaceVoiceProfileSelect();

    const dashboard = document.getElementById('admin-dashboard');
    if (dashboard && dashboard.style.display !== 'none') {
      syncWorkspaceSidebarLayout();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWorkspaceShellAfterDomReady);
  } else {
    initWorkspaceShellAfterDomReady();
  }

  window.addEventListener('resize', () => {
    const dashboard = document.getElementById('admin-dashboard');
    if (dashboard && dashboard.style.display !== 'none') {
      syncWorkspaceSidebarLayout();
    }
  });



  function validateResourceForm(formId: string): boolean {
    const form = document.getElementById(formId) as HTMLFormElement;
    if (!form) return false;

    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;
    const firstInvalid: HTMLElement | null = null;

    requiredFields.forEach((field: Element) => {
      const input = field as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      if (!input.value.trim()) {
        isValid = false;
        input.classList.add('error');
        if (!firstInvalid) {
          (input as HTMLElement).focus();
        }
      } else {
        input.classList.remove('error');
      }
    });

    if (!isValid) {
      showNotification('Please fill in all required fields.', 'warning');
    }

    return isValid;
  }

  // Add error styling for invalid fields
  const style = document.createElement('style');
  style.textContent = `
    input.error,
    select.error,
    textarea.error {
      border-color: var(--error-color, #dc3545) !important;
      box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.1) !important;
    }
  `;
  document.head.appendChild(style);

  // Enhanced form validation for generate
  document.getElementById('generate-resource-form')?.addEventListener('submit', (e) => {
    const industry = (document.getElementById('resource-industry') as HTMLSelectElement)?.value;
    const topic = (document.getElementById('resource-topic') as HTMLInputElement)?.value;
    
    if (!industry || !topic?.trim()) {
      e.preventDefault();
      showNotification('Please select an industry and enter a topic.', 'warning');
      return false;
    }
  });


  publishPortalBridge({
    showDashboard,
    showLogin,
    showAuthBanner,
    navigateToPanel: (panel: string) => (window as any).navigateToPanel(panel),
    selectResource: (resourceId: string) => (window as any).selectResource?.(resourceId),
  });

  syncPortalAccountContext();

}

