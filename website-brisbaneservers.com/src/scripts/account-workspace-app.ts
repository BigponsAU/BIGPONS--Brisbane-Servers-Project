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
import { initWorkspaceModeSwitcher } from './account-workspace-mode';
import { trackPortalPanel } from './portal-markov-tracker';
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
import { getWorkspaceResources, setWorkspaceResources } from './account-workspace-resource-store';
import { escapeHtml, escapeJsString, treeGroupLabel, treeSlug, resourceExcerpt, showWorkspaceNotification } from './account-workspace-utils';
import { hasWorkspaceCapability } from '../lib/workspace-roles';
import { showConfirmDialog } from './portal-confirm-dialog';

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

  function syncWorkspaceSidebarLayout(): void {
    const sidebar = document.getElementById('portal-sidebar');
    if (!sidebar) return;
    sidebar.style.removeProperty('transform');
    sidebar.style.removeProperty('display');
    sidebar.style.removeProperty('position');
    if (window.innerWidth >= 1024) {
      sidebar.classList.add('open');
    } else {
      sidebar.classList.remove('open');
    }
  }

  let extensionsBooted = false;
  let extensionsBootPromise: Promise<void> | null = null;

  function ensureWorkspaceExtensions(): Promise<void> {
    if (extensionsBooted && extensionsBootPromise) return extensionsBootPromise;
    if (!extensionsBootPromise) {
      extensionsBootPromise = import('./account-workspace-boot.ts').then((mod) => {
        mod.bootAccountWorkspaceExtensions();
        extensionsBooted = true;
      });
    }
    return extensionsBootPromise;
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
    const dashboardEl = document.getElementById('admin-dashboard');
    if (dashboardEl) {
      dashboardEl.style.display = 'block';
    }
    document.body.classList.add('account-workspace-dashboard-active');

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

    syncPortalAccountContext();

    applyRoleAccess(user);

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

      // Set up search and filter event listeners
      setupResourceFilters();
      syncPortalAccountContext();
      const accountCtx = getPortalAccountContext();
      window.__portalAccountExt?.loadClientWorkspaceData(accountCtx);
      window.__portalAccountExt?.loadPasskeyCredentials(accountCtx);
    });
  }

  getPortalRuntime().showDashboardImpl = showDashboard;

  function applyRoleAccess(user: { id?: string; role?: string; emailVerified?: boolean; workspaceEnabled?: boolean }): void {
    document.querySelectorAll<HTMLElement>('[data-min-role]').forEach((el) => {
      const minRole = el.dataset.minRole as 'client' | 'viewer' | 'editor' | 'admin';
      const allowed = hasWorkspaceCapability(user, minRole);
      if (allowed) {
        el.style.removeProperty('display');
        el.removeAttribute('hidden');
        el.setAttribute('aria-hidden', 'false');
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
        el.removeAttribute('hidden');
        el.setAttribute('aria-hidden', 'false');
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
    const accountCtx = getPortalAccountContext();
    if (panelName === 'dashboard') {
      loadDashboardData();
    } else if (panelName === 'resources') {
      const workspace = document.getElementById('resource-workspace');
      const listView = document.getElementById('resources-list-view');
      if (workspace && listView) {
        workspace.classList.remove('hidden');
        listView.classList.add('hidden');
      }
      loadResources();
      void voiceContext.ensureWorkspaceVoiceProfiles();
    } else if (panelName === 'profiles') {
      setTimeout(() => {
        loadProfiles();
      }, 100);
    } else if (panelName === 'analytics') {
      if (getWorkspaceResources().length > 0) {
        updateAnalyticsDisplay(getWorkspaceResources());
        loadAnalyticsSuggestions();
      } else {
        loadAnalytics();
      }
    } else if (panelName === 'voice-map' || panelName === 'voice-lab') {
      void import('./account-workspace-voice-features.ts').then((mod) => mod.onVoicePanelShown(panelName));
    } else if (panelName === 'library-growth') {
      window.__portalAccountExt?.loadLibraryGrowthPanel(accountCtx);
    } else if (panelName === 'moderation') {
      window.__portalAccountExt?.loadModerationQueue(accountCtx);
    } else if (panelName === 'site-review') {
      window.__portalAccountExt?.loadSiteReviewSections(accountCtx);
      window.__portalAccountExt?.loadHostingStatus(accountCtx);
    } else if (panelName === 'admin-users') {
      void import('./account-admin-users.ts').then((mod) => mod.loadAdminUsersPanel(getVoiceApiUrl()));
    } else if (panelName === 'admin-ops') {
      window.__portalAccountExt?.loadAdminOpsPanel(accountCtx);
    }
  }

  (window as any).navigateToPanel = function(panelName: string): void {
    if (import.meta.env.MODE === 'development') {
      console.log('[Portal] Navigating to panel:', panelName);
    }

    const targetPanel = document.getElementById(`${panelName}-panel`) as HTMLElement | null;
    if (targetPanel?.classList.contains('active')) {
      refreshPanelData(panelName);
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
      const minRole = panel.dataset.minRole as 'client' | 'viewer' | 'editor' | 'admin' | undefined;
      if (minRole && workspaceUser && !hasWorkspaceCapability(workspaceUser, minRole)) {
        if (import.meta.env.MODE === 'development') {
          console.warn('[Portal] Access denied for panel:', panelName);
        }
        navigateToPanel('dashboard');
        return;
      }
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

    // Close mobile sidebar if open
    const sidebar = document.getElementById('portal-sidebar');
    if (sidebar && window.innerWidth <= 1023) {
      sidebar.classList.remove('open');
    }

    // Ensure sidebar is visible on desktop
    if (sidebar && window.innerWidth >= 1024) {
      sidebar.style.transform = 'translateX(0)';
      sidebar.style.display = 'flex';
    }

    refreshPanelData(panelName);

    trackPortalPanel(panelName);
    if (panelName === 'voice-lab') {
      void import('./portal-markov-tracker').then((mod) => mod.renderPortalMarkovIntoVoiceLab());
    }
  };

  // Sidebar toggle
  document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
    const sidebar = document.getElementById('portal-sidebar');
    if (sidebar) {
      sidebar.classList.toggle('open');
    }
  });

  // Mobile menu toggle
  document.getElementById('mobile-menu-toggle')?.addEventListener('click', () => {
    const sidebar = document.getElementById('portal-sidebar');
    if (sidebar) {
      sidebar.classList.toggle('open');
    }
  });

  // Close sidebar when clicking overlay (mobile)
  document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('portal-sidebar');
    const mobileToggle = document.getElementById('mobile-menu-toggle');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    
    if (sidebar && sidebar.classList.contains('open') && window.innerWidth <= 1023) {
      const target = e.target as HTMLElement;
      if (!sidebar.contains(target) && 
          target !== mobileToggle && 
          !mobileToggle?.contains(target) &&
          target !== sidebarToggle &&
          !sidebarToggle?.contains(target)) {
        sidebar.classList.remove('open');
      }
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
      return `
        <div class="activity-item" onclick="navigateToPanel('resources'); setTimeout(() => selectResource('${escapeHtml(resource.id)}'), 100);" style="cursor: pointer;">
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
        <div class="resource-preview-card" onclick="navigateToPanel('resources'); setTimeout(() => selectResource('${escapeHtml(resource.id)}'), 100);">
          <h4 class="preview-card-title">${escapeHtml(resource.title || 'Untitled')}</h4>
          <p class="preview-card-meta">${escapeHtml(resource.industry || 'N/A')} • ${escapeHtml(resource.topic || 'N/A')}</p>
          <span class="preview-card-badge badge-${escapeHtml(resource.status || 'draft')}">${escapeHtml((resource.status || 'draft').charAt(0).toUpperCase() + (resource.status || 'draft').slice(1))}</span>
        </div>
      `;
    }).join('');
  }

  function computeWorkspaceResourceStats(resources: any[]): {
    total: number;
    published: number;
    drafts: number;
    archived: number;
    starterBlocks: number;
    avgScorePercent: string;
    avgScoreRaw: number;
  } {
    const total = resources.length;
    const published = resources.filter((r: any) => r.status === 'published').length;
    const drafts = resources.filter((r: any) => r.status === 'draft').length;
    const archived = resources.filter((r: any) => r.status === 'archived').length;
    const starterBlocks = resources.filter((r: any) => r.isStarterBlock === true).length;
    const scores = resources
      .map((r: any) => r.metadata?.voiceScore)
      .filter((s: any) => s !== undefined && s !== null && !isNaN(s));
    const avgScoreRaw = scores.length > 0
      ? scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length
      : 0;
    const avgScorePercent = scores.length > 0
      ? (avgScoreRaw * 100).toFixed(1)
      : 'N/A';
    return { total, published, drafts, archived, starterBlocks, avgScorePercent, avgScoreRaw };
  }

  function applyDashboardResourceSnapshot(resources: any[]): void {
    setWorkspaceResources(resources);

    const starterBlocks = resources.filter((r: any) => r.isStarterBlock === true);
    const stats = computeWorkspaceResourceStats(resources);

    const totalEl = document.getElementById('dashboard-total-resources');
    const publishedEl = document.getElementById('dashboard-published');
    const draftsEl = document.getElementById('dashboard-drafts');
    const avgScoreEl = document.getElementById('dashboard-avg-score');

    if (totalEl) totalEl.textContent = stats.total.toString();
    if (publishedEl) publishedEl.textContent = stats.published.toString();
    if (draftsEl) draftsEl.textContent = stats.drafts.toString();
    if (avgScoreEl) {
      avgScoreEl.textContent = stats.avgScorePercent === 'N/A'
        ? 'N/A'
        : `${Math.round(stats.avgScoreRaw * 100)}%`;
    }

    updateAnalyticsDisplay(resources);
    updateRecentActivity(resources.filter((r: any) => !r.isStarterBlock));
    updateRecentResourcesPreview(resources.filter((r: any) => !r.isStarterBlock));

    const dashboardPanel = document.getElementById('dashboard-panel');
    if (dashboardPanel?.classList.contains('active')) {
      renderStarterBlocksGrid(starterBlocks);
    }
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
        const descriptionSource = resourceExcerpt(block);
      const blockId = escapeHtml(block.id);
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
        <div class="starter-block-card" style="border-style: dashed; cursor: pointer;" onclick="navigateToPanel('resources'); document.getElementById('resource-search').value = 'starter block'; loadResources();">
          <div style="text-align: center; padding: var(--space-xl);">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity: 0.3; margin-bottom: var(--space-md);">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
            <p style="font-weight: var(--font-weight-semibold); margin-bottom: var(--space-xs);">View All Starter Blocks</p>
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
    showNotification('Creating resource from starter block...', 'info', 0);
    try {
      const response = await workspaceFetch(`${getVoiceApiUrl()}/resources/from-starter-block`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          starterBlockId: starterBlockId
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        let message = 'Resource created from starter block!';
        if (data.profileCreated) {
          message += ' Base voice profile created automatically.';
        }
        showNotification(message, 'success');
        // Navigate to resources and select the new resource
        navigateToPanel('resources');
        setTimeout(() => {
          if (data.resource?.id) {
            selectResource(data.resource.id);
          }
          loadResources();
          loadDashboardData();
          // Refresh profiles if profile was created
          if (data.profileCreated && typeof loadProfiles === 'function') {
            setTimeout(() => loadProfiles(), 1000);
          }
        }, 100);
      } else {
        showNotification(`Failed to create resource: ${data.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('[Portal] Error creating from starter block:', error);
      showNotification('Error creating resource from starter block', 'error');
    }
  }

  // Make functions globally accessible
  (window as any).loadStarterBlocks = loadStarterBlocks;
  (window as any).createFromStarterBlock = createFromStarterBlock;

  // Clear filters function
  (window as any).clearFilters = function(): void {
    const searchInput = document.getElementById('resource-search') as HTMLInputElement;
    const statusFilter = document.getElementById('status-filter') as HTMLSelectElement;
    const typeFilter = document.getElementById('resource-type-filter') as HTMLSelectElement;
    
    if (searchInput) searchInput.value = '';
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

  // Global search — resources default; prefix routes for profiles, voice lab, and panels
  const GLOBAL_SEARCH_PANEL_ALIASES: Record<string, string> = {
    overview: 'dashboard',
    dashboard: 'dashboard',
    home: 'dashboard',
    resources: 'resources',
    profiles: 'profiles',
    analytics: 'analytics',
    'voice lab': 'voice-lab',
    'voice-lab': 'voice-lab',
    voicelab: 'voice-lab',
    'voice map': 'voice-map',
    'voice-map': 'voice-map',
    voicemap: 'voice-map',
    growth: 'library-growth',
    'library growth': 'library-growth',
    'library-growth': 'library-growth',
    moderation: 'moderation',
    'site review': 'site-review',
    'site-review': 'site-review',
    users: 'admin-users',
    'admin-users': 'admin-users',
    ops: 'admin-ops',
    'admin-ops': 'admin-ops',
    billing: 'admin-ops',
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

  function applyGlobalSearchQuery(rawQuery: string): void {
    const query = rawQuery.trim();
    if (!query) return;

    const lower = query.toLowerCase();
    if (lower.startsWith('profile:')) {
      const profileQuery = query.slice(8).trim();
      navigateToPanel('profiles');
      window.setTimeout(() => filterProfileCardsByQuery(profileQuery), 150);
      return;
    }

    if (lower.startsWith('voice:')) {
      const voiceText = query.slice(6).trim();
      navigateToPanel('voice-lab');
      window.setTimeout(() => {
        const textarea = document.getElementById('voice-lab-text') as HTMLTextAreaElement | null;
        if (textarea && voiceText) textarea.value = voiceText;
      }, 150);
      return;
    }

    const panelTarget = GLOBAL_SEARCH_PANEL_ALIASES[lower];
    if (panelTarget) {
      navigateToPanel(panelTarget);
      return;
    }

    navigateToPanel('resources');
    const resourceSearch = document.getElementById('resource-search') as HTMLInputElement | null;
    if (resourceSearch) {
      resourceSearch.value = query;
      loadResources();
    }
  }

  const globalSearchInput = document.getElementById('global-search') as HTMLInputElement;
  if (globalSearchInput) {
    let searchTimeout: ReturnType<typeof setTimeout> | null = null;

    globalSearchInput.addEventListener('input', () => {
      const query = globalSearchInput.value.trim();

      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }

      searchTimeout = setTimeout(() => {
        if (query) {
          applyGlobalSearchQuery(query);
        }
      }, 300);
    });

    globalSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const query = globalSearchInput.value.trim();
        if (query) {
          applyGlobalSearchQuery(query);
        }
      }
    });
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
      const globalSearch = document.getElementById('global-search') as HTMLInputElement;
      if (globalSearch) {
        globalSearch.focus();
        globalSearch.select();
      }
    }

    // Number keys for navigation (1-4)
    if (e.key >= '1' && e.key <= '4' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const panels = ['dashboard', 'resources', 'profiles', 'analytics'];
      const index = parseInt(e.key) - 1;
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

      // Close modals
      const modals = document.querySelectorAll('.modal[aria-hidden="false"]');
      modals.forEach((modal: Element) => {
        const modalId = (modal as HTMLElement).id;
        if (modalId === 'view-resource-modal') {
          closeViewModal();
        } else if (modalId === 'edit-resource-modal') {
          closeEditModal();
        }
      });

      // Close info card
      const infoCard = document.getElementById('info-card');
      if (infoCard && infoCard.classList.contains('active')) {
        toggleInfoCard();
      }
    }
  });

  // Navigation Tabs
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;
      
      // Update tab states
      document.querySelectorAll('.nav-tab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      
      // Update panel visibility
      document.querySelectorAll('.portal-panel').forEach(p => {
        p.classList.remove('active');
        p.style.display = 'none';
      });
      
      const targetPanel = document.getElementById(`${targetTab}-panel`);
      if (targetPanel) {
        targetPanel.classList.add('active');
        targetPanel.style.display = 'block';
        
        // Load content when panel is shown
        if (targetTab === 'profiles') {
          console.log('[Portal] Loading profiles panel');
          loadProfiles();
        } else if (targetTab === 'analytics') {
          console.log('[Portal] Loading analytics panel');
          loadAnalytics();
        }
      }
    });
  });

  // Build / refresh BIGPONS profile from on-repo resources (optional industry slice)
  // Load Analytics (synced with dashboard)
  async function loadAnalytics(): Promise<void> {
    try {
      console.log('[Portal] Loading analytics...');
      
      // Use current resources if available (synced with dashboard), otherwise fetch
      let resources = getWorkspaceResources();
      
      if (resources.length === 0) {
        // Reload resources to ensure we have the latest data
        const statusFilter = (document.getElementById('status-filter') as HTMLSelectElement)?.value;
        const result = await fetchAuthenticatedResources(getVoiceApiUrl(), {
          status: statusFilter || undefined,
        });

        if (!result.ok) {
          console.error('[Portal] Failed to load resources for analytics:', result.status);
          updateAnalyticsDisplay([]);
          return;
        }

        resources = result.resources as any[];
        setWorkspaceResources(resources);
      }
      
      updateAnalyticsDisplay(resources);
      loadAnalyticsSuggestions();
      loadAdminMeta();
    } catch (error) {
      console.error('[Portal] Error loading analytics:', error);
      // Fallback to current resources if available
      const resources = getWorkspaceResources();
      updateAnalyticsDisplay(resources);
    }
  }

  async function loadAnalyticsSuggestions(): Promise<void> {
    const configEl = document.getElementById('analytics-config-display');
    const listEl = document.getElementById('analytics-suggestions-list');
    if (!configEl || !listEl) return;
    try {
      const res = await workspaceFetch(`${getVoiceApiUrl()}/analytics/suggestions`, {
      });
      if (!res.ok) { configEl.innerHTML = '<p>Unable to load suggestions (admin only).</p>'; listEl.innerHTML = ''; return; }
      const data = await res.json();
      if (!data.success) { configEl.innerHTML = ''; listEl.innerHTML = ''; return; }
      const cfg = data.config || {};
      configEl.innerHTML = `<p><strong>Current pipeline:</strong> autoPublishThreshold = ${cfg.autoPublishThreshold ?? '—'}, tokenMultiplier = ${cfg.tokenMultiplier ?? '—'}</p>`;
      const suggestions = Array.isArray(data.suggestions) ? data.suggestions : [];
      if (suggestions.length === 0) {
        listEl.innerHTML = '<p>No suggestions right now. Keep contributing to get data-driven recommendations.</p>';
        return;
      }
      listEl.innerHTML = suggestions.map((s: any) => {
        const applyBtn = s.recommendedChange ? `<button class="btn btn-secondary btn-sm apply-suggestion-btn" data-key="${s.recommendedChange.configKey}" data-value="${s.recommendedChange.newValue}">Apply</button>` : '';
        return `<div class="suggestion-card"><p>${s.message || ''}</p>${applyBtn}</div>`;
      }).join('');
      listEl.querySelectorAll('.apply-suggestion-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const key = (btn as HTMLElement).getAttribute('data-key');
          const value = parseFloat((btn as HTMLElement).getAttribute('data-value') || '0');
          if (!key) return;
          try {
            const patchRes = await workspaceFetch(`${getVoiceApiUrl()}/admin/pipeline-config`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ [key]: value })
            });
            if (patchRes.ok) loadAnalyticsSuggestions();
          } catch (e) { console.error(e); }
        });
      });
    } catch (e) {
      configEl.innerHTML = '<p>Could not load suggestions.</p>';
      listEl.innerHTML = '';
    }
  }

  async function loadAdminMeta(): Promise<void> {
    const container = document.getElementById('analytics-users-vectors');
    if (!container) return;
    container.innerHTML = '<p style="color: var(--text-secondary); font-size: var(--text-sm);">Loading users and vector summary…</p>';
    try {
      const [usersRes, vectorsRes] = await Promise.all([
        workspaceFetch(`${getVoiceApiUrl()}/admin/users`),
        workspaceFetch(`${getVoiceApiUrl()}/admin/vectors-summary`)
      ]);
      const usersData = usersRes.ok ? await usersRes.json() : null;
      const vectorsData = vectorsRes.ok ? await vectorsRes.json() : null;
      const userCount = usersData?.count ?? '—';
      const semantic = vectorsData?.semanticIndex;
      const chunkCount = semantic?.chunkCount ?? vectorsData?.total ?? '—';
      const resourceIds = semantic?.resourceIds ?? vectorsData?.byKind?.resource ?? '—';
      const legacyTotal = vectorsData?.legacyVectors?.total ?? 0;
      const legacyNote =
        typeof legacyTotal === 'number' && legacyTotal > 0
          ? ` &nbsp;|&nbsp; legacy score vectors: ${legacyTotal}`
          : '';
      container.innerHTML = `<p><strong>Registered users:</strong> ${userCount} &nbsp;|&nbsp; <strong>Semantic chunks:</strong> ${chunkCount} &nbsp;|&nbsp; <strong>Indexed resources:</strong> ${resourceIds}${legacyNote}</p>`;
    } catch {
      container.innerHTML = '<p>Could not load users/vectors summary.</p>';
    }
  }

  // Update analytics display
  function updateAnalyticsDisplay(resources: any[]): void {
    try {
      const stats = computeWorkspaceResourceStats(resources);

      const totalEl = document.getElementById('stat-total-resources');
      const publishedEl = document.getElementById('stat-published');
      const draftsEl = document.getElementById('stat-drafts');
      const avgScoreEl = document.getElementById('stat-avg-score');

      if (totalEl) {
        totalEl.textContent = stats.total.toString();
        totalEl.parentElement?.setAttribute(
          'title',
          `Total: ${stats.total} resources (${stats.starterBlocks} starter blocks)`
        );
        if (stats.total > 9999) {
          totalEl.textContent = (stats.total / 1000).toFixed(1) + 'k';
        }
      }
      if (publishedEl) {
        publishedEl.textContent = stats.published.toString();
        publishedEl.parentElement?.setAttribute('title', `${stats.published} published resources`);
        if (stats.published > 9999) {
          publishedEl.textContent = (stats.published / 1000).toFixed(1) + 'k';
        }
      }
      if (draftsEl) {
        draftsEl.textContent = stats.drafts.toString();
        draftsEl.parentElement?.setAttribute('title', `${stats.drafts} draft resources`);
        if (stats.drafts > 9999) {
          draftsEl.textContent = (stats.drafts / 1000).toFixed(1) + 'k';
        }
      }
      if (avgScoreEl) {
        const scoreText = stats.avgScorePercent === 'N/A' ? 'N/A' : `${stats.avgScorePercent}%`;
        avgScoreEl.textContent = scoreText;
        avgScoreEl.parentElement?.setAttribute(
          'title',
          `Average voice score: ${stats.avgScorePercent === 'N/A' ? 'N/A' : stats.avgScorePercent + '%'}`
        );
        if (scoreText.length > 8) {
          avgScoreEl.style.fontSize = 'clamp(var(--text-lg), 3vw, var(--text-2xl))';
        }
      }

      console.log('[Portal] Analytics updated:', stats);
    } catch (error) {
      console.error('[Portal] Error updating analytics display:', error);
    }
  }


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
    
    const bulkImproveOk = await showConfirmDialog({
      title: 'Improve draft resources',
      message: `Improve ${drafts.length} draft resource(s) using voice profile + RAG + inference?`,
      details: 'This may take a while. Only drafts in your library are included.',
      confirmLabel: 'Improve all',
      variant: 'primary',
    });
    if (!bulkImproveOk) return;
    
    showNotification(`Improving ${drafts.length} resources...`, 'info');
    
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];
    
    try {
      // Process in batches to avoid overwhelming the server
      const batchSize = 5;
      for (let i = 0; i < drafts.length; i += batchSize) {
        const batch = drafts.slice(i, i + batchSize);
        const results = await Promise.allSettled(
          batch.map(resource =>
            workspaceFetch(`${getVoiceApiUrl()}/resources/${resource.id}/improve`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({})
            }).then(r => r.json())
          )
        );
        
        results.forEach((result, idx) => {
          if (result.status === 'fulfilled' && result.value.success) {
            successCount++;
          } else {
            failCount++;
            const resource = batch[idx];
            errors.push(`${resource.title || resource.id}: ${result.status === 'rejected' ? result.reason : result.value.error || 'Unknown error'}`);
          }
        });
        
        // Small delay between batches
        if (i + batchSize < drafts.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      let message = `Improved ${successCount} resource(s) successfully.`;
      if (failCount > 0) {
        message += ` ${failCount} failed.`;
        console.error('[Portal] Bulk improve errors:', errors);
      }
      
      showNotification(message, failCount > 0 ? 'warning' : 'success');
      setTimeout(() => loadResources(), 1000);
    } catch (error) {
      showNotification('Error during bulk improve operation.', 'error');
      console.error('[Portal] Bulk improve error:', error);
    }
  };

  // Set initial filter button state
  // Reset any stuck modals/overlays on page load
  document.addEventListener('DOMContentLoaded', () => {
    // Ensure body is scrollable and interactive
    document.body.style.overflow = '';
    document.body.style.pointerEvents = '';
    
    // Close any stuck modals - be aggressive
    const allModals = document.querySelectorAll('.modal');
    allModals.forEach((modal: Element) => {
      const htmlModal = modal as HTMLElement;
      htmlModal.setAttribute('aria-hidden', 'true');
      htmlModal.style.display = 'none';
      htmlModal.classList.remove('active');
    });
    
    // Remove any stuck modal overlays
    const overlays = document.querySelectorAll('.modal-overlay');
    overlays.forEach((overlay: Element) => {
      const htmlOverlay = overlay as HTMLElement;
      htmlOverlay.style.pointerEvents = 'none';
      htmlOverlay.style.display = 'none';
    });
    
    // Ensure info-card is closed
    const infoCard = document.getElementById('info-card');
    if (infoCard) {
      infoCard.classList.remove('active', 'railed');
      infoCard.setAttribute('aria-hidden', 'true');
      (infoCard as HTMLElement).style.pointerEvents = 'none';
    }
    
    // Ensure main content areas are interactive
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      (mainContent as HTMLElement).style.pointerEvents = '';
    }
    
    const adminPortal = document.getElementById('admin-portal');
    if (adminPortal) {
      (adminPortal as HTMLElement).style.pointerEvents = '';
    }
    
    const loginScreen = document.getElementById('login-screen');
    if (loginScreen) {
      (loginScreen as HTMLElement).style.pointerEvents = '';
    }
    
    const adminDashboard = document.getElementById('admin-dashboard');
    if (adminDashboard) {
      (adminDashboard as HTMLElement).style.pointerEvents = '';
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    const filterAll = document.getElementById('filter-all');
    if (filterAll) filterAll.classList.add('active');
    voiceContext.initWorkspaceVoiceProfileSelect();

    const dashboard = document.getElementById('admin-dashboard');
    if (dashboard && dashboard.style.display !== 'none') {
      syncWorkspaceSidebarLayout();
    }
  });

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

