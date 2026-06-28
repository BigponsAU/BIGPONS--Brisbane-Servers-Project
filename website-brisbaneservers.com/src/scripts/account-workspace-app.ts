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

  const getVoiceApiUrl = (): string => rt.voiceApiUrl || VOICE_API_URL;

  function escapeHtml(text: unknown): string {
    const value = String(text ?? '');
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeJsString(text: unknown): string {
    return String(text ?? '')
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\r/g, '\\r')
      .replace(/\n/g, '\\n');
  }

  function treeGroupLabel(value: unknown, fallback: string): string {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed || fallback;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
    return fallback;
  }

  function treeSlug(value: string): string {
    return value.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'item';
  }

  function resourceExcerpt(resource: { description?: unknown; content?: unknown }, maxLen = 150): string {
    const pick = (value: unknown): string => {
      if (typeof value !== 'string') return '';
      const trimmed = value.trim();
      if (!trimmed) return '';
      return trimmed.length > maxLen ? trimmed.substring(0, maxLen) : trimmed;
    };
    return pick(resource.description) || pick(resource.content);
  }

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

  let workspaceUser: { role?: string } | null = null;

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

  const roleRank: Record<string, number> = {
    client: 1,
    viewer: 2,
    editor: 3,
    admin: 4,
    'super-admin': 5
  };

  function hasWorkspaceCapability(user: { role?: string }, minRole: 'client' | 'viewer' | 'editor' | 'admin'): boolean {
    const current = roleRank[user?.role || 'client'] ?? 0;
    return current >= roleRank[minRole];
  }

  function applyRoleAccess(user: { role?: string; emailVerified?: boolean; workspaceEnabled?: boolean }): void {
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
    initWorkspaceModeSwitcher(user);
  }

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
      void ensureWorkspaceVoiceProfiles();
    } else if (panelName === 'profiles') {
      setTimeout(() => {
        loadProfiles();
      }, 100);
    } else if (panelName === 'analytics') {
      if (currentResources && currentResources.length > 0) {
        updateAnalyticsDisplay(currentResources);
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
      const response = await workspaceFetch(`${getVoiceApiUrl()}/resources`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const resources = Array.isArray(data.resources) ? data.resources : [];
        applyDashboardResourceSnapshot(resources);
      } else if (response.status === 401) {
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
    currentResources = resources;

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
    const starterRes = await workspaceFetch(`${apiBase}/resources/starter-blocks`, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (starterRes.status === 401) {
      await handleWorkspaceSessionExpired();
      return [];
    }

    if (starterRes.ok) {
      const data = await starterRes.json();
      return Array.isArray(data.resources) ? data.resources : [];
    }

    const mainRes = await workspaceFetch(`${apiBase}/resources?includeStarterBlocks=true`, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (mainRes.ok) {
      const data = await mainRes.json();
      const all = Array.isArray(data.resources) ? data.resources : [];
      return all.filter((r: { isStarterBlock?: boolean }) => r.isStarterBlock === true);
    }

    if (currentResources.length) {
      return currentResources.filter((r: any) => r.isStarterBlock === true);
    }

    let errorMessage = 'Failed to load starter blocks';
    try {
      const errorData = await starterRes.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      /* ignore */
    }
    throw new Error(errorMessage);
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

  // Global search functionality
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
          // Navigate to resources panel and perform search
          navigateToPanel('resources');
          const resourceSearch = document.getElementById('resource-search') as HTMLInputElement;
          if (resourceSearch) {
            resourceSearch.value = query;
            loadResources();
          }
        }
      }, 300);
    });

    // Allow Enter key to trigger search immediately
    globalSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const query = globalSearchInput.value.trim();
        if (query) {
          navigateToPanel('resources');
          const resourceSearch = document.getElementById('resource-search') as HTMLInputElement;
          if (resourceSearch) {
            resourceSearch.value = query;
            loadResources();
          }
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

  // Set up search and filter event listeners
  function setupResourceFilters(): void {
    // List view search
    const listSearch = document.getElementById('resource-search') as HTMLInputElement;
    if (listSearch) {
      listSearch.addEventListener('input', () => {
        if (!treeViewMode) {
          loadResources();
        }
      });
    }
    
    // List view status filter
    const listStatusFilter = document.getElementById('status-filter') as HTMLSelectElement;
    if (listStatusFilter) {
      listStatusFilter.addEventListener('change', () => {
        if (!treeViewMode) {
          loadResources();
        }
      });
    }
    
    // Quick filter buttons for list view
    document.querySelectorAll('#filter-all, #filter-published, #filter-draft, #filter-archived').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!treeViewMode) {
          setTimeout(() => loadResources(), 100);
        }
      });
    });
  }

  // Generate resource
  document.getElementById('generate-resource-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const statusDiv = document.getElementById('generate-status');
    const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
    
    if (statusDiv) {
      statusDiv.textContent = 'Generating resource synchronously... This may take a moment.';
      statusDiv.className = 'status-message';
    }
    
    // Disable submit button and show loading state
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Generating...';
    }

    try {
      const response = await workspaceFetch(`${getVoiceApiUrl()}/resources/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          industry: formData.get('industry'),
          topic: formData.get('topic'),
          title: formData.get('title') || undefined,
          profileId: getWorkspaceVoiceProfileIdForApi(),
          options: {
            length: formData.get('length'),
            includeExamples: (document.getElementById('include-examples') as HTMLInputElement)?.checked
          }
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
          const voiceScore = data.voiceValidation?.score || 0;
          const scoreText = voiceScore ? ` Voice score: ${Math.round(voiceScore * 100)}%` : '';
        const inferenceMode = data.inference?.mode ? ` via ${data.inference.mode}` : '';
        const modelHint = data.inference?.modelId ? ` (${data.inference.modelId})` : '';
        const updateText = data.updated ? ' (updated existing resource)' : '';
        const message = `Resource ${data.updated ? 'updated' : 'generated'}${inferenceMode}${modelHint}.${updateText}${scoreText}`;
        
        if (statusDiv) {
          statusDiv.textContent = message;
          statusDiv.className = 'status-message success';
        }
        showNotification(message, 'success');
        form.reset();
        // Refresh resources list and dashboard after a short delay to ensure server has saved
        setTimeout(() => {
          console.log('[Portal] Refreshing resources after generation');
          loadResources();
          loadDashboardData();
        }, 500);
      } else {
        const errorMsg = data.error || 'Generation failed';
        if (statusDiv) {
          statusDiv.textContent = errorMsg;
          statusDiv.className = 'status-message error';
        }
        showNotification('Generation failed: ' + errorMsg, 'error');
        console.error('[Portal] Resource generation failed:', data);
      }
      } catch (error) {
        if (statusDiv) {
          statusDiv.textContent = 'Connection error. Please try again.';
          statusDiv.className = 'status-message error';
        }
      } finally {
      // Re-enable submit button
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Generate Resource';
      }
    }
  });

  // Load resources
  async function loadResources(): Promise<void> {
    const listDiv = document.getElementById('resources-list');
    const treeContainer = document.getElementById('resource-tree');
    
    // Show loading in both views
    if (listDiv) {
      listDiv.innerHTML = `
        <div class="loading-message">
          <div style="display: flex; flex-direction: column; align-items: center; gap: var(--space-md);">
            <div class="loading-spinner"></div>
            <p>Loading resources...</p>
          </div>
        </div>
      `;
    }
    
    if (treeContainer) {
      treeContainer.innerHTML = `
        <div class="tree-loading">
          <div class="loading-spinner"></div>
          <p>Loading resource tree...</p>
        </div>
      `;
    }

    try {
      const statusFilter = (document.getElementById('status-filter') as HTMLSelectElement)?.value;
      const searchQuery = (document.getElementById('resource-search') as HTMLInputElement)?.value;
      const typeFilter = (document.getElementById('resource-type-filter') as HTMLSelectElement)?.value || 'user';

      let url = `${getVoiceApiUrl()}/resources`;
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter === 'starter') {
        // Fetch starter blocks separately
        url = `${getVoiceApiUrl()}/resources/starter-blocks`;
      } else if (typeFilter === 'all') {
        params.append('includeStarterBlocks', 'true');
      }
      if (params.toString()) url += '?' + params.toString();

      console.log('[Portal] Fetching resources from:', url);
      console.log('[Portal] Session active:', sessionActive);

      const response = await workspaceFetch(url, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('[Portal] Response status:', response.status, response.statusText);

      if (response.status === 401) {
        await handleWorkspaceSessionExpired();
        return;
      }

      if (!response.ok) {
        let errorMessage = `Failed to load resources (${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          console.error('[Portal] API error:', errorData);
        } catch (e) {
          const text = await response.text();
          console.error('[Portal] Response text:', text);
        }

        const errorHtml = `
          <div class="loading-message" style="color: var(--error-color, #dc3545);">
            <p><strong>Error loading resources:</strong> ${escapeHtml(errorMessage)}</p>
            <p style="margin-top: var(--space-md); font-size: var(--text-sm);">
              Please check your connection and try again. If the problem persists, check the browser console for details.
            </p>
            <button class="btn btn-secondary" onclick="loadResources()" style="margin-top: var(--space-md);">Retry</button>
          </div>
        `;
        
        if (listDiv) listDiv.innerHTML = errorHtml;
        if (treeContainer) {
          treeContainer.innerHTML = `
            <div class="tree-loading" style="color: var(--error-color, #dc3545);">
              <p><strong>Error loading tree:</strong> ${escapeHtml(errorMessage)}</p>
              <button class="btn btn-secondary btn-sm" onclick="loadResources()" style="margin-top: var(--space-md);">Retry</button>
            </div>
          `;
        }
        return;
      }

      const data = await response.json();
      if (isDev) {
        console.log('[Portal] Received data:', { success: data.success, count: data.resources?.length || 0 });
      }

      if (!data.success) {
        listDiv.innerHTML = `
          <div class="loading-message" style="color: var(--error-color, #dc3545);">
            <p><strong>Failed to load resources:</strong> ${escapeHtml(data.error || 'Unknown error')}</p>
            <button class="btn btn-secondary" onclick="loadResources()" style="margin-top: var(--space-md);">Retry</button>
          </div>
        `;
        return;
      }

      let resources = Array.isArray(data.resources) ? data.resources : [];
      if (isDev) {
        console.log('[Portal] Total resources loaded:', resources.length);
      }
      
      // Store for modal access (before filtering) - include all resources
      currentResources = resources;
      
      // Separate starter blocks from user resources (declare at function scope)
      const starterBlocks = resources.filter((r: any) => r.isStarterBlock === true);
      const userResources = resources.filter((r: any) => !r.isStarterBlock);
      if (isDev) {
        console.log('[Portal] Starter blocks:', starterBlocks.length, 'User resources:', userResources.length);
      }
      
      // Determine which resources to show based on type filter (reuse typeFilter declared above)
      let resourcesToShow = typeFilter === 'starter' ? starterBlocks : 
                           typeFilter === 'all' ? resources : 
                           userResources;
      
      // Apply filters for list view
      let filteredResources = [...resourcesToShow];
      
      // Client-side search
      if (searchQuery && searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        filteredResources = filteredResources.filter((r: any) => 
          (r.title && r.title.toLowerCase().includes(query)) ||
          (r.topic && r.topic.toLowerCase().includes(query)) ||
          (r.industry && r.industry.toLowerCase().includes(query)) ||
          (r.description && r.description.toLowerCase().includes(query))
        );
        console.log('[Portal] Resources after search filter:', filteredResources.length);
      }
      
      // Status filter (only for non-starter blocks, starter blocks are always published)
      if (statusFilter && typeFilter !== 'starter') {
        filteredResources = filteredResources.filter((r: any) => r.status === statusFilter);
      }

      // Build tree view - show user resources by default, starter blocks can be filtered
      const treeTypeFilter = (document.getElementById('resource-type-filter') as HTMLSelectElement)?.value || 'user';
      const treeResources = treeTypeFilter === 'starter' ? starterBlocks :
                           treeTypeFilter === 'all' ? resources :
                           userResources;
      buildResourceTree(treeResources);

      // Render list view
      if (listDiv) {
        if (filteredResources.length === 0) {
          const hasFilters = statusFilter || (searchQuery && searchQuery.trim()) || typeFilter !== 'user';
          const message = hasFilters 
            ? 'No resources match your current filters. Try adjusting your search, status, or type filter.'
            : typeFilter === 'starter'
              ? 'No starter blocks found. Check back later or contact support.'
              : 'No resources found. Browse starter blocks on the dashboard or generate/upload your first resource.';
          
          listDiv.innerHTML = `
            <div class="loading-message" style="padding: var(--space-3xl);">
              <div style="display: flex; flex-direction: column; align-items: center; gap: var(--space-lg);">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity: 0.3;">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
                <div style="text-align: center;">
                  <p style="font-size: var(--text-lg); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-sm);">${message}</p>
                  ${!hasFilters ? `
                    <p style="color: var(--text-secondary); font-size: var(--text-sm); margin-bottom: var(--space-md);">
                      ${typeFilter === 'starter' ? 'Browse starter blocks below or use the filter to see your own resources.' : 'Browse starter blocks on the dashboard or generate/upload your first resource.'}
                    </p>
                  ` : ''}
                </div>
                ${hasFilters ? `
                  <button class="btn btn-secondary" onclick="clearFilters()">Clear Filters</button>
                ` : typeFilter === 'starter' ? `
                  <div style="display: flex; gap: var(--space-md); flex-wrap: wrap; justify-content: center;">
                    <button class="btn btn-primary" onclick="navigateToPanel('dashboard');">
                      View Starter Blocks on Dashboard
                    </button>
                    <button class="btn btn-secondary" onclick="document.getElementById('resource-type-filter').value = 'user'; loadResources();">
                      View My Resources
                    </button>
                  </div>
                ` : `
                  <div style="display: flex; gap: var(--space-md); flex-wrap: wrap; justify-content: center;">
                    <button class="btn btn-primary" onclick="focusResourceCreationSection('generate')">
                      Generate Resource
                    </button>
                    <button class="btn btn-primary" onclick="focusResourceCreationSection('upload')">
                      Upload Resource
                    </button>
                    <button class="btn btn-secondary" onclick="document.getElementById('resource-type-filter').value = 'starter'; loadResources();">
                      Browse Starter Blocks
                    </button>
                  </div>
                `}
              </div>
            </div>
          `;
        } else {
          if (import.meta.env.MODE === 'development') {
            console.log('[Portal] Rendering', filteredResources.length, 'resources in list view');
          }

          listDiv.innerHTML = filteredResources.map((resource: any) => {
            const voiceScore = resource.metadata?.voiceScore || 0;
            const voiceScoreClass = voiceScore >= 0.8 ? 'voice-score-high' : voiceScore >= 0.6 ? 'voice-score-medium' : 'voice-score-low';
            const voiceScoreText = voiceScore ? `${Math.round(voiceScore * 100)}%` : 'N/A';
            const inferenceBadge = formatInferenceBadge(resource.metadata);
            const canEdit = workspaceUser && hasWorkspaceCapability(workspaceUser, 'editor');
          
            // Safe date parsing
            let dateText = 'Unknown';
            try {
              if (resource.generatedAt) {
                const date = new Date(resource.generatedAt);
                if (!isNaN(date.getTime())) {
                  dateText = date.toLocaleDateString();
                }
              }
            } catch (e) {
              console.warn('[Portal] Invalid date for resource:', resource.id, resource.generatedAt);
            }
            
            const primaryActions = [];
            const secondaryActions = [];
            
            // Primary actions (always visible on hover)
            primaryActions.push(`<button class="btn btn-primary btn-sm" onclick="viewResource('${escapeHtml(resource.id)}')" aria-label="View resource">
              <svg class="btn-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              View
            </button>`);
            
            if (resource.status === 'draft') {
              primaryActions.push(`<button class="btn btn-success btn-sm" onclick="publishResource('${escapeHtml(resource.id)}')" aria-label="Publish">
                <svg class="btn-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Publish
              </button>`);
            }
            
            // Secondary actions (in dropdown)
            secondaryActions.push(`<button class="btn" onclick="editResource('${escapeHtml(resource.id)}')">
              <svg class="btn-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              Edit
            </button>`);
            
            secondaryActions.push(`<button class="btn" onclick="previewResource('${escapeHtml(resource.id)}')">
              <svg class="btn-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
              </svg>
              Preview
            </button>`);
            
            if (resource.status === 'published') {
              secondaryActions.push(`<button class="btn" onclick="unpublishResource('${escapeHtml(resource.id)}')">
                <svg class="btn-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                Unpublish
              </button>`);
            }
            
            if (canEdit) {
            secondaryActions.push(`<button class="btn" onclick="improveResource('${escapeHtml(resource.id)}')">
              <svg class="btn-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                <polyline points="17 6 23 6 23 12"></polyline>
              </svg>
              Improve
            </button>`);
            }
            
            if (resource.status !== 'archived') {
              secondaryActions.push(`<button class="btn" onclick="archiveResource('${escapeHtml(resource.id)}')">
                <svg class="btn-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="21 16 21 22 3 22 3 16"></polyline>
                  <line x1="7" y1="16" x2="7" y2="2"></line>
                  <line x1="17" y1="16" x2="17" y2="2"></line>
                </svg>
                Archive
              </button>`);
            } else {
              secondaryActions.push(`<button class="btn" onclick="unarchiveResource('${escapeHtml(resource.id)}')">
                <svg class="btn-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="5 8 10 13 19 2"></polyline>
                </svg>
                Unarchive
              </button>`);
            }
            
            secondaryActions.push(`<button class="btn" onclick="deleteResource('${escapeHtml(resource.id)}')" style="color: var(--portal-error);">
              <svg class="btn-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              Delete
            </button>`);

            const isStarterBlock = resource.isStarterBlock === true;
            const starterBlockBadge = isStarterBlock ? '<span class="badge badge-starter" style="background: var(--portal-primary); color: var(--portal-text-inverse);">STARTER BLOCK</span>' : '';
            
            // Get industry class for color coding
            const industrySlug = (resource.industry || '').toLowerCase().replace(/\s+/g, '-');
            const industryClass = industrySlug ? `resource-item-industry-${industrySlug}` : '';
            const industryBadgeClass = industrySlug ? `badge-industry-${industrySlug}` : '';
            
            return `
          <article class="resource-item ${isStarterBlock ? 'resource-item-starter' : ''} ${industryClass}" data-resource-id="${escapeHtml(resource.id)}" data-industry="${escapeHtml(resource.industry || '')}" tabindex="0">
            <div class="resource-checkbox-wrapper">
              ${!isStarterBlock ? `<input type="checkbox" class="resource-checkbox" data-resource-id="${escapeHtml(resource.id)}" onchange="updateBulkActions()" aria-label="Select resource" />` : ''}
            </div>
            <div class="resource-header">
              <h3 class="resource-title">
                ${isStarterBlock ? `
                  <a href="#" class="resource-title-link" onclick="event.preventDefault(); createFromStarterBlock('${escapeHtml(resource.id)}');">
                    ${escapeHtml(resource.title || 'Untitled Resource')}
                  </a>
                ` : `
                  <a href="#" class="resource-title-link" onclick="event.preventDefault(); viewResource('${escapeHtml(resource.id)}');">
                    ${escapeHtml(resource.title || 'Untitled Resource')}
                  </a>
                `}
              </h3>
            </div>
            <div class="resource-status-group">
              ${starterBlockBadge}
              ${!isStarterBlock ? `<span class="badge badge-${escapeHtml(resource.status || 'draft')}">${escapeHtml((resource.status || 'draft').charAt(0).toUpperCase() + (resource.status || 'draft').slice(1))}</span>` : ''}
              ${voiceScore > 0 ? `
                <span class="voice-score ${voiceScoreClass}" title="Voice Match Score: ${voiceScoreText}">
                  <svg class="voice-score-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  ${voiceScoreText}
                </span>
              ` : ''}
              ${inferenceBadge}
            </div>
            <div class="resource-meta">
              <span class="resource-meta-item">
                <span class="resource-meta-label">Industry:</span>
                <span class="badge ${industryBadgeClass}" style="display: inline-flex; align-items: center; padding: 2px var(--space-sm); font-size: var(--text-xs); font-weight: var(--font-weight-medium);">${escapeHtml((resource.industry || 'N/A').replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()))}</span>
              </span>
              <span class="resource-meta-item">
                <span class="resource-meta-label">Topic:</span>
                <span>${escapeHtml(resource.topic || 'N/A')}</span>
              </span>
              <span class="resource-meta-item">
                <span class="resource-meta-label">Date:</span>
                <span>${dateText}</span>
              </span>
              ${resource.metadata?.wordCount ? `
                <span class="resource-meta-item">
                  <span class="resource-meta-label">Words:</span>
                  <span>${resource.metadata.wordCount}</span>
                </span>
              ` : ''}
            </div>
            <div class="resource-content">
              ${escapeHtml(resourceExcerpt(resource) || 'No description available')}
              ${resourceExcerpt(resource).length >= 150 ? `
                <a href="#" class="resource-description-toggle" onclick="event.preventDefault(); this.previousSibling.classList.toggle('resource-content-expanded'); this.textContent = this.previousSibling.classList.contains('resource-content-expanded') ? 'Show less' : 'Show more';">
                  Show more
                </a>
              ` : ''}
            </div>
            <div class="resource-actions" role="group" aria-label="Resource actions">
              ${isStarterBlock ? `
                <div class="resource-actions-primary">
                  <button class="btn btn-primary btn-sm" onclick="createFromStarterBlock('${escapeHtml(resource.id)}')" aria-label="Use this starter block">
                    <svg class="btn-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Use This Block
                  </button>
                  <button class="btn btn-secondary btn-sm" onclick="viewResource('${escapeHtml(resource.id)}')" aria-label="Preview starter block">
                    <svg class="btn-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    Preview
                  </button>
                </div>
              ` : `
              <div class="resource-actions-primary">
                ${primaryActions.join('')}
              </div>
              `}
              <div class="resource-actions-secondary">
                <div class="resource-actions-more">
                  <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); this.closest('.resource-actions-more').classList.toggle('active');" aria-label="More actions">
                    <svg class="btn-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="1"></circle>
                      <circle cx="12" cy="5" r="1"></circle>
                      <circle cx="12" cy="19" r="1"></circle>
                    </svg>
                    More
                  </button>
                  <div class="resource-actions-dropdown">
                    ${secondaryActions.join('')}
                  </div>
                </div>
              </div>
            </div>
          </article>
            `;
          }).join('');

          if (import.meta.env.MODE === 'development') {
            console.log('[Portal] Resources rendered successfully in list view');
          }
        }
      }
      
      updateAnalyticsDisplay(userResources);

      const dashboardPanel = document.getElementById('dashboard-panel');
      if (dashboardPanel?.classList.contains('active')) {
        applyDashboardResourceSnapshot(resources);
      }
    } catch (error) {
      console.error('[Portal] Error loading resources:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorHtml = `
        <div class="loading-message" style="color: var(--error-color, #dc3545);">
          <p><strong>Connection error:</strong> ${escapeHtml(errorMessage)}</p>
          <p style="margin-top: var(--space-md); font-size: var(--text-sm);">
            Please check:
            <ul style="text-align: left; display: inline-block; margin-top: var(--space-sm);">
              <li>Your internet connection</li>
              <li>That the API server is running</li>
              <li>The browser console for more details</li>
            </ul>
          </p>
          <button class="btn btn-secondary" onclick="loadResources()" style="margin-top: var(--space-md);">Retry</button>
        </div>
      `;
      
      if (listDiv) {
        listDiv.innerHTML = errorHtml;
      }
      
      const treeContainer = document.getElementById('resource-tree');
      if (treeContainer) {
        treeContainer.innerHTML = `
          <div class="tree-loading" style="color: var(--error-color, #dc3545);">
            <p><strong>Error loading tree:</strong> ${escapeHtml(errorMessage)}</p>
            <button class="btn btn-secondary btn-sm" onclick="loadResources()" style="margin-top: var(--space-md);">Retry</button>
          </div>
        `;
      }
    }
  }

  // Tree view state
  let treeViewMode = true;
  let currentTreeStatusFilter = '';
  let selectedResourceId: string | null = null;
  let treeData: { [industry: string]: { [topic: string]: any[] } } = {};

  function getTreeResourcesForDisplay(resources: any[] = currentResources): any[] {
    const typeFilter = (document.getElementById('resource-type-filter') as HTMLSelectElement)?.value || 'user';
    const starterBlocks = resources.filter((r: any) => r.isStarterBlock === true);
    const userResources = resources.filter((r: any) => !r.isStarterBlock);
    return typeFilter === 'starter' ? starterBlocks :
      typeFilter === 'all' ? resources :
      userResources;
  }

  function showResourceTreeError(treeContainer: HTMLElement, message: string): void {
    treeContainer.innerHTML = `
      <div class="tree-loading" style="color: var(--error-color, #dc3545);">
        <p><strong>Error loading tree:</strong> ${escapeHtml(message)}</p>
        <button class="btn btn-secondary btn-sm" onclick="loadResources()" style="margin-top: var(--space-md);">Retry</button>
      </div>
    `;
  }

  // Toggle between tree and list view
  (window as any).toggleResourceView = function() {
    treeViewMode = !treeViewMode;
    const workspace = document.getElementById('resource-workspace');
    const listView = document.getElementById('resources-list-view');
    const toggleIcon = document.getElementById('view-toggle-icon');
    const toggleText = document.getElementById('view-toggle-text');
    
    if (treeViewMode) {
      // Show tree view
      workspace?.classList.remove('hidden');
      listView?.classList.add('hidden');
      if (toggleIcon) {
        toggleIcon.innerHTML = '<rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>';
      }
      if (toggleText) toggleText.textContent = 'List View';
      
      // Ensure tree is built if resources are loaded
      if (currentResources && currentResources.length > 0) {
        buildResourceTree(getTreeResourcesForDisplay());
      }
    } else {
      // Show list view
      workspace?.classList.add('hidden');
      listView?.classList.remove('hidden');
      if (toggleIcon) {
        toggleIcon.innerHTML = '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>';
      }
      if (toggleText) toggleText.textContent = 'Tree View';
      
      // Reload resources to refresh list view
      if (currentResources && currentResources.length > 0) {
        // Re-render list view with current resources
        const listDiv = document.getElementById('resources-list');
        if (listDiv && currentResources.length > 0) {
          // Trigger a re-render by calling loadResources which will use currentResources
          loadResources();
        }
      } else {
        // Load resources if not already loaded
        loadResources();
      }
    }
  };

  // Build resource tree
  function buildResourceTree(resources: any[]): void {
    const treeContainer = document.getElementById('resource-tree');
    if (!treeContainer) return;

    try {
      treeData = {};
      const filteredResources = currentTreeStatusFilter
        ? resources.filter((r: any) => r.status === currentTreeStatusFilter)
        : resources;

      filteredResources.forEach((resource: any) => {
        const industry = treeGroupLabel(resource?.industry, 'Uncategorized');
        const topic = treeGroupLabel(resource?.topic, 'Untitled');

        if (!treeData[industry]) {
          treeData[industry] = {};
        }
        if (!treeData[industry][topic]) {
          treeData[industry][topic] = [];
        }
        treeData[industry][topic].push(resource);
      });

      const industries = Object.keys(treeData).sort();

      if (industries.length === 0) {
        treeContainer.innerHTML = `
          <div class="tree-empty-state" role="status">
            <p class="tree-empty-title">No resources yet</p>
            <p class="tree-empty-hint">Create from a starter block on the dashboard, or use Generate / Create from content / Upload above.</p>
          </div>
        `;
        return;
      }

      let html = '';
      industries.forEach((industry, industryIndex) => {
        const topics = Object.keys(treeData[industry]).sort();
        const industryId = `industry-${treeSlug(industry)}-${industryIndex}`;
        const totalResources = topics.reduce((sum, topic) => sum + treeData[industry][topic].length, 0);

        html += '<div class="tree-node" role="treeitem" data-industry="' + escapeHtml(industry) + '" aria-expanded="false" aria-label="' + escapeHtml(industry) + ', ' + totalResources + ' resources">' +
          '<div class="tree-node-header" role="button" tabindex="0" id="header-' + industryId + '" data-tree-node-id="' + escapeHtml(industryId) + '" onclick="toggleTreeNode(\'' + escapeJsString(industryId) + '\')" onkeydown="handleTreeNodeKeydown(event, \'' + escapeJsString(industryId) + '\')">' +
          '<span class="tree-toggle" id="toggle-' + industryId + '" aria-hidden="true">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
          '<polyline points="9 18 15 12 9 6"></polyline>' +
          '</svg>' +
          '</span>' +
          '<svg class="tree-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
          '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>' +
          '<polyline points="9 22 9 12 15 12 15 22"></polyline>' +
          '</svg>' +
          '<span class="tree-label">' +
          escapeHtml(industry) +
          '<span class="tree-count">' + totalResources + '</span>' +
          '</span>' +
          '</div>' +
          '<div class="tree-children" id="' + industryId + '" role="group">';

        topics.forEach((topic, topicIndex) => {
          const topicResources = treeData[industry][topic];
          const topicId = 'topic-' + treeSlug(industry) + '-' + treeSlug(topic) + '-' + topicIndex;

          html += '<div class="tree-node" role="treeitem" data-topic="' + escapeHtml(topic) + '" aria-expanded="false" aria-label="' + escapeHtml(topic) + ', ' + topicResources.length + ' resources">' +
            '<div class="tree-node-header" role="button" tabindex="0" id="header-' + topicId + '" data-tree-node-id="' + escapeHtml(topicId) + '" onclick="toggleTreeNode(\'' + escapeJsString(topicId) + '\')" onkeydown="handleTreeNodeKeydown(event, \'' + escapeJsString(topicId) + '\')">' +
            '<span class="tree-toggle" id="toggle-' + topicId + '" aria-hidden="true">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
            '<polyline points="9 18 15 12 9 6"></polyline>' +
            '</svg>' +
            '</span>' +
            '<svg class="tree-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
            '<circle cx="12" cy="12" r="10"></circle>' +
            '<line x1="12" y1="8" x2="12" y2="16"></line>' +
            '<line x1="8" y1="12" x2="16" y2="12"></line>' +
            '</svg>' +
            '<span class="tree-label">' +
            escapeHtml(topic) +
            '<span class="tree-count">' + topicResources.length + '</span>' +
            '</span>' +
            '</div>' +
            '<div class="tree-children" id="' + topicId + '" role="group">';

          topicResources.forEach((resource: any) => {
            const resourceId = treeGroupLabel(resource?.id, '');
            if (!resourceId) return;
            const resourceBadgeClass = 'badge-' + treeGroupLabel(resource?.status, 'draft');
            const statusKey = treeGroupLabel(resource?.status, 'draft');
            const statusText = statusKey.charAt(0).toUpperCase() + statusKey.slice(1);
            const industrySlug = treeSlug(treeGroupLabel(resource?.industry, ''));
            const isSelected = selectedResourceId === resourceId;
            html += '<div class="tree-resource-item" role="treeitem" tabindex="0" ' +
              'data-resource-id="' + escapeHtml(resourceId) + '" ' +
              'data-industry="' + escapeHtml(industrySlug) + '" ' +
              'aria-selected="' + (isSelected ? 'true' : 'false') + '" ' +
              'aria-label="' + escapeHtml(treeGroupLabel(resource?.title, 'Untitled')) + ', ' + statusText + '" ' +
              'onclick="selectResource(\'' + escapeJsString(resourceId) + '\')" ' +
              'onkeydown="handleTreeResourceKeydown(event, \'' + escapeJsString(resourceId) + '\')">' +
              '<span class="tree-resource-title">' + escapeHtml(treeGroupLabel(resource?.title, 'Untitled')) + '</span>' +
              '<span class="tree-resource-badge ' + resourceBadgeClass + '">' + escapeHtml(statusText) + '</span>' +
              '</div>';
          });

          html += '</div></div>';
        });

        html += '</div></div>';
      });

      treeContainer.innerHTML = html;

      setTimeout(() => {
        const firstIndustry = treeContainer.querySelector('.tree-node[data-industry]');
        const industryId = firstIndustry?.querySelector('.tree-node-header')?.getAttribute('data-tree-node-id');
        if (industryId) {
          (window as any).toggleTreeNode(industryId);

          const firstTopic = firstIndustry?.querySelector('.tree-node[data-topic]');
          const topicId = firstTopic?.querySelector('.tree-node-header')?.getAttribute('data-tree-node-id');
          if (topicId) {
            setTimeout(() => {
              (window as any).toggleTreeNode(topicId);
            }, 100);
          }
        }
      }, 50);
    } catch (error) {
      console.error('[Portal] Error building resource tree:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      showResourceTreeError(treeContainer, message);
    }
  }

  // Toggle collapsible section
  (window as any).toggleSection = function(contentId: string, button: HTMLElement) {
    const content = document.getElementById(contentId);
    if (!content) {
      console.error('[Portal] Content element not found:', contentId);
      return;
    }

    const isExpanded = button.getAttribute('aria-expanded') === 'true';
    const svg = button.querySelector('svg') as SVGElement;
    
    if (isExpanded) {
      // Collapse
      content.classList.add('collapsed');
      setTimeout(() => {
        content.style.display = 'none';
      }, 400); // Wait for transition
      button.setAttribute('aria-expanded', 'false');
      if (svg) svg.style.transform = 'rotate(-90deg)';
    } else {
      // Expand
      content.style.display = 'block';
      content.classList.remove('collapsed');
      // Force reflow to trigger transition
      void content.offsetHeight;
      button.setAttribute('aria-expanded', 'true');
      if (svg) svg.style.transform = 'rotate(0deg)';
    }
  };

  function expandResourceSection(contentId: string): void {
    const content = document.getElementById(contentId);
    if (!content) return;
    const section = content.closest('.admin-section');
    const toggle = section?.querySelector('.section-toggle') as HTMLElement | null;
    if (!toggle) {
      content.style.display = 'block';
      content.classList.remove('collapsed');
      return;
    }
    if (toggle.getAttribute('aria-expanded') !== 'true') {
      (window as any).toggleSection(contentId, toggle);
      return;
    }
    content.style.display = 'block';
    content.classList.remove('collapsed');
  }

  function portalScrollToElement(element: HTMLElement): void {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => {
      const main = document.querySelector('.account-workspace-shell') as HTMLElement | null;
      if (!main) return;
      const mainBottom = main.getBoundingClientRect().bottom;
      const viewportBottom = window.innerHeight;
      if (mainBottom < viewportBottom - 8) {
        window.scrollTo({ top: window.scrollY + (mainBottom - viewportBottom) + 16, behavior: 'smooth' });
      }
    }, 120);
  }

  (window as any).focusResourceCreationSection = function(section: ResourceCreateSection): void {
    const sectionMap: Record<ResourceCreateSection, { contentId: string; headingId: string; focusId: string }> = {
      generate: {
        contentId: 'generate-resource-content',
        headingId: 'generate-resource-heading',
        focusId: 'resource-industry',
      },
      upload: {
        contentId: 'upload-resource-content',
        headingId: 'upload-resource-heading',
        focusId: 'upload-industry',
      },
      paste: {
        contentId: 'create-from-content-content',
        headingId: 'create-from-content-heading',
        focusId: 'process-content',
      },
    };
    const cfg = sectionMap[section];
    if (!cfg) return;

    const resourcesPanel = document.getElementById('resources-panel');
    const openPanel = () => {
      expandResourceSection(cfg.contentId);
      const heading = document.getElementById(cfg.headingId);
      if (!heading) return;
      portalScrollToElement(heading);
      window.setTimeout(() => {
        const focusEl = document.getElementById(cfg.focusId) as HTMLElement | null;
        focusEl?.focus({ preventScroll: true });
      }, 180);
    };

    if (!resourcesPanel?.classList.contains('active')) {
      (window as any).navigateToPanel('resources');
      window.setTimeout(openPanel, 220);
      return;
    }
    openPanel();
  };

  document.getElementById('portal-sidebar')?.addEventListener('click', (event) => {
    const item = (event.target as HTMLElement).closest('.sidebar-nav-item[data-panel]') as HTMLElement | null;
    if (!item) return;
    event.preventDefault();
    const panel = item.getAttribute('data-panel');
    if (panel) (window as any).navigateToPanel(panel);
  });

  // Initialize collapsible sections on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCollapsibleSections);
  } else {
    initializeCollapsibleSections();
  }

  function initializeCollapsibleSections() {
    document.querySelectorAll('.section-toggle').forEach(toggle => {
      const contentId = toggle.getAttribute('aria-controls');
      if (contentId) {
        const content = document.getElementById(contentId);
        const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
        const svg = toggle.querySelector('svg') as SVGElement;
        
        if (content) {
          if (!isExpanded) {
            content.style.display = 'none';
            content.classList.add('collapsed');
            if (svg) svg.style.transform = 'rotate(-90deg)';
          } else {
            content.style.display = 'block';
            content.classList.remove('collapsed');
            if (svg) svg.style.transform = 'rotate(0deg)';
          }
        }
      }
    });
  }

  // Toggle tree node
  (window as any).toggleTreeNode = function(nodeId: string) {
    const node = document.getElementById(nodeId);
    const toggle = document.getElementById(`toggle-${nodeId}`);
    const parent = node?.closest('.tree-node');
    
    if (node && parent) {
      const isExpanded = parent.classList.contains('expanded');
      if (isExpanded) {
        parent.classList.remove('expanded');
        parent.setAttribute('aria-expanded', 'false');
        if (toggle) toggle.classList.remove('expanded');
        const header = parent.querySelector('.tree-node-header');
        if (header) header.classList.remove('active');
      } else {
        parent.classList.add('expanded');
        parent.setAttribute('aria-expanded', 'true');
        if (toggle) toggle.classList.add('expanded');
        const header = parent.querySelector('.tree-node-header');
        if (header) header.classList.add('active');
      }
    }
  };

  // Keyboard: tree node header (industry/topic) - Enter/Space toggles
  (window as any).handleTreeNodeKeydown = function(ev: KeyboardEvent, nodeId: string) {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      (window as any).toggleTreeNode(nodeId);
    }
  };

  // Keyboard: tree resource item - Enter/Space selects
  (window as any).handleTreeResourceKeydown = function(ev: KeyboardEvent, resourceId: string) {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      (window as any).selectResource(resourceId);
    }
  };

  // Select resource with smooth transition
  (window as any).selectResource = function(resourceId: string) {
    selectedResourceId = resourceId;
    const resource = currentResources.find((r: any) => r.id === resourceId);
    if (!resource) {
      console.warn('[Portal] Resource not found:', resourceId);
      return;
    }

    // Update active states and aria-selected
    document.querySelectorAll('.tree-resource-item').forEach(item => {
      item.classList.remove('active');
      item.setAttribute('aria-selected', 'false');
    });
    const selectedItem = document.querySelector(`[data-resource-id="${escapeHtml(resourceId)}"]`);
    if (selectedItem) {
      selectedItem.classList.add('active');
      selectedItem.setAttribute('aria-selected', 'true');
      // Scroll into view if needed
      selectedItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Show detail panel with fade animation
    const emptyState = document.getElementById('workspace-empty-state');
    const detailPanel = document.getElementById('resource-detail-panel');
    
    if (emptyState) {
      emptyState.classList.add('hidden');
      emptyState.style.display = 'none';
      emptyState.style.opacity = '';
      emptyState.style.transform = '';
    }
    
    if (detailPanel) {
      detailPanel.style.opacity = '0';
      detailPanel.style.transform = 'translateX(20px)';
      detailPanel.classList.remove('hidden');
      
      // Load resource details
      loadResourceDetail(resource);
      
      // Fade in animation
      setTimeout(() => {
        detailPanel.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        detailPanel.style.opacity = '1';
        detailPanel.style.transform = 'translateX(0)';
      }, 50);
    }
  };

  // Load resource detail
  function loadResourceDetail(resource: any): void {
    const titleEl = document.getElementById('detail-title');
    const metaEl = document.getElementById('detail-meta');
    const contentEl = document.getElementById('detail-content');
    
    if (titleEl) {
      titleEl.textContent = resource.title || 'Untitled Resource';
    }
    
    if (metaEl) {
      const date = resource.generatedAt ? new Date(resource.generatedAt).toLocaleDateString() : 'N/A';
      metaEl.innerHTML = `
        <span><strong>Industry:</strong> ${escapeHtml(resource.industry || 'N/A')}</span>
        <span><strong>Topic:</strong> ${escapeHtml(resource.topic || 'N/A')}</span>
        <span><strong>Status:</strong> <span class="badge badge-${escapeHtml(resource.status || 'draft')}">${escapeHtml((resource.status || 'draft').charAt(0).toUpperCase() + (resource.status || 'draft').slice(1))}</span></span>
        <span><strong>Date:</strong> ${date}</span>
        ${resource.metadata?.wordCount ? `<span><strong>Words:</strong> ${resource.metadata.wordCount}</span>` : ''}
        ${resource.metadata?.voiceScore ? `<span><strong>Voice Score:</strong> ${Math.round(resource.metadata.voiceScore * 100)}%</span>` : ''}
        ${resource.metadata?.inferenceMode ? `<span><strong>Inference:</strong> ${escapeHtml(resource.metadata.inferenceMode)}${resource.metadata.inferenceModelId ? ` (${escapeHtml(String(resource.metadata.inferenceModelId))})` : ''}</span>` : ''}
      `;
    }
    
    if (contentEl) {
      contentEl.innerHTML = `
        <div style="margin-bottom: var(--space-lg);">
          <h4 style="margin-bottom: var(--space-sm); font-size: var(--text-base); font-weight: var(--font-weight-semibold);">Description</h4>
          <p style="color: var(--portal-text-secondary); line-height: 1.6;">${escapeHtml(resource.description || 'No description available')}</p>
        </div>
        <div>
          <h4 style="margin-bottom: var(--space-sm); font-size: var(--text-base); font-weight: var(--font-weight-semibold);">Content</h4>
          <div style="background: var(--portal-surface-subtle); padding: var(--space-lg); border-radius: var(--border-radius); border: 1px solid var(--portal-border-light);">
            <pre style="white-space: pre-wrap; font-family: inherit; font-size: var(--text-sm); line-height: 1.6; margin: 0; color: var(--portal-text-primary);">${escapeHtml(resource.content || 'No content available')}</pre>
          </div>
        </div>
        <div style="margin-top: var(--space-xl); display: flex; gap: var(--space-sm); flex-wrap: wrap;">
          <button class="btn btn-primary" onclick="viewResource('${escapeHtml(resource.id)}')">View Full</button>
          <button class="btn btn-secondary" onclick="editResource('${escapeHtml(resource.id)}')">Edit</button>
          <button class="btn btn-secondary" onclick="previewResource('${escapeHtml(resource.id)}')">Preview</button>
          ${resource.status === 'draft' ? `<button class="btn btn-success" onclick="publishResource('${escapeHtml(resource.id)}')">Publish</button>` : ''}
          ${resource.status === 'published' ? `<button class="btn btn-warning" onclick="unpublishResource('${escapeHtml(resource.id)}')">Unpublish</button>` : ''}
          ${workspaceUser && hasWorkspaceCapability(workspaceUser, 'editor') ? `<button class="btn btn-secondary" onclick="improveResource('${escapeHtml(resource.id)}')">Improve</button>` : ''}
          ${resource.status !== 'archived' ? `<button class="btn btn-secondary" onclick="archiveResource('${escapeHtml(resource.id)}')">Archive</button>` : ''}
          <button class="btn btn-danger" onclick="deleteResource('${escapeHtml(resource.id)}')">Delete</button>
        </div>
      `;
    }
  }

  // Close resource detail
  (window as any).closeResourceDetail = function() {
    selectedResourceId = null;
    const emptyState = document.getElementById('workspace-empty-state');
    const detailPanel = document.getElementById('resource-detail-panel');
    
    if (emptyState) {
      emptyState.classList.remove('hidden');
      emptyState.style.display = '';
    }
    if (detailPanel) detailPanel.classList.add('hidden');
    
    document.querySelectorAll('.tree-resource-item').forEach(item => {
      item.classList.remove('active');
    });
  };

  // Filter tree
  (window as any).filterTree = function(query: string) {
    const treeContainer = document.getElementById('resource-tree');
    if (!treeContainer) return;
    
    if (!query || query.trim() === '') {
      // Show all nodes when search is cleared
      treeContainer.querySelectorAll('.tree-node').forEach((node: Element) => {
        (node as HTMLElement).style.display = '';
        node.querySelectorAll('.tree-resource-item').forEach((item: Element) => {
          (item as HTMLElement).style.display = '';
        });
      });
      return;
    }
    
    const lowerQuery = query.toLowerCase().trim();
    const industryNodes = treeContainer.querySelectorAll('.tree-node[data-industry]');
    const topicNodes = treeContainer.querySelectorAll('.tree-node[data-topic]');

    topicNodes.forEach((node: Element) => {
      const header = node.querySelector('.tree-node-header');
      if (!header) return;

      const label = header.querySelector('.tree-label')?.textContent?.toLowerCase() || '';
      const matches = label.includes(lowerQuery);
      const resourceItems = node.querySelectorAll(':scope > .tree-children > .tree-resource-item');
      let resourceMatches = false;

      resourceItems.forEach((item: Element) => {
        const title = item.querySelector('.tree-resource-title')?.textContent?.toLowerCase() || '';
        if (title.includes(lowerQuery)) {
          (item as HTMLElement).style.display = '';
          resourceMatches = true;
        } else {
          (item as HTMLElement).style.display = 'none';
        }
      });

      const shouldShow = matches || resourceMatches;
      (node as HTMLElement).style.display = shouldShow ? '' : 'none';
      if (shouldShow) {
        node.classList.add('expanded');
        const toggle = header.querySelector('.tree-toggle');
        if (toggle) toggle.classList.add('expanded');
        const parentIndustry = node.closest('.tree-node[data-industry]');
        if (parentIndustry && !parentIndustry.classList.contains('expanded')) {
          parentIndustry.classList.add('expanded');
          const industryToggle = parentIndustry.querySelector('.tree-toggle');
          if (industryToggle) industryToggle.classList.add('expanded');
        }
      }
    });

    industryNodes.forEach((node: Element) => {
      const header = node.querySelector('.tree-node-header');
      if (!header) return;

      const label = header.querySelector('.tree-label')?.textContent?.toLowerCase() || '';
      const matches = label.includes(lowerQuery);
      const childTopics = node.querySelectorAll(':scope > .tree-children > .tree-node[data-topic]');
      let hasMatchingChildren = false;

      childTopics.forEach((child: Element) => {
        if ((child as HTMLElement).style.display !== 'none') {
          hasMatchingChildren = true;
        }
      });

      const shouldShow = matches || hasMatchingChildren;
      (node as HTMLElement).style.display = shouldShow ? '' : 'none';
      if (shouldShow && hasMatchingChildren) {
        node.classList.add('expanded');
        const toggle = header.querySelector('.tree-toggle');
        if (toggle) toggle.classList.add('expanded');
      }
    });
  };

  // Filter tree by status
  (window as any).filterTreeByStatus = function(status: string) {
    currentTreeStatusFilter = status;
    
    // Update button states
    document.querySelectorAll('.tree-filters .btn').forEach(btn => {
      btn.classList.remove('active');
      if ((btn as HTMLElement).dataset.status === status) {
        btn.classList.add('active');
      }
    });
    
    // Rebuild tree with filter
    if (currentResources && currentResources.length > 0) {
      buildResourceTree(getTreeResourcesForDisplay());
      
      // Also update list view if it's visible
      const listView = document.getElementById('resources-list-view');
      if (listView && !listView.classList.contains('hidden')) {
        loadResources();
      }
    } else {
      // Load resources if not loaded yet
      loadResources();
    }
  };

  // Filter by status helper
  (window as any).filterByStatus = (status: string) => {
    const statusFilter = document.getElementById('status-filter') as HTMLSelectElement;
    if (statusFilter) {
      statusFilter.value = status;
      
      // Update quick filter buttons
      document.querySelectorAll('.quick-filters .btn').forEach(btn => {
        btn.classList.remove('active');
      });
      const activeBtn = status 
        ? document.getElementById(`filter-${status}`)
        : document.getElementById('filter-all');
      if (activeBtn) activeBtn.classList.add('active');
      
      loadResources();
    }
  };

  // Make loadResources globally accessible for retry buttons
  (window as any).loadResources = loadResources;

  // Debounced search function
  let searchTimeout: ReturnType<typeof setTimeout> | null = null;
  function debouncedSearch(): void {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    searchTimeout = setTimeout(() => {
      loadResources();
    }, 300); // Wait 300ms after user stops typing
  }

  // Search and filter handlers
  document.getElementById('resource-search')?.addEventListener('input', debouncedSearch);
  document.getElementById('status-filter')?.addEventListener('change', loadResources);
  document.getElementById('resource-type-filter')?.addEventListener('change', loadResources);
  document.getElementById('refresh-resources')?.addEventListener('click', loadResources);

  // Store current resources for modal access
  let currentResources: any[] = [];

  // View Resource Modal Functions
  function openViewModal(id: string): void {
    const resource = currentResources.find((r: any) => r.id === id);
    if (!resource) {
      showNotification('Resource not found.', 'error');
      return;
    }

    const modal = document.getElementById('view-resource-modal');
    const titleEl = document.getElementById('view-resource-title');
    const bodyEl = document.getElementById('view-resource-body');
    const editBtn = document.getElementById('edit-from-view-btn');

    if (!modal || !titleEl || !bodyEl) return;

    titleEl.textContent = escapeHtml(resource.title);
    editBtn!.setAttribute('onclick', `closeViewModal(); editResource('${id}');`);

    const voiceScore = resource.metadata?.voiceScore || 0;
    const voiceScoreClass = voiceScore >= 0.8 ? 'voice-score-high' : voiceScore >= 0.6 ? 'voice-score-medium' : 'voice-score-low';
    const voiceScoreText = voiceScore ? `${Math.round(voiceScore * 100)}%` : 'N/A';

    bodyEl.innerHTML = `
      <div style="margin-bottom: var(--space-lg);">
        <div style="display: flex; gap: var(--space-md); flex-wrap: wrap; margin-bottom: var(--space-md);">
          <span class="badge badge-${resource.status}">${resource.status}</span>
          <span class="voice-score ${voiceScoreClass}">
            <svg class="voice-score-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            Voice Score: ${voiceScoreText}
          </span>
          ${resource.metadata?.wordCount ? `<span>Word Count: ${resource.metadata.wordCount}</span>` : ''}
        </div>
        <div style="color: var(--text-secondary); font-size: var(--text-sm);">
          <p><strong>Industry:</strong> ${escapeHtml(resource.industry)}</p>
          <p><strong>Topic:</strong> ${escapeHtml(resource.topic)}</p>
          <p><strong>Generated:</strong> ${new Date(resource.generatedAt).toLocaleString()}</p>
          ${resource.generatedBy ? `<p><strong>Generated By:</strong> ${escapeHtml(resource.generatedBy)}</p>` : ''}
          <p><strong>Version:</strong> ${resource.version}</p>
        </div>
      </div>
      <div style="margin-bottom: var(--space-lg);">
        <h3 style="margin-bottom: var(--space-md);">Description</h3>
        <p style="line-height: 1.6; color: var(--text-secondary);">${escapeHtml(resource.description)}</p>
      </div>
      <div>
        <h3 style="margin-bottom: var(--space-md);">Content</h3>
        <div style="line-height: 1.8; color: var(--text-primary); white-space: pre-wrap; background: var(--bg-accent); padding: var(--space-lg); border-radius: var(--border-radius); max-height: 400px; overflow-y: auto;">${escapeHtml(resource.content)}</div>
      </div>
    `;

    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeViewModal(): void {
    const modal = document.getElementById('view-resource-modal');
    if (modal) {
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  }

  // Edit Resource Modal Functions
  function openEditModal(id: string): void {
    const resource = currentResources.find((r: any) => r.id === id);
    if (!resource) {
      showNotification('Resource not found.', 'error');
      return;
    }

    const modal = document.getElementById('edit-resource-modal');
    if (!modal) return;

    (document.getElementById('edit-resource-id') as HTMLInputElement)!.value = resource.id;
    (document.getElementById('edit-resource-title-input') as HTMLInputElement)!.value = resource.title;
    (document.getElementById('edit-resource-industry') as HTMLInputElement)!.value = resource.industry;
    (document.getElementById('edit-resource-topic') as HTMLInputElement)!.value = resource.topic;
    (document.getElementById('edit-resource-description') as HTMLTextAreaElement)!.value = resource.description;
    (document.getElementById('edit-resource-content') as HTMLTextAreaElement)!.value = resource.content;
    (document.getElementById('edit-resource-status') as HTMLSelectElement)!.value = resource.status;

    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeEditModal(): void {
    const modal = document.getElementById('edit-resource-modal');
    if (modal) {
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      (document.getElementById('edit-resource-form') as HTMLFormElement)!.reset();
    }
  }

  // Resource action functions
  (window as any).viewResource = (id: string) => {
    openViewModal(id);
  };

  (window as any).editResource = (id: string) => {
    openEditModal(id);
  };

  (window as any).publishResource = async (id: string) => {
    if (!confirm('Publish this resource? It will be visible on the website.')) return;
    
    // Find the button and show loading state
    const resourceItem = document.querySelector(`[data-resource-id="${id}"]`);
    const publishBtn = resourceItem?.querySelector('button[onclick*="publishResource"]') as HTMLButtonElement;
    const originalText = publishBtn?.textContent;
    
    if (publishBtn) {
      publishBtn.disabled = true;
      publishBtn.textContent = 'Publishing...';
    }
    
    try {
      const response = await workspaceFetch(`${getVoiceApiUrl()}/resources/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'published' })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        if (import.meta.env.MODE === 'development') {
          console.log('[Portal] Resource published successfully');
        }
        showNotification('Resource published successfully.', 'success');
        setTimeout(() => { loadResources(); loadDashboardData(); }, 300);
      } else {
        const errorMsg = data.error || 'Unknown error';
        console.error('[Portal] Failed to publish resource:', errorMsg);
        showNotification('Failed to publish resource: ' + errorMsg, 'error');
        if (publishBtn && originalText) {
          publishBtn.disabled = false;
          publishBtn.textContent = originalText;
        }
      }
    } catch (error) {
      showNotification('Connection error. Please try again.', 'error');
      console.error('[Portal] Publish error:', error);
      if (publishBtn && originalText) {
        publishBtn.disabled = false;
        publishBtn.textContent = originalText;
      }
    }
  };

  (window as any).unpublishResource = async (id: string) => {
    if (!confirm('Unpublish this resource? It will no longer be visible on the website.')) return;
    
    try {
      const response = await workspaceFetch(`${getVoiceApiUrl()}/resources/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'draft' })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        console.log('[Portal] Resource unpublished successfully');
        showNotification('Resource unpublished successfully.', 'success');
        setTimeout(() => { loadResources(); loadDashboardData(); }, 300);
      } else {
        const errorMsg = data.error || 'Unknown error';
        console.error('[Portal] Failed to unpublish resource:', errorMsg);
        showNotification('Failed to unpublish resource: ' + errorMsg, 'error');
      }
    } catch (error) {
      showNotification('Connection error. Please try again.', 'error');
      console.error('[Portal] Unpublish error:', error);
    }
  };

  (window as any).archiveResource = async (id: string) => {
    if (!confirm('Archive this resource? It will be hidden from normal views but can be restored later.')) return;
    
    try {
      const response = await workspaceFetch(`${getVoiceApiUrl()}/resources/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'archived' })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        if (import.meta.env.MODE === 'development') {
          console.log('[Portal] Resource archived successfully');
        }
        showNotification('Resource archived successfully.', 'success');
        setTimeout(() => { loadResources(); loadDashboardData(); }, 300);
      } else {
        const errorMsg = data.error || 'Unknown error';
        console.error('[Portal] Failed to archive resource:', errorMsg);
        showNotification('Failed to archive resource: ' + errorMsg, 'error');
      }
    } catch (error) {
      showNotification('Connection error. Please try again.', 'error');
      console.error('[Portal] Archive error:', error);
    }
  };

  (window as any).unarchiveResource = async (id: string) => {
    if (!confirm('Unarchive this resource? It will be restored to draft status.')) return;
    
    try {
      const response = await workspaceFetch(`${getVoiceApiUrl()}/resources/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'draft' })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        console.log('[Portal] Resource unarchived successfully');
        showNotification('Resource unarchived successfully.', 'success');
        setTimeout(() => { loadResources(); loadDashboardData(); }, 300);
      } else {
        const errorMsg = data.error || 'Unknown error';
        console.error('[Portal] Failed to unarchive resource:', errorMsg);
        showNotification('Failed to unarchive resource: ' + errorMsg, 'error');
      }
    } catch (error) {
      showNotification('Connection error. Please try again.', 'error');
      console.error('[Portal] Unarchive error:', error);
    }
  };

  // Edit form submission
  document.getElementById('edit-resource-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const id = (document.getElementById('edit-resource-id') as HTMLInputElement)!.value;

    // Validate form
    const title = (document.getElementById('edit-resource-title-input') as HTMLInputElement)!.value.trim();
    const industry = (document.getElementById('edit-resource-industry') as HTMLSelectElement)!.value;
    const topic = (document.getElementById('edit-resource-topic') as HTMLInputElement)!.value.trim();
    const description = (document.getElementById('edit-resource-description') as HTMLTextAreaElement)!.value.trim();
    const content = (document.getElementById('edit-resource-content') as HTMLTextAreaElement)!.value.trim();

    if (!title || !industry || !topic || !description || !content) {
      showNotification('Please fill in all required fields.', 'warning');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
    const originalText = submitBtn?.textContent;
    
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving...';
    }

    try {
      const response = await workspaceFetch(`${getVoiceApiUrl()}/resources/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          industry,
          topic,
          description,
          content,
          status: (document.getElementById('edit-resource-status') as HTMLSelectElement)!.value
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        console.log('[Portal] Resource updated successfully');
        showNotification('Resource updated successfully.', 'success');
        closeEditModal();
        setTimeout(() => { loadResources(); loadDashboardData(); }, 300);
      } else {
        const errorMsg = data.error || 'Unknown error';
        console.error('[Portal] Failed to update resource:', errorMsg);
        showNotification('Failed to update resource: ' + errorMsg, 'error');
        if (submitBtn && originalText) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      }
    } catch (error) {
      showNotification('Connection error. Please try again.', 'error');
      console.error('[Portal] Update error:', error);
      if (submitBtn && originalText) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    }
  });

  // Close modals on overlay click
  (window as any).closeViewModal = closeViewModal;
  (window as any).closeEditModal = closeEditModal;

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // ESC key closes modals - be aggressive
    if (e.key === 'Escape') {
      // Reset body overflow first
      document.body.style.overflow = '';
      document.body.style.pointerEvents = '';
      
      const viewModal = document.getElementById('view-resource-modal');
      const editModal = document.getElementById('edit-resource-modal');
      
      if (viewModal && viewModal.getAttribute('aria-hidden') === 'false') {
        closeViewModal();
      }
      if (editModal && editModal.getAttribute('aria-hidden') === 'false') {
        closeEditModal();
      }
      
      // Close ALL modals aggressively
      const allModals = document.querySelectorAll('.modal');
      allModals.forEach((modal: Element) => {
        const htmlModal = modal as HTMLElement;
        htmlModal.setAttribute('aria-hidden', 'true');
        htmlModal.style.display = 'none';
        htmlModal.style.pointerEvents = 'none';
        htmlModal.classList.remove('active');
        
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
          (closeBtn as HTMLElement).click();
        }
      });
      
      // Remove any stuck overlays
      const overlays = document.querySelectorAll('.modal-overlay');
      overlays.forEach((overlay: Element) => {
        const htmlOverlay = overlay as HTMLElement;
        htmlOverlay.style.display = 'none';
        htmlOverlay.style.pointerEvents = 'none';
      });
      
      // Close info card
      const infoCard = document.getElementById('info-card');
      if (infoCard) {
        infoCard.classList.remove('active', 'railed');
        infoCard.setAttribute('aria-hidden', 'true');
        (infoCard as HTMLElement).style.pointerEvents = 'none';
      }
    }
    
    // Ctrl/Cmd + K focuses search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      const searchInput = document.getElementById('resource-search') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    }
  });

  (window as any).improveResource = async (id: string) => {
    if (!confirm('Improve this resource using voice profile + RAG + inference? This may take a moment.')) return;
    
    // Find the button and show loading state
    const resourceItem = document.querySelector(`[data-resource-id="${id}"]`);
    const improveBtn = resourceItem?.querySelector('button[onclick*="improveResource"]') as HTMLButtonElement;
    const originalText = improveBtn?.textContent;
    
    if (improveBtn) {
      improveBtn.disabled = true;
      improveBtn.textContent = 'Improving...';
    }
    
    showNotification('Improving resource... This may take a moment.', 'info', 0);
    
    try {
      const response = await workspaceFetch(`${getVoiceApiUrl()}/resources/${id}/improve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      });

      const data = await response.json();
      if (response.ok && data.success) {
        const voiceScore = data.voiceValidation?.score || 0;
        const scoreText = voiceScore ? ` Voice score: ${Math.round(voiceScore * 100)}%` : '';
        const inferenceMode = data.inference?.mode ? ` via ${data.inference.mode}` : '';
        const modelHint = data.inference?.modelId ? ` (${data.inference.modelId})` : '';
        showNotification(`Resource improved${inferenceMode}${modelHint}.${scoreText}`, 'success');
        console.log('[Portal] Resource improved successfully');
        setTimeout(() => { loadResources(); loadDashboardData(); }, 500);
      } else {
        const errorMsg = data.error || 'Unknown error';
        console.error('[Portal] Failed to improve resource:', errorMsg);
        showNotification('Failed to improve resource: ' + errorMsg, 'error');
        if (improveBtn && originalText) {
          improveBtn.disabled = false;
          improveBtn.textContent = originalText;
        }
      }
    } catch (error) {
      showNotification('Connection error. Please try again.', 'error');
      console.error('[Portal] Improve error:', error);
      if (improveBtn && originalText) {
        improveBtn.disabled = false;
        improveBtn.textContent = originalText;
      }
    }
  };

  (window as any).deleteResource = async (id: string) => {
    if (!confirm('Delete this resource? This action cannot be undone.')) return;
    
    // Find the button and show loading state
    const resourceItem = document.querySelector(`[data-resource-id="${id}"]`);
    const deleteBtn = resourceItem?.querySelector('button[onclick*="deleteResource"]') as HTMLButtonElement;
    const originalText = deleteBtn?.textContent;
    
    if (deleteBtn) {
      deleteBtn.disabled = true;
      deleteBtn.textContent = 'Deleting...';
    }
    
    try {
      const response = await workspaceFetch(`${getVoiceApiUrl()}/resources/${id}`, {
        method: 'DELETE',
        headers: {
        }
      });

      const data = await response.json();
      if (response.ok && data.success) {
        console.log('[Portal] Resource deleted successfully');
        showNotification('Resource deleted successfully.', 'success');
        setTimeout(() => { loadResources(); loadDashboardData(); }, 300);
      } else {
        const errorMsg = data.error || 'Unknown error';
        console.error('[Portal] Failed to delete resource:', errorMsg);
        showNotification('Failed to delete resource: ' + errorMsg, 'error');
        if (deleteBtn && originalText) {
          deleteBtn.disabled = false;
          deleteBtn.textContent = originalText;
        }
      }
    } catch (error) {
      showNotification('Connection error. Please try again.', 'error');
      console.error('[Portal] Delete error:', error);
      if (deleteBtn && originalText) {
        deleteBtn.disabled = false;
        deleteBtn.textContent = originalText;
      }
    }
  };

  const PORTAL_RESOURCE_VOICE_PROFILE_KEY = 'portalResourceVoiceProfileId';

  function getWorkspaceVoiceProfileIdForApi(): string | undefined {
    const sel = document.getElementById('resource-voice-profile-select') as HTMLSelectElement | null;
    const v = sel?.value?.trim();
    return v ? v : undefined;
  }

  function setVoiceProfileSelectMessage(message: string): void {
    const sel = document.getElementById('resource-voice-profile-select') as HTMLSelectElement | null;
    if (!sel) return;
    while (sel.firstChild) sel.removeChild(sel.firstChild);
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = message;
    sel.appendChild(opt);
  }

  function populateWorkspaceVoiceProfileSelect(profiles: any[]): void {
    const sel = document.getElementById('resource-voice-profile-select') as HTMLSelectElement | null;
    if (!sel) return;
    while (sel.firstChild) sel.removeChild(sel.firstChild);
    const auto = document.createElement('option');
    auto.value = '';
    auto.textContent = 'Auto (saved default or library-derived)';
    sel.appendChild(auto);
    for (const p of profiles) {
      if (!p?.id) continue;
      const opt = document.createElement('option');
      opt.value = String(p.id);
      const label = p.name || p.voiceName || p.id;
      opt.textContent = p.isDefault ? `${label} (default)` : label;
      sel.appendChild(opt);
    }
    const stored = localStorage.getItem(PORTAL_RESOURCE_VOICE_PROFILE_KEY) || '';
    const ids = new Set(profiles.map((p: any) => String(p.id)));
    if (stored && ids.has(stored)) {
      sel.value = stored;
    } else {
      const def = profiles.find((p: any) => p.isDefault);
      if (def) sel.value = String(def.id);
      else if (profiles.length > 0) sel.value = String(profiles[0].id);
      else sel.value = '';
    }
    if (sel.value) {
      localStorage.setItem(PORTAL_RESOURCE_VOICE_PROFILE_KEY, sel.value);
    } else {
      localStorage.removeItem(PORTAL_RESOURCE_VOICE_PROFILE_KEY);
    }
  }

  function initWorkspaceVoiceProfileSelect(): void {
    const sel = document.getElementById('resource-voice-profile-select') as HTMLSelectElement | null;
    if (!sel || (sel as unknown as { _voiceProfileBound?: boolean })._voiceProfileBound) return;
    (sel as unknown as { _voiceProfileBound?: boolean })._voiceProfileBound = true;
    sel.addEventListener('change', () => {
      if (sel.value) {
        localStorage.setItem(PORTAL_RESOURCE_VOICE_PROFILE_KEY, sel.value);
      } else {
        localStorage.removeItem(PORTAL_RESOURCE_VOICE_PROFILE_KEY);
      }
    });
  }

  async function ensureWorkspaceVoiceProfiles(): Promise<void> {
    const cached = (window as any).allProfiles as any[] | undefined;
    if (Array.isArray(cached) && cached.length > 0) {
      populateWorkspaceVoiceProfileSelect(cached);
      return;
    }
    if (!hasWorkspaceSession()) return;
    try {
      const response = await workspaceFetch(`${getVoiceApiUrl()}/profiles`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      if (!response.ok) {
        setVoiceProfileSelectMessage('Could not load voice profiles');
        return;
      }
      const data = await response.json();
      if (!data.success || !Array.isArray(data.profiles)) {
        setVoiceProfileSelectMessage('Voice profiles unavailable');
        return;
      }
      (window as any).allProfiles = data.profiles;
      populateWorkspaceVoiceProfileSelect(data.profiles);
    } catch (e) {
      setVoiceProfileSelectMessage('Could not load voice profiles');
      if (import.meta.env.MODE === 'development') {
        console.warn('[Portal] ensureWorkspaceVoiceProfiles:', e);
      }
    }
  }

  function initDocumentWorkspace(): void {
    const dropZone = document.getElementById('document-drop-zone');
    const fileInput = document.getElementById('document-file-input') as HTMLInputElement | null;
    const fileMeta = document.getElementById('document-file-meta');
    const statusDiv = document.getElementById('document-status');
    const tokenHint = document.getElementById('document-token-hint');
    const extractedEl = document.getElementById('document-extracted-text') as HTMLTextAreaElement | null;
    let selectedFile: File | null = null;
    let documentTokenState: {
      balance: number;
      waived: boolean;
      costs: { extractLocal: number; extractVision: number; rewrite: number };
    } | null = null;

    const formatTokenHint = () => {
      if (!tokenHint || !documentTokenState) return;
      const { balance, waived, costs } = documentTokenState;
      if (waived) {
        tokenHint.textContent =
          'Admin workspace — document tools do not deduct tokens for your account.';
        return;
      }
      tokenHint.textContent =
        `Your balance: ${balance} tokens · Extract ${costs.extractLocal} (local) / ${costs.extractVision} (PDF·image OCR) · Rewrite ${costs.rewrite}. Earn tokens via approved contributions.`;
    };

    const refreshDocumentTokenHint = async (balanceOverride?: number) => {
      try {
        const res = await workspaceFetch(`${getVoiceApiUrl()}/documents/costs`);
        const data = await res.json();
        if (res.ok && data.success) {
          documentTokenState = {
            balance: balanceOverride ?? Number(data.balance ?? 0),
            waived: Boolean(data.waived),
            costs: data.costs,
          };
          formatTokenHint();
          const balanceEl = document.getElementById('client-token-balance');
          if (balanceEl && balanceOverride != null) balanceEl.textContent = String(balanceOverride);
        }
      } catch {
        if (tokenHint) tokenHint.textContent = 'Could not load token costs — sign in as editor.';
      }
    };

    const documentApiError = (data: { error?: string; code?: string; tokens?: { required?: number; balance?: number } }) => {
      if (data.code === 'INSUFFICIENT_BALANCE') {
        const need = data.tokens?.required;
        const bal = data.tokens?.balance;
        const detail = need != null && bal != null ? ` Need ${need}, you have ${bal}.` : '';
        return `${data.error || 'Insufficient tokens.'}${detail} Contribute to earn tokens.`;
      }
      return data.error || 'Request failed';
    };

    void refreshDocumentTokenHint();

    const setStatus = (message: string, kind: 'info' | 'success' | 'error' = 'info') => {
      if (!statusDiv) return;
      statusDiv.textContent = message;
      statusDiv.className = kind === 'success' ? 'status-message success' : kind === 'error' ? 'status-message error' : 'status-message';
    };

    const setFile = (file: File) => {
      selectedFile = file;
      if (fileMeta) {
        fileMeta.textContent = `${file.name} (${Math.round(file.size / 1024)} KB)`;
      }
      const titleInput = document.getElementById('document-title-input') as HTMLInputElement | null;
      if (titleInput && !titleInput.value.trim()) {
        titleInput.value = file.name.replace(/\.[^/.]+$/, '');
      }
    };

    dropZone?.addEventListener('click', () => fileInput?.click());
    dropZone?.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput?.click();
      }
    });
    fileInput?.addEventListener('change', () => {
      const f = fileInput.files?.[0];
      if (f) setFile(f);
    });

    for (const evt of ['dragenter', 'dragover'] as const) {
      dropZone?.addEventListener(evt, (e) => {
        e.preventDefault();
        dropZone.classList.add('document-drop-zone--active');
      });
    }
    for (const evt of ['dragleave', 'drop'] as const) {
      dropZone?.addEventListener(evt, (e) => {
        e.preventDefault();
        dropZone.classList.remove('document-drop-zone--active');
      });
    }
    dropZone?.addEventListener('drop', (e) => {
      const f = e.dataTransfer?.files?.[0];
      if (f) setFile(f);
    });

    document.getElementById('document-extract-btn')?.addEventListener('click', async () => {
      if (!selectedFile) {
        setStatus('Choose or drop a file first.', 'error');
        showNotification('Choose or drop a file first.', 'warning');
        return;
      }
      if (selectedFile.size > 12 * 1024 * 1024) {
        setStatus('File exceeds 12MB limit.', 'error');
        return;
      }
      setStatus('Extracting text (local parse or NVIDIA vision OCR)…');
      const btn = document.getElementById('document-extract-btn') as HTMLButtonElement | null;
      if (btn) btn.disabled = true;
      try {
        const fd = new FormData();
        fd.append('file', selectedFile);
        const res = await workspaceFetch(`${getVoiceApiUrl()}/documents/extract`, { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(documentApiError(data));
        }
        const ex = data.extraction;
        if (extractedEl) extractedEl.value = ex.text || '';
        const methodHint = ex.method ? ` (${ex.method}${ex.visionModelId ? ` · ${ex.visionModelId}` : ''})` : '';
        const spent = data.tokens?.spent ? ` · ${data.tokens.spent} token(s) spent` : '';
        setStatus(`Extracted ${ex.charCount ?? 0} characters${methodHint}${spent}.`, 'success');
        showNotification('Document text extracted.', 'success');
        if (typeof data.tokens?.balance === 'number') await refreshDocumentTokenHint(data.tokens.balance);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Extraction failed';
        setStatus(msg, 'error');
        showNotification(msg, 'error');
      } finally {
        if (btn) btn.disabled = false;
      }
    });

    document.getElementById('document-rewrite-btn')?.addEventListener('click', async () => {
      const content = extractedEl?.value?.trim() || '';
      if (content.length < 32) {
        setStatus('Extract or paste at least 32 characters before rewriting.', 'error');
        return;
      }
      setStatus('Rewriting in voice profile (structure preserved)…');
      const btn = document.getElementById('document-rewrite-btn') as HTMLButtonElement | null;
      if (btn) btn.disabled = true;
      try {
        const title = (document.getElementById('document-title-input') as HTMLInputElement | null)?.value.trim();
        const profileId = getWorkspaceVoiceProfileIdForApi();
        const res = await workspaceFetch(`${getVoiceApiUrl()}/documents/rewrite`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content,
            title: title || undefined,
            profileId: profileId || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(documentApiError(data));
        }
        if (extractedEl) extractedEl.value = data.rewritten?.content || content;
        const score = data.rewritten?.voiceScore ? Math.round(data.rewritten.voiceScore * 100) : null;
        const mode = data.rewritten?.inference?.mode || '';
        const spent = data.tokens?.spent ? ` · ${data.tokens.spent} token(s) spent` : '';
        setStatus(`Rewrite complete${mode ? ` via ${mode}` : ''}${score != null ? ` · voice ${score}%` : ''}${spent}.`, 'success');
        showNotification('Document rewritten in voice profile.', 'success');
        if (typeof data.tokens?.balance === 'number') await refreshDocumentTokenHint(data.tokens.balance);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Rewrite failed';
        setStatus(msg, 'error');
        showNotification(msg, 'error');
      } finally {
        if (btn) btn.disabled = false;
      }
    });

    document.getElementById('document-create-resource-btn')?.addEventListener('click', async () => {
      const content = extractedEl?.value?.trim() || '';
      const industry = (document.getElementById('document-industry') as HTMLSelectElement | null)?.value;
      const topic = (document.getElementById('document-topic') as HTMLInputElement | null)?.value.trim();
      if (!content || content.length < 32) {
        setStatus('Extract or rewrite document text first (min 32 characters).', 'error');
        return;
      }
      if (!industry || !topic) {
        setStatus('Industry and topic are required to create a resource.', 'error');
        return;
      }
      setStatus('Creating resource…');
      const btn = document.getElementById('document-create-resource-btn') as HTMLButtonElement | null;
      if (btn) btn.disabled = true;
      try {
        const title = (document.getElementById('document-title-input') as HTMLInputElement | null)?.value.trim();
        const profileId = getWorkspaceVoiceProfileIdForApi();
        const res = await workspaceFetch(`${getVoiceApiUrl()}/resources/process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content,
            industry,
            topic,
            title: title || undefined,
            autoPublish: (document.getElementById('document-auto-publish') as HTMLInputElement | null)?.checked === true,
            skipEnhance: true,
            profileId: profileId || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(documentApiError(data));
        }
        setStatus(`Resource created: ${data.resource?.title || topic}.`, 'success');
        showNotification('Resource created from document.', 'success');
        setTimeout(() => {
          loadResources();
          loadDashboardData();
        }, 400);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Create resource failed';
        setStatus(msg, 'error');
        showNotification(msg, 'error');
      } finally {
        if (btn) btn.disabled = false;
      }
    });
  }

  initDocumentWorkspace();

  // Upload Resource Handler
  document.getElementById('upload-resource-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const statusDiv = document.getElementById('upload-status');
    const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
    
    if (statusDiv) {
      statusDiv.textContent = 'Uploading and processing resource...';
      statusDiv.className = 'status-message';
    }
    
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Uploading...';
    }

    try {
      const fileInput = document.getElementById('upload-file') as HTMLInputElement;
      if (!fileInput?.files?.[0]) {
        if (statusDiv) {
          statusDiv.textContent = 'Please select a file to upload.';
          statusDiv.className = 'status-message error';
        }
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Upload & Process Resource';
        }
        showNotification('Please select a file to upload.', 'warning');
        return;
      }

      // Validate file size (max 12MB — matches edge extract limit)
      const file = fileInput.files[0];
      const maxSize = 12 * 1024 * 1024;
      if (file.size > maxSize) {
        if (statusDiv) {
          statusDiv.textContent = 'File size exceeds 12MB limit.';
          statusDiv.className = 'status-message error';
        }
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Upload & Process Resource';
        }
        showNotification('File size exceeds 12MB limit.', 'error');
        return;
      }

      const uploadFormData = new FormData();
      uploadFormData.append('file', fileInput.files[0]);
      uploadFormData.append('industry', (document.getElementById('upload-industry') as HTMLSelectElement)!.value);
      uploadFormData.append('topic', (document.getElementById('upload-topic') as HTMLInputElement)!.value);
      const title = (document.getElementById('upload-title') as HTMLInputElement)?.value;
      if (title) uploadFormData.append('title', title);
      uploadFormData.append('autoProcess', (document.getElementById('upload-auto-process') as HTMLInputElement)?.checked ? 'true' : 'false');
      uploadFormData.append('autoPublish', (document.getElementById('upload-auto-publish') as HTMLInputElement)?.checked ? 'true' : 'false');
      if ((document.getElementById('upload-preserve-structure') as HTMLInputElement)?.checked) {
        uploadFormData.append('preserveStructure', 'true');
      }
      const uploadProfileId = getWorkspaceVoiceProfileIdForApi();
      if (uploadProfileId) uploadFormData.append('profileId', uploadProfileId);

      const response = await workspaceFetch(`${getVoiceApiUrl()}/resources/upload`, {
        method: 'POST',
        headers: {
        },
        body: uploadFormData
      });

      // Handle response - check content type before parsing JSON
      let data: any;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch (parseError) {
          const text = await response.text();
          throw new Error(`Invalid JSON response: ${text.substring(0, 200)}`);
        }
      } else {
        const text = await response.text();
        throw new Error(`Unexpected response format (${contentType || 'unknown'}): ${text.substring(0, 200)}`);
      }

      if (response.ok && data.success) {
          const voiceScore = data.voiceValidation?.score || 0;
          const scoreText = voiceScore ? ` Voice score: ${Math.round(voiceScore * 100)}%` : '';
        const inferenceMode = data.inference?.mode ? ` via ${data.inference.mode}` : '';
        const modelHint = data.inference?.modelId ? ` (${data.inference.modelId})` : '';
        const updateText = data.updated ? ' (updated existing resource, duplicate prevented)' : '';
        const message = `Resource ${data.updated ? 'updated' : 'uploaded'}${inferenceMode}${modelHint}.${updateText}${scoreText}`;
        
        if (statusDiv) {
          statusDiv.textContent = message;
          statusDiv.className = 'status-message success';
        }
        showNotification(message, 'success');
        form.reset();
        // Refresh resources list and dashboard after a short delay to ensure server has saved
        setTimeout(() => {
          if (import.meta.env.MODE === 'development') {
            console.log('[Portal] Refreshing resources after upload');
          }
          loadResources();
          loadDashboardData();
        }, 500);
      } else {
        const errorMsg = data.code === 'INSUFFICIENT_BALANCE'
          ? `${data.error || 'Insufficient tokens.'}${data.tokens?.required != null ? ` Need ${data.tokens.required}, you have ${data.tokens.balance ?? 0}.` : ''}`
          : (data.error || `Upload failed (${response.status} ${response.statusText})`);
        if (statusDiv) {
          statusDiv.textContent = errorMsg;
          statusDiv.className = 'status-message error';
        }
        showNotification('Upload failed: ' + errorMsg, 'error');
        if (import.meta.env.MODE === 'development') {
          console.error('[Portal] Resource upload failed:', data);
        }
      }
    } catch (error) {
      let errorMsg = 'Connection error. Please try again.';
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMsg = 'Network error. Please check your connection and try again.';
      } else if (error instanceof Error) {
        errorMsg = error.message;
        // Provide user-friendly messages for common errors
        if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
          errorMsg = 'Unable to connect to server. Please check your connection.';
        } else if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
          errorMsg = 'Authentication failed. Please log in again.';
        } else if (errorMsg.includes('403') || errorMsg.includes('Forbidden')) {
          errorMsg = 'You do not have permission to upload resources.';
        } else if (errorMsg.includes('413') || errorMsg.includes('Payload Too Large')) {
          errorMsg = 'File is too large. Maximum size is 12MB.';
        }
      }
      
      if (statusDiv) {
        statusDiv.textContent = errorMsg;
        statusDiv.className = 'status-message error';
      }
      showNotification('Upload failed: ' + errorMsg, 'error');
      
      if (import.meta.env.MODE === 'development') {
        console.error('[Portal] Resource upload error:', error);
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Upload & Process Resource';
      }
    }
  });

  // Create from content (process API - no file)
  document.getElementById('create-from-content-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const statusDiv = document.getElementById('process-status');
    const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Processing...';
    }
    if (statusDiv) {
      statusDiv.textContent = 'Processing content...';
      statusDiv.className = 'status-message';
    }
    try {
      const content = (document.getElementById('process-content') as HTMLTextAreaElement)?.value;
      const industry = (document.getElementById('process-industry') as HTMLSelectElement)?.value;
      const topic = (document.getElementById('process-topic') as HTMLInputElement)?.value;
      const title = (document.getElementById('process-title') as HTMLInputElement)?.value;
      const autoPublish = (document.getElementById('process-auto-publish') as HTMLInputElement)?.checked ?? false;
      if (!content || !industry || !topic) {
        if (statusDiv) { statusDiv.textContent = 'Content, industry, and topic are required.'; statusDiv.className = 'status-message error'; }
        showNotification('Content, industry, and topic are required.', 'error');
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Process & Create Resource'; }
        return;
      }
      const response = await workspaceFetch(`${getVoiceApiUrl()}/resources/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          industry,
          topic,
          title: title || undefined,
          autoPublish,
          profileId: getWorkspaceVoiceProfileIdForApi()
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        const voiceScore = data.voiceValidation?.score ?? 0;
        const scoreText = voiceScore ? ` Voice score: ${Math.round(voiceScore * 100)}%` : '';
        const inferenceMode = data.inference?.mode ? ` via ${data.inference.mode}` : '';
        const modelHint = data.inference?.modelId ? ` (${data.inference.modelId})` : '';
        const message = `Resource created from content${inferenceMode}${modelHint}.${scoreText}`;
        if (statusDiv) { statusDiv.textContent = message; statusDiv.className = 'status-message success'; }
        showNotification(message, 'success');
        form.reset();
        setTimeout(() => { loadResources(); loadDashboardData(); }, 500);
      } else {
        const errorMsg = data.error || 'Processing failed';
        if (statusDiv) { statusDiv.textContent = errorMsg; statusDiv.className = 'status-message error'; }
        showNotification('Create from content failed: ' + errorMsg, 'error');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Connection error. Please try again.';
      if (statusDiv) { statusDiv.textContent = errorMsg; statusDiv.className = 'status-message error'; }
      showNotification('Create from content failed: ' + errorMsg, 'error');
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Process & Create Resource'; }
    }
  });

  // Bulk Operations
  function updateBulkActions(): void {
    const checkboxes = document.querySelectorAll('.resource-checkbox:checked') as NodeListOf<HTMLInputElement>;
    const bulkActions = document.getElementById('bulk-actions');
    const countSpan = document.getElementById('bulk-selected-count');
    
    if (bulkActions && countSpan) {
      if (checkboxes.length > 0) {
        bulkActions.classList.remove('hidden');
        countSpan.textContent = `${checkboxes.length} selected`;
      } else {
        bulkActions.classList.add('hidden');
      }
    }
  }

  function getSelectedResourceIds(): string[] {
    const checkboxes = document.querySelectorAll('.resource-checkbox:checked') as NodeListOf<HTMLInputElement>;
    return Array.from(checkboxes).map(cb => cb.dataset.resourceId || '').filter(id => id);
  }

  function clearSelection(): void {
    const checkboxes = document.querySelectorAll('.resource-checkbox') as NodeListOf<HTMLInputElement>;
    checkboxes.forEach(cb => cb.checked = false);
    updateBulkActions();
  }

  (window as any).updateBulkActions = updateBulkActions;
  (window as any).clearSelection = clearSelection;

  (window as any).bulkPublish = async () => {
    const ids = getSelectedResourceIds();
    if (ids.length === 0) return;
    if (!confirm(`Publish ${ids.length} resource(s)?`)) return;
    
    try {
      const results = await Promise.all(ids.map(id => 
        workspaceFetch(`${getVoiceApiUrl()}/resources/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'published' })
        }).then(r => r.json())
      ));
      const successCount = results.filter((r: any) => r.success).length;
      const failCount = results.length - successCount;
      
      if (failCount > 0) {
        showNotification(`Published ${successCount} resource(s). ${failCount} failed.`, 'warning');
      } else {
        showNotification(`Successfully published ${successCount} resource(s).`, 'success');
      }
      
      console.log('[Portal] Bulk publish results:', results);
      clearSelection();
      setTimeout(() => loadResources(), 300);
    } catch (error) {
      showNotification('Error publishing resources. Please try again.', 'error');
      console.error('[Portal] Bulk publish error:', error);
    }
  };

  (window as any).bulkUnpublish = async () => {
    const ids = getSelectedResourceIds();
    if (ids.length === 0) return;
    if (!confirm(`Unpublish ${ids.length} resource(s)?`)) return;
    
    try {
      const results = await Promise.all(ids.map(id => 
        workspaceFetch(`${getVoiceApiUrl()}/resources/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'draft' })
        }).then(r => r.json())
      ));
      const successCount = results.filter((r: any) => r.success).length;
      const failCount = results.length - successCount;
      
      if (failCount > 0) {
        showNotification(`Unpublished ${successCount} resource(s). ${failCount} failed.`, 'warning');
      } else {
        showNotification(`Successfully unpublished ${successCount} resource(s).`, 'success');
      }
      
      console.log('[Portal] Bulk unpublish results:', results);
      clearSelection();
      setTimeout(() => loadResources(), 300);
    } catch (error) {
      showNotification('Error unpublishing resources. Please try again.', 'error');
      console.error('[Portal] Bulk unpublish error:', error);
    }
  };

  (window as any).bulkDelete = async () => {
    const ids = getSelectedResourceIds();
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} resource(s)? This cannot be undone.`)) return;
    
    try {
      const results = await Promise.all(ids.map(id => 
        workspaceFetch(`${getVoiceApiUrl()}/resources/${id}`, {
          method: 'DELETE',
          headers: {
          }
        }).then(r => r.json())
      ));
      const successCount = results.filter((r: any) => r.success).length;
      const failCount = results.length - successCount;
      
      if (failCount > 0) {
        showNotification(`Deleted ${successCount} resource(s). ${failCount} failed.`, 'warning');
      } else {
        showNotification(`Successfully deleted ${successCount} resource(s).`, 'success');
      }
      
      console.log('[Portal] Bulk delete results:', results);
      clearSelection();
      setTimeout(() => loadResources(), 300);
    } catch (error) {
      showNotification('Error deleting resources. Please try again.', 'error');
      console.error('[Portal] Bulk delete error:', error);
    }
  };

  (window as any).previewResource = (id: string) => {
    const resource = currentResources.find((r: any) => r.id === id);
    if (!resource) {
      showNotification('Resource not found.', 'error');
      return;
    }
    
    // Create a preview modal instead of new window
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.setAttribute('aria-hidden', 'false');
    
    const voiceScore = resource.metadata?.voiceScore || 0;
    const voiceScoreClass = voiceScore >= 0.8 ? 'voice-score-high' : voiceScore >= 0.6 ? 'voice-score-medium' : 'voice-score-low';
    const voiceScoreText = voiceScore ? `${Math.round(voiceScore * 100)}%` : 'N/A';
    
    modal.innerHTML = `
      <div class="modal-overlay" onclick="this.closest('.modal').remove(); document.body.style.overflow = '';"></div>
      <div class="modal-content modal-large">
        <div class="modal-header">
          <h2>Preview: ${escapeHtml(resource.title)}</h2>
          <button class="modal-close" onclick="this.closest('.modal').remove(); document.body.style.overflow = '';" aria-label="Close modal">&times;</button>
          </div>
        <div class="modal-body">
          <div style="margin-bottom: var(--space-lg);">
            <div style="display: flex; gap: var(--space-md); flex-wrap: wrap; margin-bottom: var(--space-md);">
              <span class="badge badge-${resource.status}">${resource.status}</span>
              <span class="voice-score ${voiceScoreClass}">
                <svg class="voice-score-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                Voice Score: ${voiceScoreText}
              </span>
            </div>
            <div style="color: var(--text-secondary); font-size: var(--text-sm);">
              <p><strong>Industry:</strong> ${escapeHtml(resource.industry)}</p>
              <p><strong>Topic:</strong> ${escapeHtml(resource.topic)}</p>
              <p><strong>Version:</strong> ${resource.version}</p>
            </div>
          </div>
          <div>
            <h3 style="margin-bottom: var(--space-md);">Content</h3>
            <div style="line-height: 1.8; color: var(--text-primary); white-space: pre-wrap; background: var(--bg-accent); padding: var(--space-lg); border-radius: var(--border-radius); max-height: 60vh; overflow-y: auto; font-family: system-ui, sans-serif;">${escapeHtml(resource.content)}</div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="this.closest('.modal').remove(); document.body.style.overflow = '';">Close</button>
          <button class="btn btn-primary" onclick="this.closest('.modal').remove(); document.body.style.overflow = ''; editResource('${escapeHtml(id)}');">Edit</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
  };

  // Deduplicate Resources Handler
  document.getElementById('deduplicate-resources-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('deduplicate-resources-btn') as HTMLButtonElement;
    if (!btn) return;
    
    if (!confirm('This will remove duplicate resources (same industry + topic). The best version of each will be kept. Continue?')) {
      return;
    }
    
    btn.disabled = true;
    btn.textContent = 'Deduplicating...';
    
    try {
      const response = await workspaceFetch(`${getVoiceApiUrl()}/resources/deduplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        const message = data.resourcesRemoved > 0
          ? `Removed ${data.resourcesRemoved} duplicate resource(s)! Kept: ${data.totalResources} unique resources.`
          : 'No duplicates found. All resources are unique.';
        showNotification(message, data.resourcesRemoved > 0 ? 'success' : 'info');
        console.log('[Portal] Deduplication result:', data);
        setTimeout(() => { loadResources(); loadDashboardData(); }, 500);
      } else {
        const errorMsg = data.error || 'Unknown error';
        showNotification('Failed to deduplicate resources: ' + errorMsg, 'error');
        console.error('[Portal] Deduplication failed:', data);
      }
    } catch (error) {
      showNotification('Connection error. Please try again.', 'error');
      console.error('[Portal] Deduplication error:', error);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Remove Duplicates';
    }
  });

  // Seed Resources Handler
  document.getElementById('seed-resources-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('seed-resources-btn') as HTMLButtonElement;
    if (!btn) return;
    
    if (!confirm('This will create initial resources from all industries and topics. Continue?')) {
      return;
    }
    
    btn.disabled = true;
    btn.textContent = 'Seeding...';
    
    try {
      const response = await workspaceFetch(`${getVoiceApiUrl()}/resources/seed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        const message = `Successfully seeded ${data.created} resource(s)! Skipped: ${data.skipped}. Total: ${data.total}. These resources are in "draft" status.`;
        showNotification(message, 'success');
        console.log('[Portal] Seeded resources:', data);
        setTimeout(() => { loadResources(); loadDashboardData(); }, 500);
      } else {
        const errorMsg = data.error || 'Unknown error';
        showNotification('Failed to seed resources: ' + errorMsg, 'error');
        console.error('[Portal] Seed failed:', data);
      }
    } catch (error) {
      showNotification('Connection error. Please try again.', 'error');
      console.error('[Portal] Seed error:', error);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Seed Resources';
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
  async function createBaseProfile(): Promise<void> {
    const btn = document.getElementById('create-base-profile-btn') as HTMLButtonElement;
    if (!btn) return;
    
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<div class="loading-spinner" style="width: 16px; height: 16px; margin-right: 8px;"></div> Building BIGPONS from resources...';
    
    try {
      const industryEl = document.getElementById('bigpons-industry-filter') as HTMLSelectElement | null;
      const industry = industryEl?.value?.trim() || undefined;
      const body = industry ? { industry } : {};

      const response = await workspaceFetch(`${getVoiceApiUrl()}/profiles/create-base`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const n = data.combinedSourcesCount ?? 0;
        showNotification(
          `${data.message || 'BIGPONS updated.'} (${n} resources: ${data.starterBlocksCount ?? 0} starters, ${data.publishedResourcesCount ?? 0} published).`,
          'success'
        );
        setTimeout(() => {
          loadProfiles();
          void ensureWorkspaceVoiceProfiles();
        }, 500);
      } else {
        showNotification(`BIGPONS build failed: ${data.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Connection error';
      showNotification(`BIGPONS build failed: ${errorMsg}`, 'error');
      console.error('[Portal] BIGPONS profile build error:', error);
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }

  function formatInferenceBadge(metadata: Record<string, unknown> | undefined): string {
    const mode = metadata?.inferenceMode as string | undefined;
    if (!mode) return '';
    const model = metadata?.inferenceModelId as string | null | undefined;
    let label = mode;
    if (model && model !== 'voice-framework-template') {
      const short = String(model).includes('/') ? String(model).split('/').pop() : model;
      label = `${mode} · ${short}`;
    }
    return `<span class="badge badge-draft inference-badge" title="Last inference: ${escapeHtml(label)}">${escapeHtml(label)}</span>`;
  }

  (window as any).useProfileForGenerate = function(profileId: string): void {
    if (profileId === 'default') {
      showNotification('Bundled default is used via Auto. Build BIGPONS or pick a saved profile.', 'info');
      return;
    }
    const sel = document.getElementById('resource-voice-profile-select') as HTMLSelectElement | null;
    if (sel) sel.value = profileId;
    navigateToPanel('resources');
    setTimeout(() => {
      const genSection = document.getElementById('generate-resource-content');
      const genToggle = document.querySelector('[aria-controls="generate-resource-content"]') as HTMLButtonElement | null;
      if (genSection) genSection.style.display = '';
      if (genToggle) genToggle.setAttribute('aria-expanded', 'true');
      genSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      showNotification('Voice profile selected for Generate.', 'success');
    }, 200);
  };

  // Profile card rendering (shared by loadProfiles + filterProfiles)
  function renderProfileToneChips(characteristics: Record<string, unknown> | null | undefined): string {
    const tone = characteristics?.tone as Record<string, string> | undefined;
    if (!tone) {
      return '<span class="profile-tone-chip profile-tone-chip--muted">Tone pending</span>';
    }
    const chips: string[] = [];
    if (tone.formality) chips.push(`formality: ${tone.formality}`);
    if (tone.technicality) chips.push(`technicality: ${tone.technicality}`);
    if (tone.precision) chips.push(`precision: ${tone.precision}`);
    if (chips.length === 0) {
      return '<span class="profile-tone-chip profile-tone-chip--muted">Tone pending</span>';
    }
    return chips.map((c) => `<span class="profile-tone-chip">${escapeHtml(c)}</span>`).join('');
  }

  function renderProfileCardV1(profile: Record<string, unknown>): string {
    const isDefault = Boolean(profile.isDefault);
    const isArchived = Boolean(profile.archived);
    const cardClass =
      'profile-card-v1' + (isArchived ? ' archived' : '') + (isDefault ? ' active' : '');
    const badgeClass = isDefault ? 'badge-published' : isArchived ? 'badge-archived' : 'badge-draft';
    const badgeText = isDefault ? 'Default' : isArchived ? 'Archived' : 'Active';
    const stats = (profile.stats as Record<string, unknown>) || {};
    const avgScore =
      typeof stats.avgVoiceScore === 'number'
        ? `${Math.round(stats.avgVoiceScore * 100)}%`
        : '—';
    const corpusCount =
      stats.corpusResourceCount ??
      (Array.isArray(profile.corpusResourceIds) ? profile.corpusResourceIds.length : 0);
    const linkedCount = stats.linkedResourceCount ?? 0;
    const desc = typeof profile.description === 'string' ? profile.description : '';
    const pid = escapeHtml(String(profile.id));

    return (
      `<article class="${cardClass}" data-profile-id="${pid}" data-archived="${isArchived}" role="button" tabindex="0" aria-label="Voice profile ${escapeHtml(String(profile.name || 'Unnamed'))}" onclick="selectProfile('${pid}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();selectProfile('${pid}');}">` +
      `<div class="profile-card-v1__header">` +
      `<div><h3 class="profile-card-v1__title">${escapeHtml(String(profile.name || 'Unnamed Profile'))}</h3>` +
      `<p class="profile-card-v1__voice">${escapeHtml(String(profile.voiceName || 'Voice'))}</p></div>` +
      `<span class="profile-item-badge ${badgeClass}">${badgeText}</span>` +
      `</div>` +
      (desc ? `<p class="profile-card-v1__desc">${escapeHtml(desc)}</p>` : '') +
      `<div class="profile-card-v1__tone">${renderProfileToneChips(profile.characteristics as Record<string, unknown>)}</div>` +
      `<div class="profile-card-v1__stats">` +
      `<div class="profile-card-v1__stat"><span class="profile-card-v1__stat-label">Corpus</span><span class="profile-card-v1__stat-value">${corpusCount}</span></div>` +
      `<div class="profile-card-v1__stat"><span class="profile-card-v1__stat-label">Linked</span><span class="profile-card-v1__stat-value">${linkedCount}</span></div>` +
      `<div class="profile-card-v1__stat"><span class="profile-card-v1__stat-label">Avg voice</span><span class="profile-card-v1__stat-value">${avgScore}</span></div>` +
      `</div>` +
      `<div class="profile-card-v1__footer">` +
      (profile.id !== 'default' && !isDefault
        ? `<button type="button" class="btn btn-success btn-sm" onclick="event.stopPropagation(); setDefaultProfile('${pid}', true)">Set default</button> `
        : '') +
      `<button type="button" class="btn btn-primary btn-sm" onclick="event.stopPropagation(); useProfileForGenerate('${pid}')">Generate with</button> ` +
      `<button type="button" class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); viewProfile('${pid}')">View details</button>` +
      `</div>` +
      `</article>`
    );
  }

  function renderProfileCardsGrid(profiles: Record<string, unknown>[]): void {
    const listDiv = document.getElementById('profiles-list');
    if (!listDiv) return;
    listDiv.className = 'profiles-list profile-cards-grid';
    listDiv.innerHTML = profiles.map((profile) => renderProfileCardV1(profile)).join('');
  }

  // Load Voice Profiles
  async function loadProfiles(): Promise<void> {
    const listDiv = document.getElementById('profiles-list');
    if (!listDiv) {
      console.error('[Portal] Profiles list element not found');
      return;
    }

    // Show loading state with animation
    listDiv.innerHTML = `
      <div class="loading-message" style="animation: fadeIn 0.3s ease;">
        <div style="display: flex; flex-direction: column; align-items: center; gap: var(--space-md);">
          <div class="loading-spinner"></div>
          <p style="color: var(--portal-text-secondary);">Loading profiles...</p>
        </div>
      </div>
    `;

    try {
      if (isDev) {
        console.log('[Portal] Fetching profiles from:', `${getVoiceApiUrl()}/profiles`);
      }
      
      const response = await workspaceFetch(`${getVoiceApiUrl()}/profiles`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Include cookies for session auth
      });

      if (isDev) {
        console.log('[Portal] Profiles response status:', response.status);
        console.log('[Portal] Profiles response headers:', Object.fromEntries(response.headers.entries()));
      }

      if (!response.ok) {
        let errorMessage = `Failed to load profiles (${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // Ignore JSON parse errors
        }
        
        listDiv.innerHTML = `
          <div class="loading-message" style="color: var(--error-color, #dc3545);">
            <p><strong>Error loading profiles:</strong> ${escapeHtml(errorMessage)}</p>
            <button class="btn btn-secondary" onclick="loadProfiles()" style="margin-top: var(--space-md);">Retry</button>
          </div>
        `;
        return;
      }

      const data = await response.json();
      console.log('[Portal] Received profiles data:', { success: data.success, count: data.profiles?.length || 0 });

      if (!data.success) {
        listDiv.innerHTML = `
          <div class="loading-message" style="color: var(--error-color, #dc3545); padding: var(--space-3xl);">
            <div style="display: flex; flex-direction: column; align-items: center; gap: var(--space-lg);">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity: 0.5;">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <div style="text-align: center;">
                <p style="font-size: var(--text-lg); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-sm);">Failed to load profiles</p>
                <p style="color: var(--text-secondary); font-size: var(--text-sm); margin-bottom: var(--space-md);">${escapeHtml(data.error || 'Unknown error')}</p>
                <button class="btn btn-primary" onclick="loadProfiles()">Retry</button>
              </div>
            </div>
          </div>
        `;
        return;
      }

      const profiles = Array.isArray(data.profiles) ? data.profiles : [];
      (window as any).allProfiles = profiles;
      populateWorkspaceVoiceProfileSelect(profiles);

      if (profiles.length === 0) {
        listDiv.innerHTML = `
          <div class="loading-message" style="padding: var(--space-3xl);">
            <div style="display: flex; flex-direction: column; align-items: center; gap: var(--space-lg);">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity: 0.3;">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"></path>
              </svg>
              <div style="text-align: center;">
                <p style="font-size: var(--text-lg); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-sm);">No saved profiles yet</p>
                <p style="color: var(--text-secondary); font-size: var(--text-sm); margin-bottom: var(--space-md); max-width: 32rem;">
                  The server still resolves voice automatically (bundled default or library-derived) for resource pipelines. Create a <strong>base profile</strong> from starter resources to persist a voice you can pick in Resources, or continue with Auto in the voice profile dropdown there.
                </p>
                <button type="button" class="btn btn-primary" onclick="createBaseProfile()">Build BIGPONS from resources</button>
              </div>
            </div>
          </div>
        `;
        return;
      }

      // Profile cards v1 grid
      renderProfileCardsGrid(profiles);

      (window as any).selectProfile = function(profileId: string) {
        document.querySelectorAll('.profile-card-v1, .profile-item').forEach((item) => {
          item.classList.remove('active');
        });
        const selectedItem = document.querySelector(`[data-profile-id="${CSS.escape(profileId)}"]`);
        if (selectedItem) {
          selectedItem.classList.add('active');
          viewProfile(profileId);
        }
      };

      return;
    } catch (error) {
      console.error('[Portal] Error loading profiles:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      listDiv.innerHTML = `
        <div class="loading-message" style="color: var(--error-color, #dc3545);">
          <p><strong>Connection error:</strong> ${escapeHtml(errorMessage)}</p>
          <button class="btn btn-secondary" onclick="loadProfiles()" style="margin-top: var(--space-md);">Retry</button>
        </div>
      `;
    }
  }

  // View Default Profile
  document.getElementById('view-default-profile')?.addEventListener('click', async () => {
    try {
      const response = await workspaceFetch(`${getVoiceApiUrl()}/profiles/default`, {
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.profile) {
          const profile = data.profile;
          // Create a modal for default profile
          const modal = document.createElement('div');
          modal.className = 'modal';
          modal.setAttribute('aria-hidden', 'false');
          modal.innerHTML = `
            <div class="modal-overlay" onclick="this.closest('.modal').remove(); document.body.style.overflow = '';"></div>
            <div class="modal-content">
              <div class="modal-header">
                <h2>Default Voice Profile</h2>
                <button class="modal-close" onclick="this.closest('.modal').remove(); document.body.style.overflow = '';" aria-label="Close modal">&times;</button>
              </div>
              <div class="modal-body">
                <div style="margin-bottom: var(--space-lg);">
                  <h3 style="margin-bottom: var(--space-sm);">${escapeHtml(profile.name || profile.voiceName || 'N/A')}</h3>
                  <div style="color: var(--text-secondary); font-size: var(--text-sm);">
                    <p><strong>Version:</strong> ${escapeHtml(profile.version || 'N/A')}</p>
                    <p><strong>ID:</strong> ${escapeHtml(profile.id || 'N/A')}</p>
                  </div>
                </div>
                <div>
                  <h3 style="margin-bottom: var(--space-sm);">Characteristics</h3>
                  <div style="color: var(--text-secondary); font-size: var(--text-sm);">
                    <p><strong>Formality:</strong> ${escapeHtml(profile.characteristics?.tone?.formality || 'N/A')}</p>
                    <p><strong>Technicality:</strong> ${escapeHtml(profile.characteristics?.tone?.technicality || 'N/A')}</p>
                    <p><strong>Precision:</strong> ${escapeHtml(profile.characteristics?.tone?.precision || 'N/A')}</p>
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove(); document.body.style.overflow = '';">Close</button>
              </div>
            </div>
          `;
          document.body.appendChild(modal);
          document.body.style.overflow = 'hidden';
        } else {
          showNotification('No default profile found.', 'info');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        showNotification('Failed to load default profile: ' + (errorData.error || 'Unknown error'), 'error');
      }
    } catch (error) {
      showNotification('Connection error. Please try again.', 'error');
      console.error('[Portal] Error loading default profile:', error);
    }
  });

  // Load Analytics (synced with dashboard)
  async function loadAnalytics(): Promise<void> {
    try {
      console.log('[Portal] Loading analytics...');
      
      // Use current resources if available (synced with dashboard), otherwise fetch
      let resources = currentResources || [];
      
      if (resources.length === 0) {
        // Reload resources to ensure we have the latest data
        const statusFilter = (document.getElementById('status-filter') as HTMLSelectElement)?.value;
        let url = `${getVoiceApiUrl()}/resources`;
        const params = new URLSearchParams();
        if (statusFilter) params.append('status', statusFilter);
        if (params.toString()) url += '?' + params.toString();

        const response = await workspaceFetch(url, {
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          console.error('[Portal] Failed to load resources for analytics:', response.status);
          updateAnalyticsDisplay([]);
          return;
        }

        const data = await response.json();
        resources = Array.isArray(data.resources) ? data.resources : [];
        
        // Store for future use and sync with dashboard
        currentResources = resources;
      }
      
      updateAnalyticsDisplay(resources);
      loadAnalyticsSuggestions();
      loadAdminMeta();
    } catch (error) {
      console.error('[Portal] Error loading analytics:', error);
      // Fallback to current resources if available
      const resources = currentResources || [];
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

  // Profile Visualization Functions
  function renderProfileRingPreview(profileId: string, characteristics: any) {
    const container = document.querySelector(`.profile-ring-preview[data-profile-id="${profileId}"]`);
    if (!container || !characteristics) return;

    const tone = characteristics.tone || {};
    const toneValues = {
      formality: getToneValue(tone.formality),
      technicality: getToneValue(tone.technicality),
      accessibility: getToneValue(tone.accessibility),
      precision: getToneValue(tone.precision),
      comprehensiveness: getToneValue(tone.comprehensiveness)
    };

    const svg = `
      <svg width="200" height="200" viewBox="0 0 200 200" style="max-width: 100%;">
        <circle cx="100" cy="100" r="80" fill="none" stroke="var(--border-light)" stroke-width="2"/>
        ${Object.entries(toneValues).map(([key, value], i) => {
          const angle = (i * 2 * Math.PI) / Object.keys(toneValues).length - Math.PI / 2;
          const radius = 60 + (value * 20);
          const x = 100 + radius * Math.cos(angle);
          const y = 100 + radius * Math.sin(angle);
          const nextAngle = ((i + 1) * 2 * Math.PI) / Object.keys(toneValues).length - Math.PI / 2;
          const nextRadius = 60 + (toneValues[Object.keys(toneValues)[(i + 1) % Object.keys(toneValues).length]] * 20);
          const nextX = 100 + nextRadius * Math.cos(nextAngle);
          const nextY = 100 + nextRadius * Math.sin(nextAngle);
          
          return `
            <line x1="100" y1="100" x2="${x}" y2="${y}" stroke="var(--primary-color)" stroke-width="2" opacity="0.6"/>
            <circle cx="${x}" cy="${y}" r="4" fill="var(--primary-color)"/>
            <text x="${x + 8}" y="${y + 4}" font-size="10" fill="var(--text-secondary)">${key.substring(0, 4)}</text>
          `;
        }).join('')}
        <polygon points="${Object.entries(toneValues).map(([key, value], i) => {
          const angle = (i * 2 * Math.PI) / Object.keys(toneValues).length - Math.PI / 2;
          const radius = 60 + (value * 20);
          const x = 100 + radius * Math.cos(angle);
          const y = 100 + radius * Math.sin(angle);
          return `${x},${y}`;
        }).join(' ')}" fill="var(--primary-color)" opacity="0.2" stroke="var(--primary-color)" stroke-width="1"/>
      </svg>
    `;
    
    container.innerHTML = `<div style="text-align: center;"><h4 style="font-size: var(--text-sm); margin-bottom: var(--space-sm);">Tone Profile</h4>${svg}</div>`;
  }

  function getToneValue(value: string): number {
    const mapping: { [key: string]: number } = {
      'low': 0.2,
      'moderate': 0.5,
      'high': 0.75,
      'very_high': 1.0,
      'casual': 0.2,
      'professional': 0.6,
      'formal': 1.0
    };
    return mapping[value] || 0.5;
  }

  function renderProfileVisualizations(profile: any, container: HTMLElement) {
    if (!profile.characteristics) {
      container.innerHTML = `
        <div class="empty-state" style="text-align: center; padding: var(--space-xl); color: var(--text-secondary);">
          <p>No characteristics data available for visualization.</p>
        </div>
      `;
      return;
    }

    const { tone, linguisticPatterns, domainKnowledge, voiceMarkers } = profile.characteristics;
    
    // Show loading state briefly
    container.innerHTML = '<div class="loading-message" style="text-align: center; padding: var(--space-lg);"><div class="loading-spinner" style="margin: 0 auto;"></div><p>Rendering visualizations...</p></div>';
    
    // Render after a brief delay to show loading state
    setTimeout(() => {
    
    // Profile Rings (Circular visualization)
    const ringsHtml = `
      <div class="profile-visualization-section">
        <h3>Profile Rings</h3>
        <div class="profile-rings-container">
          ${renderToneRings(tone)}
          ${renderVocabularyRings(linguisticPatterns?.vocabulary)}
        </div>
      </div>
    `;

    // Neural Tree/Forest (Tree structure)
    const treeHtml = `
      <div class="profile-visualization-section">
        <h3>Neural Tree Structure</h3>
        <div class="neural-tree-container">
          ${renderNeuralTree(profile.characteristics)}
        </div>
      </div>
    `;

    // Rings Matrix (Grid visualization)
    const matrixHtml = `
      <div class="profile-visualization-section">
        <h3>Rings Matrix</h3>
        <div class="rings-matrix-container">
          ${renderRingsMatrix(linguisticPatterns, domainKnowledge)}
        </div>
      </div>
    `;

    const corpusCount = Array.isArray((profile as { corpusResourceIds?: string[] }).corpusResourceIds)
      ? (profile as { corpusResourceIds: string[] }).corpusResourceIds.length
      : 0;
    const vertexCorpusNote =
      corpusCount > 0
        ? `<p style="margin: 0 0 var(--space-md); font-size: var(--text-sm); color: var(--text-secondary);">Voice markers below are inferred from the profile; the <strong>${corpusCount}</strong> listed corpus resources in the header shaped the underlying samples.</p>`
        : '';

    // Vertex Graph (Node connections)
    const vertexHtml = `
      <div class="profile-visualization-section">
        <h3>Vertex Connections</h3>
        ${vertexCorpusNote}
        <div class="vertex-container">
          ${renderVertexGraph(voiceMarkers, domainKnowledge)}
        </div>
      </div>
    `;

      container.innerHTML = ringsHtml + treeHtml + matrixHtml + vertexHtml;
      
      // Add interactivity to visualizations after rendering
      addVisualizationInteractivity(container);
    }, 100);
  }

  function addVisualizationInteractivity(container: HTMLElement) {
    // Add click handlers to tree nodes
    container.querySelectorAll('.tree-node').forEach(node => {
      node.addEventListener('click', (e) => {
        const nodeId = (e.currentTarget as HTMLElement).dataset.nodeId;
        if (nodeId) {
          showNotification(`Selected node: ${nodeId}`, 'info');
        }
      });
    });

    // Add hover effects to vertex nodes
    container.querySelectorAll('.vertex-node').forEach(node => {
      node.addEventListener('mouseenter', (e) => {
        const vertexId = (e.currentTarget as HTMLElement).dataset.vertexId;
        // Highlight connected lines
        container.querySelectorAll('.vertex-line').forEach(line => {
          const lineEl = line as SVGLineElement;
          if (lineEl.getAttribute('x1') && lineEl.getAttribute('x2')) {
            // Simple highlight logic
            lineEl.style.strokeWidth = '2.5';
            lineEl.style.opacity = '0.6';
          }
        });
      });
      
      node.addEventListener('mouseleave', () => {
        container.querySelectorAll('.vertex-line').forEach(line => {
          const lineEl = line as SVGLineElement;
          lineEl.style.strokeWidth = '1.5';
          lineEl.style.opacity = '';
        });
      });
    });
  }

  function renderToneRings(tone: any): string {
    if (!tone) return '';
    const tones = Object.entries(tone);
    const colorMap: { [key: string]: string } = {
      'formality': 'var(--portal-primary)',
      'technicality': 'var(--portal-success)',
      'accessibility': 'var(--portal-info)',
      'precision': 'var(--portal-warning)',
      'comprehensiveness': 'var(--viz-accent-1)'
    };
    
    return `
      <div class="tone-rings">
        ${tones.map(([key, value]: [string, any]) => {
          const percentage = getToneValue(String(value)) * 100;
          const color = colorMap[key] || 'var(--primary-color)';
          const valueLabel = String(value).replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
          return `
            <div class="tone-ring" data-tooltip="${key}: ${valueLabel} (${percentage.toFixed(0)}%)">
              <svg width="120" height="120" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="var(--border-light)" stroke-width="8"/>
                <circle cx="60" cy="60" r="50" fill="none" stroke="${color}" stroke-width="8" 
                  stroke-dasharray="${2 * Math.PI * 50}" 
                  stroke-dashoffset="${2 * Math.PI * 50 * (1 - percentage / 100)}"
                  transform="rotate(-90 60 60)"/>
                <text x="60" y="55" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="600" fill="var(--text-primary)">${percentage.toFixed(0)}%</text>
                <text x="60" y="75" text-anchor="middle" font-size="10" fill="var(--text-secondary)">${key}</text>
              </svg>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderVocabularyRings(vocab: any): string {
    if (!vocab) return '';
    const categories = ['technicalTerms', 'descriptiveTerms', 'relationshipTerms'];
    return `
      <div class="vocabulary-rings">
        ${categories.map(cat => {
          const terms = vocab[cat] || [];
          const count = terms.length;
          const maxCount = 50;
          const percentage = Math.min((count / maxCount) * 100, 100);
          return `
            <div class="vocab-ring">
              <svg width="100" height="100" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border-light)" stroke-width="6"/>
                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--primary-color)" stroke-width="6" 
                  stroke-dasharray="${2 * Math.PI * 40}" 
                  stroke-dashoffset="${2 * Math.PI * 40 * (1 - percentage / 100)}"
                  transform="rotate(-90 50 50)"/>
                <text x="50" y="50" text-anchor="middle" dominant-baseline="middle" font-size="14" fill="var(--text-primary)">${count}</text>
                <text x="50" y="65" text-anchor="middle" font-size="9" fill="var(--text-secondary)">${cat.replace('Terms', '')}</text>
              </svg>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderNeuralTree(characteristics: any): string {
    type TreeNode = { id: string; label: string; level: number; parent?: string; value?: unknown };
    const nodes: TreeNode[] = [{ id: 'root', label: 'Voice Profile', level: 0 }];

    const level1Nodes = [
      { id: 'tone', label: 'Tone', parent: 'root' },
      { id: 'linguistic', label: 'Linguistic', parent: 'root' },
      { id: 'structural', label: 'Structural', parent: 'root' },
      { id: 'domain', label: 'Domain', parent: 'root' },
      { id: 'markers', label: 'Voice Markers', parent: 'root' },
    ];

    level1Nodes.forEach((node) => {
      nodes.push({ ...node, level: 1 });
    });

    if (characteristics.tone) {
      Object.entries(characteristics.tone).forEach(([key, value]) => {
        nodes.push({ id: `tone-${key}`, label: key.replace(/_/g, ' '), level: 2, parent: 'tone', value });
      });
    }

    if (characteristics.linguisticPatterns) {
      Object.keys(characteristics.linguisticPatterns).forEach((key) => {
        nodes.push({
          id: `linguistic-${key}`,
          label: key.replace(/([A-Z])/g, ' $1').trim(),
          level: 2,
          parent: 'linguistic',
        });
      });
    }

    if (characteristics.structuralPatterns) {
      Object.keys(characteristics.structuralPatterns).forEach((key) => {
        nodes.push({
          id: `structural-${key}`,
          label: key.replace(/([A-Z])/g, ' $1').trim(),
          level: 2,
          parent: 'structural',
        });
      });
    }

    if (characteristics.domainKnowledge) {
      Object.keys(characteristics.domainKnowledge).forEach((key) => {
        const items = characteristics.domainKnowledge[key] || [];
        nodes.push({
          id: `domain-${key}`,
          label: key.replace(/([A-Z])/g, ' $1').trim(),
          level: 2,
          parent: 'domain',
          value: items.length,
        });
      });
    }

    if (characteristics.voiceMarkers) {
      Object.keys(characteristics.voiceMarkers).forEach((key) => {
        const items = characteristics.voiceMarkers[key] || [];
        nodes.push({
          id: `marker-${key}`,
          label: key.replace(/([A-Z])/g, ' $1').trim(),
          level: 2,
          parent: 'markers',
          value: items.length,
        });
      });
    }

    const positions = new Map<string, { x: number; y: number }>();
    const levelSpacing = 200;
    const leafSpacing = 52;
    const padding = 56;
    let leafIndex = 0;

    const childrenOf = (parentId: string) =>
      nodes.filter((n) => n.parent === parentId).sort((a, b) => a.id.localeCompare(b.id));

    function layoutSubtree(nodeId: string, depth: number): number {
      const children = childrenOf(nodeId);
      const x = padding + depth * levelSpacing;

      if (children.length === 0) {
        const y = padding + leafIndex * leafSpacing;
        leafIndex += 1;
        positions.set(nodeId, { x, y });
        return y;
      }

      const childYs = children.map((child) => layoutSubtree(child.id, depth + 1));
      const y = childYs.reduce((sum, value) => sum + value, 0) / childYs.length;
      positions.set(nodeId, { x, y });
      return y;
    }

    layoutSubtree('root', 0);

    const coords = [...positions.values()];
    const minY = Math.min(...coords.map((p) => p.y)) - 40;
    const maxY = Math.max(...coords.map((p) => p.y)) + 56;
    const width = padding * 2 + 3 * levelSpacing;
    const height = maxY - minY + padding;

    return `
      <svg class="neural-tree-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="nodeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:var(--primary-color);stop-opacity:1" />
            <stop offset="100%" style="stop-color:var(--primary-light);stop-opacity:1" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        ${nodes
          .map((node) => {
            if (!node.parent) return '';
            const from = positions.get(node.parent);
            const to = positions.get(node.id);
            if (!from || !to) return '';
            return `<line x1="${from.x}" y1="${from.y - minY + padding / 2}" x2="${to.x}" y2="${to.y - minY + padding / 2}" stroke="var(--primary-color)" stroke-width="2" opacity="0.4" class="tree-line"/>`;
          })
          .join('')}
        ${nodes
          .map((node) => {
            const pos = positions.get(node.id);
            if (!pos) return '';
            const y = pos.y - minY + padding / 2;
            const radius = node.level === 0 ? 22 : node.level === 1 ? 16 : 12;
            const fillColor =
              node.level === 0
                ? 'url(#nodeGradient)'
                : node.level === 1
                  ? 'var(--primary-light)'
                  : 'var(--surface-elevated)';
            const valueText = node.value !== undefined ? ` (${node.value})` : '';

            return `
            <g class="tree-node" data-node-id="${node.id}">
              <circle cx="${pos.x}" cy="${y}" r="${radius}" 
                fill="${fillColor}" 
                stroke="var(--primary-color)" 
                stroke-width="${node.level === 0 ? 3 : 2}"
                filter="${node.level === 0 ? 'url(#glow)' : 'none'}"/>
              <text x="${pos.x}" y="${y + (node.level === 0 ? 45 : 35)}" text-anchor="middle" font-size="${node.level === 0 ? 14 : node.level === 1 ? 12 : 10}" fill="var(--text-primary)" font-weight="${node.level === 0 ? '600' : '400'}">
                ${node.label}${valueText}
              </text>
            </g>
          `;
          })
          .join('')}
      </svg>
    `;
  }

  function renderRingsMatrix(linguisticPatterns: any, domainKnowledge: any): string {
    const matrix: string[][] = [];
    const vocab = linguisticPatterns?.vocabulary || {};
    const domains = domainKnowledge || {};

    const categories = [
      ...Object.keys(vocab).map(k => ({ type: 'vocab', name: k, items: vocab[k] || [] })),
      ...Object.keys(domains).map(k => ({ type: 'domain', name: k, items: domains[k] || [] }))
    ];

    return `
      <div class="rings-matrix-grid">
        ${categories.map((cat, i) => `
          <div class="matrix-cell">
            <div class="matrix-ring">
              <svg width="80" height="80" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="30" fill="none" stroke="var(--border-light)" stroke-width="4"/>
                <circle cx="40" cy="40" r="30" fill="none" stroke="var(--primary-color)" stroke-width="4" 
                  stroke-dasharray="${2 * Math.PI * 30}" 
                  stroke-dashoffset="${2 * Math.PI * 30 * (1 - Math.min(cat.items.length / 20, 1))}"
                  transform="rotate(-90 40 40)"/>
                <text x="40" y="40" text-anchor="middle" dominant-baseline="middle" font-size="14" fill="var(--text-primary)">${cat.items.length}</text>
              </svg>
            </div>
            <div class="matrix-label">${cat.name}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderVertexGraph(voiceMarkers: any, domainKnowledge: any): string {
    const vertices: Array<{ id: string; label: string; x: number; y: number; connections: string[]; count: number; type: string }> = [];
    const centerX = 350;
    const centerY = 250;
    const radius = 150;
    
    // Create vertices from voice markers
    if (voiceMarkers) {
      const markerKeys = Object.keys(voiceMarkers);
      markerKeys.forEach((key, i) => {
        const angle = (i * 2 * Math.PI) / markerKeys.length - Math.PI / 2;
        const items = voiceMarkers[key] || [];
        vertices.push({
          id: `marker-${key}`,
          label: key.replace(/([A-Z])/g, ' $1').trim(),
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
          connections: [],
          count: items.length,
          type: 'marker'
        });
      });
    }

    // Create vertices from domain knowledge
    if (domainKnowledge) {
      const domainKeys = Object.keys(domainKnowledge);
      const innerRadius = 80;
      domainKeys.forEach((key, i) => {
        const angle = (i * 2 * Math.PI) / domainKeys.length - Math.PI / 2;
        const items = domainKnowledge[key] || [];
        vertices.push({
          id: `domain-${key}`,
          label: key.replace(/([A-Z])/g, ' $1').trim(),
          x: centerX + innerRadius * Math.cos(angle),
          y: centerY + innerRadius * Math.sin(angle),
          connections: [],
          count: items.length,
          type: 'domain'
        });
      });
    }

    // Create semantic connections
    // Connect markers to domains based on semantic relationships
    const markerVertices = vertices.filter(v => v.type === 'marker');
    const domainVertices = vertices.filter(v => v.type === 'domain');
    
    markerVertices.forEach(marker => {
      // Connect each marker to nearby domains
      domainVertices.forEach(domain => {
        if (Math.random() > 0.5) { // Random connections for demo, could be semantic-based
          marker.connections.push(domain.id);
        }
      });
    });

    // Connect center node
    const centerNode = { id: 'center', x: centerX, y: centerY, connections: vertices.map(v => v.id) };

    return `
      <svg class="vertex-svg" viewBox="0 0 700 500">
        <defs>
          <radialGradient id="vertexGradient">
            <stop offset="0%" style="stop-color:var(--primary-color);stop-opacity:0.8" />
            <stop offset="100%" style="stop-color:var(--primary-light);stop-opacity:0.4" />
          </radialGradient>
        </defs>
        ${vertices.flatMap(v => 
          v.connections.map(conn => {
            const target = vertices.find(t => t.id === conn);
            if (target) {
              const dx = target.x - v.x;
              const dy = target.y - v.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              const opacity = Math.max(0.2, 1 - (dist / 300));
              return `<line x1="${v.x}" y1="${v.y}" x2="${target.x}" y2="${target.y}" 
                stroke="var(--primary-color)" stroke-width="1.5" opacity="${opacity}" class="vertex-line"/>`;
            }
            return '';
          })
        ).join('')}
        ${vertices.map(v => {
          const size = Math.max(12, Math.min(20, 12 + v.count / 5));
          const color = v.type === 'marker' ? 'var(--primary-color)' : '#10b981';
          return `
            <g class="vertex-node" data-vertex-id="${v.id}">
              <circle cx="${v.x}" cy="${v.y}" r="${size}" 
                fill="${color}" 
                opacity="0.8" 
                stroke="var(--primary-color)" 
                stroke-width="2"
                filter="url(#glow)"/>
              <text x="${v.x}" y="${v.y + size + 20}" text-anchor="middle" font-size="10" fill="var(--text-primary)" font-weight="500">
                ${v.label}
              </text>
              ${v.count > 0 ? `<text x="${v.x}" y="${v.y + size + 35}" text-anchor="middle" font-size="9" fill="var(--text-secondary)">
                ${v.count} items
              </text>` : ''}
            </g>
          `;
        }).join('')}
        <circle cx="${centerNode.x}" cy="${centerNode.y}" r="18" fill="url(#vertexGradient)" stroke="var(--primary-color)" stroke-width="3" filter="url(#glow)"/>
        <text x="${centerNode.x}" y="${centerNode.y + 5}" text-anchor="middle" font-size="12" fill="white" font-weight="600">Core</text>
      </svg>
    `;
  }

  // View Profile
  (window as any).viewProfile = async (id: string) => {
    try {
      const response = await workspaceFetch(`${getVoiceApiUrl()}/profiles`, {
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const profile = data.profiles?.find((p: any) => p.id === id);
        if (profile) {
          const corpusIds: string[] = Array.isArray(profile.corpusResourceIds) ? profile.corpusResourceIds : [];
          const idToTitle = new Map(
            (currentResources || []).map((r: { id?: string; title?: string; topic?: string }) => [
              r.id || '',
              r.title || r.topic || r.id || ''
            ])
          );
          const corpusListHtml = corpusIds
            .slice(0, 32)
            .map((rid: string) => {
              const label = idToTitle.get(rid) || rid;
              return `<li style="margin-bottom: 4px;"><span style="font-family: monospace; font-size: 0.85em;">${escapeHtml(rid)}</span> — ${escapeHtml(String(label))}</li>`;
            })
            .join('');
          const corpusMore = corpusIds.length > 32 ? `<li style="color: var(--text-secondary);">…and ${corpusIds.length - 32} more</li>` : '';
          const stats = profile.stats || {};
          const statsSection = `<div style="margin-bottom: var(--space-lg); padding: var(--space-md); background: var(--portal-surface-elevated); border-radius: var(--border-radius); border: 1px solid var(--portal-border-light);">
                  <h3 style="margin-bottom: var(--space-sm);">Profile reference (read-only)</h3>
                  <div class="profile-card-v1__stats" style="border-top: none; padding-top: 0;">
                    <div class="profile-card-v1__stat"><span class="profile-card-v1__stat-label">Corpus</span><span class="profile-card-v1__stat-value">${stats.corpusResourceCount ?? corpusIds.length ?? 0}</span></div>
                    <div class="profile-card-v1__stat"><span class="profile-card-v1__stat-label">Linked resources</span><span class="profile-card-v1__stat-value">${stats.linkedResourceCount ?? 0}</span></div>
                    <div class="profile-card-v1__stat"><span class="profile-card-v1__stat-label">Avg voice score</span><span class="profile-card-v1__stat-value">${typeof stats.avgVoiceScore === 'number' ? Math.round(stats.avgVoiceScore * 100) + '%' : '—'}</span></div>
                  </div>
                  <p style="color: var(--text-secondary); font-size: var(--text-sm); margin-top: var(--space-sm); margin-bottom: 0;">Pick this profile in Resources → voice profile dropdown, or set as default for Auto resolution.</p>
                </div>`;
          const corpusSection =
            corpusIds.length > 0
              ? `<div style="margin-bottom: var(--space-lg); padding: var(--space-md); background: var(--portal-surface-elevated); border-radius: var(--border-radius); border: 1px solid var(--portal-border-light);">
                  <h3 style="margin-bottom: var(--space-sm);">Resource corpus (topology reference)</h3>
                  <p style="color: var(--text-secondary); font-size: var(--text-sm); margin-bottom: var(--space-sm);">${corpusIds.length} on-repo resources contributed text to this profile. Rings, matrix, and vertex views below summarise the resulting voice characteristics (not individual files).</p>
                  <ul style="margin: 0; padding-left: 1.25rem; max-height: 12rem; overflow-y: auto; font-size: var(--text-sm);">${corpusListHtml}${corpusMore}</ul>
                </div>`
              : '';

          // Create a modal-like display for profile details with visualizations
          const modal = document.createElement('div');
          modal.className = 'modal';
          modal.setAttribute('aria-hidden', 'false');
          
          const visualizationContainer = document.createElement('div');
          visualizationContainer.className = 'profile-visualizations-full';
          renderProfileVisualizations(profile, visualizationContainer);
          
          modal.innerHTML = `
            <div class="modal-overlay" onclick="this.closest('.modal').remove(); document.body.style.overflow = '';"></div>
            <div class="modal-content modal-large">
              <div class="modal-header">
                <h2>Voice Profile: ${escapeHtml(profile.name || 'Unnamed')}</h2>
                <button class="modal-close" onclick="this.closest('.modal').remove(); document.body.style.overflow = '';" aria-label="Close modal">&times;</button>
              </div>
              <div class="modal-body">
                <div style="margin-bottom: var(--space-lg);">
                  <h3 style="margin-bottom: var(--space-sm);">Profile Information</h3>
                  <div style="color: var(--text-secondary); font-size: var(--text-sm);">
                    <p><strong>Voice Name:</strong> ${escapeHtml(profile.voiceName || 'N/A')}</p>
                    <p><strong>Version:</strong> ${escapeHtml(profile.version || 'N/A')}</p>
                    <p><strong>Description:</strong> ${escapeHtml(profile.description || 'No description')}</p>
                    <p><strong>Created:</strong> ${profile.createdAt ? new Date(profile.createdAt).toLocaleString() : 'N/A'}</p>
                    <p><strong>Tags:</strong> ${profile.tags?.join(', ') || 'None'}</p>
                    <p><strong>Default:</strong> ${profile.isDefault ? 'Yes' : 'No'}</p>
                    <p><strong>Archived:</strong> ${profile.archived ? 'Yes' : 'No'}</p>
                  </div>
                </div>
                ${statsSection}
                ${corpusSection}
              </div>
              <div class="modal-footer" style="display: flex; flex-wrap: wrap; gap: var(--space-sm); align-items: center;">
                ${profile.id !== 'default' ? `
                  ${!profile.isDefault ? `<button type="button" class="btn btn-success btn-sm" onclick="setDefaultProfile('${escapeHtml(profile.id)}', true)">Set as default</button>` : ''}
                  ${profile.archived
                    ? `<button type="button" class="btn btn-warning btn-sm" onclick="unarchiveProfile('${escapeHtml(profile.id)}', this)">Unarchive</button>`
                    : `<button type="button" class="btn btn-secondary btn-sm" onclick="archiveProfile('${escapeHtml(profile.id)}', this)">Archive</button>`
                  }
                ` : '<span style="color: var(--text-secondary); font-size: var(--text-sm);">Bundled default is read-only. Use <strong>Build / refresh BIGPONS</strong> above to save a site corpus voice in storage.</span>'}
                <button type="button" class="btn btn-secondary" onclick="this.closest('.modal')?.remove(); document.body.style.overflow = '';">Close</button>
              </div>
            </div>
          `;
          
          const modalBody = modal.querySelector('.modal-body');
          if (modalBody) {
            modalBody.appendChild(visualizationContainer);
          }
          
          document.body.appendChild(modal);
          document.body.style.overflow = 'hidden';
        } else {
          showNotification('Profile not found.', 'error');
        }
      } else {
        showNotification('Failed to load profile details.', 'error');
      }
    } catch (error) {
      showNotification('Error loading profile details.', 'error');
      console.error('[Portal] Error viewing profile:', error);
    }
  };

  // Archive Profile
  (window as any).archiveProfile = async (id: string, btn?: HTMLButtonElement | null) => {
    const trigger = btn ?? (typeof window !== 'undefined' ? ((window as unknown as { event?: Event }).event?.target as HTMLButtonElement) : undefined);
    const profileItem = trigger?.closest('.profile-item');
    const originalText = trigger?.textContent || 'Archive';
    
    if (trigger) {
      trigger.disabled = true;
      trigger.innerHTML = '<span class="loading-spinner" style="width: 12px; height: 12px; border-width: 2px;"></span> Archiving...';
    }

    try {
      const response = await workspaceFetch(`${getVoiceApiUrl()}/profiles/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ archived: true })
      });

      if (response.ok) {
        showNotification('Profile archived successfully.', 'success');
        document.querySelector('.modal')?.remove();
        document.body.style.overflow = '';
        if (profileItem) {
          profileItem.style.transition = 'opacity 0.3s ease';
          profileItem.style.opacity = '0.5';
        }
        setTimeout(() => {
          loadProfiles();
        }, 500);
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error || 'Unknown error';
        showNotification(`Failed to archive profile: ${errorMsg}`, 'error');
        if (trigger) {
          trigger.disabled = false;
          trigger.textContent = originalText;
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Network error';
      showNotification(`Error archiving profile: ${errorMsg}`, 'error');
      console.error('[Portal] Error archiving profile:', error);
      if (trigger) {
        trigger.disabled = false;
        trigger.textContent = originalText;
      }
    }
  };

  // Unarchive Profile
  (window as any).unarchiveProfile = async (id: string, btn?: HTMLButtonElement | null) => {
    const trigger = btn ?? (typeof window !== 'undefined' ? ((window as unknown as { event?: Event }).event?.target as HTMLButtonElement) : undefined);
    const profileItem = trigger?.closest('.profile-item');
    const originalText = trigger?.textContent || 'Unarchive';
    
    if (trigger) {
      trigger.disabled = true;
      trigger.innerHTML = '<span class="loading-spinner" style="width: 12px; height: 12px; border-width: 2px;"></span> Unarchiving...';
    }

    try {
      const response = await workspaceFetch(`${getVoiceApiUrl()}/profiles/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ archived: false })
      });

      if (response.ok) {
        showNotification('Profile unarchived successfully.', 'success');
        document.querySelector('.modal')?.remove();
        document.body.style.overflow = '';
        if (profileItem) {
          profileItem.style.transition = 'opacity 0.3s ease';
          profileItem.style.opacity = '1';
        }
        setTimeout(() => {
          loadProfiles();
        }, 500);
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error || 'Unknown error';
        showNotification(`Failed to unarchive profile: ${errorMsg}`, 'error');
        if (trigger) {
          trigger.disabled = false;
          trigger.textContent = originalText;
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Network error';
      showNotification(`Error unarchiving profile: ${errorMsg}`, 'error');
      console.error('[Portal] Error unarchiving profile:', error);
      if (trigger) {
        trigger.disabled = false;
        trigger.textContent = originalText;
      }
    }
  };

  // Filter Profiles
  (window as any).filterProfiles = (filter: 'all' | 'active' | 'archived') => {
    const allProfiles = (window as any).allProfiles || [];
    const listDiv = document.getElementById('profiles-list');
    if (!listDiv) return;

    // Update filter buttons
    document.querySelectorAll('.quick-filters .btn').forEach(btn => btn.classList.remove('active'));
    const filterBtn = document.getElementById(`filter-profiles-${filter}`);
    if (filterBtn) filterBtn.classList.add('active');

    // Filter profiles
    let filteredProfiles = allProfiles;
    if (filter === 'active') {
      filteredProfiles = allProfiles.filter((p: any) => !p.archived);
    } else if (filter === 'archived') {
      filteredProfiles = allProfiles.filter((p: any) => p.archived);
    }

    // Re-render filtered list
    if (filteredProfiles.length === 0) {
      const emptyMessages: { [key: string]: string } = {
        'all': 'No profiles found. Create your first voice profile to get started.',
        'active': 'No active profiles found. All profiles are archived.',
        'archived': 'No archived profiles found.'
      };
      
      listDiv.innerHTML = `
        <div class="empty-state" style="text-align: center; padding: var(--space-2xl); color: var(--text-secondary);">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto var(--space-md); opacity: 0.5;">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          <p style="font-size: var(--text-lg); margin-bottom: var(--space-sm);">${emptyMessages[filter] || 'No profiles found.'}</p>
          ${filter === 'archived' ? '<p style="font-size: var(--text-sm);">Archived profiles are hidden from normal view but can be restored.</p>' : ''}
        </div>
      `;
      return;
    }

    listDiv.className = 'profiles-list profile-cards-grid';
    listDiv.innerHTML = filteredProfiles.map((profile: Record<string, unknown>) => renderProfileCardV1(profile)).join('');
  };

  // Set Default Profile (persists defaultProfileId + isDefault flags in voice-framework/storage/profiles.json)
  (window as any).setDefaultProfile = async (id: string, skipConfirm?: boolean) => {
    if (id === 'default') {
      showNotification(
        'The bundled default cannot be stored as the workspace default. Create a base profile from starters, then set that as default.',
        'info'
      );
      return;
    }
    if (!skipConfirm) {
      if (!confirm('Set this profile as the default voice profile? New resource runs that use “Auto” will prefer this saved profile when present.')) return;
    }
    try {
      const response = await workspaceFetch(`${getVoiceApiUrl()}/profiles/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isDefault: true })
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.success) {
        showNotification('Default voice profile updated.', 'success');
        document.querySelector('.modal')?.remove();
        document.body.style.overflow = '';
        await loadProfiles();
        await ensureWorkspaceVoiceProfiles();
      } else {
        showNotification(typeof data.error === 'string' ? data.error : 'Failed to set default profile', 'error');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Network error';
      showNotification(`Error setting default profile: ${errorMsg}`, 'error');
      console.error('[Portal] setDefaultProfile:', error);
    }
  };

  // Analyze Profile Duplicates (Neural Library Analysis)
  (window as any).analyzeProfileDuplicates = async () => {
    try {
      showNotification('Analyzing profile similarities...', 'info');
      
      const response = await workspaceFetch(`${getVoiceApiUrl()}/profiles`, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch profiles');
      }

      const data = await response.json();
      const profiles = data.profiles || [];

      if (profiles.length < 2) {
        showNotification('Need at least 2 profiles to analyze duplicates.', 'info');
        return;
      }

      // Calculate similarity matrix
      const similarities: Array<{
        profile1: string;
        profile2: string;
        similarity: number;
        reasons: string[];
      }> = [];

      for (let i = 0; i < profiles.length; i++) {
        for (let j = i + 1; j < profiles.length; j++) {
          const p1 = profiles[i];
          const p2 = profiles[j];
          const sim = calculateProfileSimilarityForAnalysis(p1, p2);
          
          if (sim.similarity > 0.7) {
            similarities.push({
              profile1: p1.id,
              profile2: p2.id,
              similarity: sim.similarity,
              reasons: sim.reasons
            });
          }
        }
      }

      // Show analysis modal
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.setAttribute('aria-hidden', 'false');
      
      const duplicatesFound = similarities.filter(s => s.similarity >= 0.85).length;
      const similarFound = similarities.filter(s => s.similarity >= 0.7 && s.similarity < 0.85).length;

      modal.innerHTML = `
        <div class="modal-overlay" onclick="this.closest('.modal').remove(); document.body.style.overflow = '';"></div>
        <div class="modal-content modal-large">
          <div class="modal-header">
            <h2>Neural Library Analysis</h2>
            <button class="modal-close" onclick="this.closest('.modal').remove(); document.body.style.overflow = '';" aria-label="Close modal">&times;</button>
          </div>
          <div class="modal-body">
            <div style="margin-bottom: var(--space-xl);">
              <h3 style="margin-bottom: var(--space-md);">Similarity Analysis</h3>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-md); margin-bottom: var(--space-lg);">
                <div class="stat-card" style="text-align: center;">
                  <h3>Total Profiles</h3>
                  <p class="stat-value">${profiles.length}</p>
                </div>
                <div class="stat-card" style="text-align: center; border-color: var(--error-color);">
                  <h3>Duplicates</h3>
                  <p class="stat-value" style="color: var(--error-color);">${duplicatesFound}</p>
                </div>
                <div class="stat-card" style="text-align: center; border-color: var(--warning-color);">
                  <h3>Similar</h3>
                  <p class="stat-value" style="color: var(--warning-color);">${similarFound}</p>
                </div>
              </div>
              
              ${similarities.length > 0 ? `
                <div style="margin-top: var(--space-xl);">
                  <h3 style="margin-bottom: var(--space-md);">Similarity Matrix</h3>
                  <div class="similarity-matrix" style="max-height: 500px; overflow-y: auto;">
                    ${similarities.map(sim => {
                      const p1 = profiles.find((p: any) => p.id === sim.profile1);
                      const p2 = profiles.find((p: any) => p.id === sim.profile2);
                      const similarityPercent = Math.round(sim.similarity * 100);
                      const isDuplicate = sim.similarity >= 0.85;
                      
                      return `
                        <div class="similarity-item" style="padding: var(--space-md); margin-bottom: var(--space-md); border: 1px solid var(--border); border-radius: var(--border-radius); background: var(--surface-elevated);">
                          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: var(--space-sm);">
                            <div style="flex: 1;">
                              <div style="font-weight: 600; margin-bottom: var(--space-xs);">${escapeHtml(p1?.name || 'Unknown')} ↔ ${escapeHtml(p2?.name || 'Unknown')}</div>
                              <div style="font-size: var(--text-sm); color: var(--text-secondary);">
                                Similarity: <strong style="color: ${isDuplicate ? 'var(--error-color)' : 'var(--warning-color)'}">${similarityPercent}%</strong>
                                ${isDuplicate ? '<span class="badge badge-danger" style="margin-left: var(--space-sm);">Duplicate</span>' : '<span class="badge badge-warning" style="margin-left: var(--space-sm);">Similar</span>'}
                              </div>
                            </div>
                            <div style="width: 100px; height: 100px; position: relative;">
                              <svg width="100" height="100" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border-light)" stroke-width="8"/>
                                <circle cx="50" cy="50" r="40" fill="none" stroke="${isDuplicate ? 'var(--error-color)' : 'var(--warning-color)'}" stroke-width="8" 
                                  stroke-dasharray="${2 * Math.PI * 40}" 
                                  stroke-dashoffset="${2 * Math.PI * 40 * (1 - sim.similarity)}"
                                  transform="rotate(-90 50 50)"/>
                                <text x="50" y="50" text-anchor="middle" dominant-baseline="middle" font-size="16" font-weight="600" fill="var(--text-primary)">${similarityPercent}%</text>
                              </svg>
                            </div>
                          </div>
                          ${sim.reasons.length > 0 ? `
                            <div style="margin-top: var(--space-sm); padding-top: var(--space-sm); border-top: 1px solid var(--border-light);">
                              <div style="font-size: var(--text-sm); color: var(--text-secondary);">
                                <strong>Reasons:</strong> ${sim.reasons.join(', ')}
                              </div>
                            </div>
                          ` : ''}
                        </div>
                      `;
                    }).join('')}
                  </div>
                </div>
              ` : `
                <div class="empty-state" style="text-align: center; padding: var(--space-xl);">
                  <p>No similar profiles found. All profiles are unique.</p>
                </div>
              `}
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="this.closest('.modal').remove(); document.body.style.overflow = '';">Close</button>
            ${duplicatesFound > 0 ? `<button class="btn btn-warning" onclick="this.closest('.modal').remove(); document.body.style.overflow = ''; deduplicateProfiles();">Sculpt Library Now</button>` : ''}
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      document.body.style.overflow = 'hidden';
    } catch (error) {
      showNotification('Failed to analyze duplicates: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
      console.error('[Portal] Error analyzing duplicates:', error);
    }
  };

  // Calculate similarity for analysis (with reasons)
  function calculateProfileSimilarityForAnalysis(p1: any, p2: any): { similarity: number; reasons: string[] } {
    const reasons: string[] = [];
    let similarity = 0;
    let totalWeight = 0;

    // Name similarity
    const name1 = (p1.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const name2 = (p2.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (name1 === name2 || name1.includes(name2) || name2.includes(name1)) {
      reasons.push('Name match');
      similarity += 0.2;
      totalWeight += 0.2;
    }

    // Tone similarity
    if (p1.characteristics?.tone && p2.characteristics?.tone) {
      const tone1 = p1.characteristics.tone;
      const tone2 = p2.characteristics.tone;
      let matches = 0;
      const keys = Object.keys(tone1);
      keys.forEach(key => {
        if (tone1[key] === tone2[key]) matches++;
      });
      if (matches > 0) {
        const toneSim = matches / Math.max(keys.length, Object.keys(tone2).length);
        similarity += toneSim * 0.3;
        totalWeight += 0.3;
        if (toneSim > 0.8) reasons.push('Tone match');
      }
    }

    // Vocabulary similarity
    if (p1.characteristics?.linguisticPatterns?.vocabulary && p2.characteristics?.linguisticPatterns?.vocabulary) {
      const v1 = p1.characteristics.linguisticPatterns.vocabulary;
      const v2 = p2.characteristics.linguisticPatterns.vocabulary;
      const categories = ['technicalTerms', 'descriptiveTerms', 'relationshipTerms'];
      let vocabSim = 0;
      categories.forEach(cat => {
        const terms1 = new Set((v1[cat] || []).map((t: string) => t.toLowerCase()));
        const terms2 = new Set((v2[cat] || []).map((t: string) => t.toLowerCase()));
        const intersection = new Set([...terms1].filter(t => terms2.has(t)));
        const union = new Set([...terms1, ...terms2]);
        if (union.size > 0) vocabSim += intersection.size / union.size;
      });
      if (vocabSim > 0) {
        similarity += (vocabSim / categories.length) * 0.25;
        totalWeight += 0.25;
        if (vocabSim / categories.length > 0.7) reasons.push('Vocabulary overlap');
      }
    }

    return {
      similarity: totalWeight > 0 ? similarity / totalWeight : 0,
      reasons
    };
  }

  // Deduplicate Profiles (Sculpt Library)
  (window as any).deduplicateProfiles = async () => {
    const btn = document.getElementById('deduplicate-profiles-btn') as HTMLButtonElement;
    if (!btn) return;
    
    if (!confirm('This will analyze and merge duplicate profiles using neural similarity matching. The best version of each duplicate group will be kept and merged. Continue?')) {
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner" style="width: 12px; height: 12px; border-width: 2px;"></span> Sculpting...';
    showNotification('Analyzing and sculpting profile library...', 'info');

    try {
      const response = await workspaceFetch(`${getVoiceApiUrl()}/profiles/deduplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          similarityThreshold: 0.85,
          mergeMode: 'intelligent'
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const removed = data.profilesRemoved || 0;
        const duplicates = data.duplicates || [];
        
        if (removed === 0) {
          showNotification('No duplicates found. Library is already sculpted!', 'success');
        } else {
          let message = `Library sculpted! ${removed} duplicate profile(s) ${data.mergeMode === 'intelligent' ? 'merged' : 'removed'}.`;
          if (duplicates.length > 0) {
            message += ` ${duplicates.length} duplicate group(s) processed.`;
          }
          showNotification(message, 'success');
          
          // Show detailed results
          setTimeout(() => {
            const resultsModal = document.createElement('div');
            resultsModal.className = 'modal';
            resultsModal.setAttribute('aria-hidden', 'false');
            resultsModal.innerHTML = `
              <div class="modal-overlay" onclick="this.closest('.modal').remove(); document.body.style.overflow = '';"></div>
              <div class="modal-content">
                <div class="modal-header">
                  <h2>Sculpting Results</h2>
                  <button class="modal-close" onclick="this.closest('.modal').remove(); document.body.style.overflow = '';" aria-label="Close modal">&times;</button>
                </div>
                <div class="modal-body">
                  <p><strong>Profiles removed:</strong> ${removed}</p>
                  <p><strong>Total profiles remaining:</strong> ${data.totalProfiles}</p>
                  ${duplicates.length > 0 ? `
                    <div style="margin-top: var(--space-lg);">
                      <h3>Duplicate Groups Processed:</h3>
                      <ul style="list-style: none; padding: 0;">
                        ${duplicates.map((d: any) => `
                          <li style="padding: var(--space-sm); margin-bottom: var(--space-sm); background: var(--surface-elevated); border-radius: var(--border-radius);">
                            <strong>Kept:</strong> ${d.kept}<br>
                            <strong>Removed:</strong> ${d.removed.join(', ')} (${d.count} profile(s))<br>
                            <strong>Similarity:</strong> ${d.similarity}%<br>
                            <strong>Method:</strong> ${d.reason === 'merged' ? 'Intelligent merge' : 'Keep best'}
                          </li>
                        `).join('')}
                      </ul>
                    </div>
                  ` : ''}
                </div>
                <div class="modal-footer">
                  <button class="btn btn-primary" onclick="this.closest('.modal').remove(); document.body.style.overflow = ''; loadProfiles();">Refresh Profiles</button>
                  <button class="btn btn-secondary" onclick="this.closest('.modal').remove(); document.body.style.overflow = '';">Close</button>
                </div>
              </div>
            `;
            document.body.appendChild(resultsModal);
            document.body.style.overflow = 'hidden';
          }, 500);
        }
        
        setTimeout(() => {
          loadProfiles();
        }, 1000);
      } else {
        const errorMsg = data.error || 'Unknown error';
        showNotification('Failed to sculpt library: ' + errorMsg, 'error');
        console.error('[Portal] Deduplication failed:', data);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Network error';
      showNotification('Error sculpting library: ' + errorMsg, 'error');
      console.error('[Portal] Error deduplicating profiles:', error);
    } finally {
      btn.disabled = false;
      btn.innerHTML = `
        <svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18"></path>
          <path d="M6 6l12 12"></path>
        </svg>
        Sculpt Library
      `;
    }
  };

  // Export Profiles
  (window as any).exportProfiles = async () => {
    try {
      const response = await workspaceFetch(`${getVoiceApiUrl()}/profiles`, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch profiles');
      }

      const data = await response.json();
      const profiles = data.profiles || [];

      // Create export data
      const exportData = {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        count: profiles.length,
        profiles: profiles.map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          version: p.version,
          tags: p.tags,
          isDefault: p.isDefault,
          archived: p.archived,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          sourceDocument: p.sourceDocument,
          voiceName: p.voiceName,
          characteristics: p.characteristics
        }))
      };

      // Download as JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `voice-profiles-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showNotification(`Exported ${profiles.length} profile(s) successfully.`, 'success');
    } catch (error) {
      showNotification('Failed to export profiles: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
      console.error('[Portal] Error exporting profiles:', error);
    }
  };

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
      const resources = data.resources || currentResources || [];
      
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
    const drafts = currentResources.filter((r: any) => r.status === 'draft');
    if (drafts.length === 0) {
      showNotification('No draft resources to improve.', 'info');
      return;
    }
    
    if (!confirm(`Improve ${drafts.length} draft resource(s) using voice framework? This may take a while.`)) return;
    
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

  // Refresh Profiles
  document.getElementById('refresh-profiles')?.addEventListener('click', loadProfiles);
  
  // Make functions globally accessible
  (window as any).loadProfiles = loadProfiles;
  (window as any).createBaseProfile = createBaseProfile;
  (window as any).filterProfiles = filterProfiles;
  (window as any).archiveProfile = archiveProfile;
  (window as any).unarchiveProfile = unarchiveProfile;

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
    initWorkspaceVoiceProfileSelect();

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

  // Notification System
  function showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration: number = 5000): void {
    const container = document.getElementById('notification-container');
    if (!container) {
      console.warn('[Portal] Notification container not found');
      return;
    }

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.setAttribute('role', 'alert');

    // Icon based on type
    let iconSvg = '';
    switch (type) {
      case 'success':
        iconSvg = '<svg class="notification-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>';
        break;
      case 'error':
        iconSvg = '<svg class="notification-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
        break;
      case 'warning':
        iconSvg = '<svg class="notification-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
        break;
      default:
        iconSvg = '<svg class="notification-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    }

    notification.innerHTML = `
      ${iconSvg}
      <span class="notification-message">${escapeHtml(message)}</span>
      <button class="notification-close" aria-label="Close notification">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;

    const closeBtn = notification.querySelector('.notification-close');
    const removeNotification = () => {
      notification.classList.add('hiding');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    };

    closeBtn?.addEventListener('click', removeNotification);

    container.appendChild(notification);

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(removeNotification, duration);
    }
  }

  // Form Validation Helpers
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

