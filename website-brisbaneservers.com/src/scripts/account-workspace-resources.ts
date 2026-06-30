// @ts-nocheck — resources panel (extracted from account-workspace-app)
import { workspaceFetch } from '../lib/client-api';
import { normalizeIndustrySlug } from '../lib/industry-slug';
import { getResourceActionPermissions } from '../lib/resource-permissions';
import { industries } from '../data/industries';
import {
  escapeHtml,
  escapeJsString,
  treeGroupLabel,
  treeSlug,
  resourceExcerpt,
  showWorkspaceNotification,
} from './account-workspace-utils';
import { getWorkspaceResources, setWorkspaceResources } from './account-workspace-resource-store';
import { buildResourcesListUrl } from './account-workspace-resource-api';
import { showConfirmDialog } from './portal-confirm-dialog';
import { trackPortalAction, trackPortalError } from './portal-markov-tracker';
import { mountMarkdownFields, readMarkdownFieldValue } from './workspace-markdown-field';
import { portalActionFailure } from './portal-action';
import { wrapMarkdownDocument } from '../lib/markdown-render';
import type { VoiceContextApi } from './account-workspace-voice-context';

export type ResourceCreateSection = 'generate' | 'upload' | 'paste';

export type ResourcesWorkspaceDeps = {
  getVoiceApiUrl: () => string;
  isDev: boolean;
  sessionActive: boolean;
  showNotification: typeof showWorkspaceNotification;
  loadDashboardData: () => Promise<void>;
  handleWorkspaceSessionExpired: () => Promise<void>;
  navigateToPanel: (panel: string) => void;
  voiceContext: VoiceContextApi;
  getWorkspaceUser: () => { id?: string; role?: string } | null;
  hasWorkspaceCapability: (
    user: { role?: string } | null | undefined,
    minRole: 'client' | 'viewer' | 'editor' | 'admin',
  ) => boolean;
};

export function registerResourcesWorkspace(deps: ResourcesWorkspaceDeps): {
  loadResources: (options?: { revealResourceId?: string }) => Promise<void>;
  selectResource: (resourceId: string) => void;
} {
  const {
    getVoiceApiUrl,
    isDev,
    sessionActive,
    showNotification,
    loadDashboardData,
    handleWorkspaceSessionExpired,
    navigateToPanel,
    voiceContext,
    getWorkspaceUser,
    hasWorkspaceCapability,
  } = deps;

  let detailEditResourceId: string | null = null;

  function resourcePermissions(resource: any) {
    return getResourceActionPermissions(getWorkspaceUser(), resource);
  }

  function buildResourceActionsHtml(resource: any, context: 'detail' | 'list'): string {
    const perms = resourcePermissions(resource);
    const id = escapeHtml(resource.id);
    const sm = context === 'list' ? ' btn-sm' : '';
    const buttons: string[] = [];

    if (context === 'detail') {
      buttons.push(`<button class="btn btn-primary${sm}" onclick="viewResource('${id}')">View full</button>`);
    }

    if (perms.edit) {
      const editHandler =
        context === 'detail'
          ? `editResource('${id}', 'inline')`
          : `editResource('${id}')`;
      buttons.push(`<button class="btn btn-secondary${sm}" onclick="${editHandler}">Edit</button>`);
    } else if (perms.editReason && context === 'detail') {
      buttons.push(
        `<button class="btn btn-secondary${sm}" disabled title="${escapeHtml(perms.editReason)}">Edit</button>`,
      );
    }

    buttons.push(`<button class="btn btn-secondary${sm}" onclick="previewResource('${id}')">Preview</button>`);

    if (perms.publish) {
      buttons.push(`<button class="btn btn-success${sm}" onclick="publishResource('${id}')">Publish</button>`);
    }
    if (perms.unpublish) {
      buttons.push(`<button class="btn btn-warning${sm}" onclick="unpublishResource('${id}')">Unpublish</button>`);
    }
    if (perms.improve) {
      buttons.push(`<button class="btn btn-secondary${sm}" onclick="improveResource('${id}')">Improve</button>`);
    }
    if (perms.archive) {
      buttons.push(`<button class="btn btn-secondary${sm}" onclick="archiveResource('${id}')">Archive</button>`);
    }
    if (perms.unarchive) {
      buttons.push(`<button class="btn btn-secondary${sm}" onclick="unarchiveResource('${id}')">Unarchive</button>`);
    }
    if (perms.delete) {
      const deleteLabel = resource.status === 'published' ? 'Remove from workspace' : 'Delete';
      buttons.push(`<button class="btn btn-danger${sm}" onclick="deleteResource('${id}')">${deleteLabel}</button>`);
    } else if (perms.deleteReason && context === 'detail') {
      buttons.push(
        `<span class="resource-action-hint" title="${escapeHtml(perms.deleteReason)}">Live on site — unpublish to delete</span>`,
      );
    }

    if (perms.restore) {
      buttons.push(`<button class="btn btn-primary${sm}" onclick="restoreResource('${id}')">Restore to workspace</button>`);
    }
    if (resource.portalRemovedAt) {
      buttons.push(`<span class="resource-action-hint badge badge-archived">Removed from workspace — public page unchanged</span>`);
    }

    return buttons.join('');
  }

  const {
    getWorkspaceVoiceProfileIdForApi,
    ensureWorkspaceVoiceProfiles,
    initWorkspaceVoiceProfileSelect,
  } = voiceContext;

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
  trackPortalAction('generateResource');
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
      const createdId = data.resource?.id as string | undefined;
      
      if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.className = 'status-message success';
      }
      showNotification(message, 'success');
      form.reset();
      setTimeout(() => {
        console.log('[Portal] Refreshing resources after generation');
        void loadResources(createdId ? { revealResourceId: createdId } : undefined);
        loadDashboardData();
      }, 500);
    } else {
      const errorMsg = data.error || 'Generation failed';
      portalActionFailure('generateResource', new Error(errorMsg));
      if (statusDiv) {
        statusDiv.textContent = errorMsg;
        statusDiv.className = 'status-message error';
      }
      showNotification('Generation failed: ' + errorMsg, 'error');
      console.error('[Portal] Resource generation failed:', data);
    }
    } catch (error) {
      portalActionFailure('generateResource', error);
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
async function loadResources(options?: { revealResourceId?: string }): Promise<void> {
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

    const url = buildResourcesListUrl(getVoiceApiUrl(), { status: statusFilter || undefined, typeFilter });

    if (isDev) {
      console.log('[Portal] Fetching resources from:', url);
      console.log('[Portal] Session active:', sessionActive);
    }

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
    setWorkspaceResources(resources);
    
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

    if (options?.revealResourceId) {
      resetTreeStatusFilters();
      queueRevealResourceInTree(options.revealResourceId);
    }

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
          const perms = resourcePermissions(resource);
        
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
          
          if (resource.status === 'draft' && perms.publish) {
            primaryActions.push(`<button class="btn btn-success btn-sm" onclick="publishResource('${escapeHtml(resource.id)}')" aria-label="Publish">
              <svg class="btn-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Publish
            </button>`);
          }
          
          // Secondary actions (in dropdown)
          if (perms.edit) {
          secondaryActions.push(`<button class="btn" onclick="editResource('${escapeHtml(resource.id)}')">
            <svg class="btn-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            Edit
          </button>`);
          }
          
          secondaryActions.push(`<button class="btn" onclick="previewResource('${escapeHtml(resource.id)}')">
            <svg class="btn-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
            Preview
          </button>`);
          
          if (resource.status === 'published' && perms.unpublish) {
            secondaryActions.push(`<button class="btn" onclick="unpublishResource('${escapeHtml(resource.id)}')">
              <svg class="btn-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              Unpublish
            </button>`);
          }
          
          if (perms.improve) {
          secondaryActions.push(`<button class="btn" onclick="improveResource('${escapeHtml(resource.id)}')">
            <svg class="btn-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
              <polyline points="17 6 23 6 23 12"></polyline>
            </svg>
            Improve
          </button>`);
          }
          
          if (resource.status !== 'archived' && perms.archive) {
            secondaryActions.push(`<button class="btn" onclick="archiveResource('${escapeHtml(resource.id)}')">
              <svg class="btn-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="21 16 21 22 3 22 3 16"></polyline>
                <line x1="7" y1="16" x2="7" y2="2"></line>
                <line x1="17" y1="16" x2="17" y2="2"></line>
              </svg>
              Archive
            </button>`);
          } else if (perms.unarchive) {
            secondaryActions.push(`<button class="btn" onclick="unarchiveResource('${escapeHtml(resource.id)}')">
              <svg class="btn-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="5 8 10 13 19 2"></polyline>
              </svg>
              Unarchive
            </button>`);
          }
          
          if (perms.delete) {
          secondaryActions.push(`<button class="btn" onclick="deleteResource('${escapeHtml(resource.id)}')" style="color: var(--portal-error);">
            <svg class="btn-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            Delete
          </button>`);
          }

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

function resetTreeStatusFilters(): void {
  currentTreeStatusFilter = '';
  document.querySelectorAll('.tree-filters .filter-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-status') === '');
  });
}

function expandTreeAncestorsForResource(resourceId: string): void {
  const item = document.querySelector(`.tree-resource-item[data-resource-id="${resourceId}"]`);
  if (!item) return;
  let parentNode = item.closest('.tree-children')?.closest('.tree-node') ?? null;
  while (parentNode) {
    if (!parentNode.classList.contains('expanded')) {
      const nodeId = parentNode.querySelector('.tree-node-header')?.getAttribute('data-tree-node-id');
      if (nodeId) (window as any).toggleTreeNode(nodeId);
    }
    parentNode = parentNode.parentElement?.closest('.tree-children')?.closest('.tree-node') ?? null;
  }
}

function queueRevealResourceInTree(resourceId: string): void {
  window.setTimeout(() => {
    expandTreeAncestorsForResource(resourceId);
    if (getWorkspaceResources().some((r: { id?: string }) => r.id === resourceId)) {
      (window as any).selectResource(resourceId);
    }
    document.querySelector('.resource-workspace-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 150);
}

function getTreeResourcesForDisplay(resources: any[] = getWorkspaceResources()): any[] {
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
    if (getWorkspaceResources() && getWorkspaceResources().length > 0) {
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
    if (getWorkspaceResources() && getWorkspaceResources().length > 0) {
      // Re-render list view with current resources
      const listDiv = document.getElementById('resources-list');
      if (listDiv && getWorkspaceResources().length > 0) {
        // Trigger a re-render by calling loadResources which will use getWorkspaceResources()
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
    const filteredResources =
      currentTreeStatusFilter && currentTreeStatusFilter !== 'removed'
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
  const resource = getWorkspaceResources().find((r: any) => r.id === resourceId);
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
  detailEditResourceId = null;
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
      ${resource.portalRemovedAt ? `<span><strong>Workspace:</strong> <span class="badge badge-archived">Removed</span></span>` : ''}
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
      <div class="resource-detail-actions" style="margin-top: var(--space-xl); display: flex; gap: var(--space-sm); flex-wrap: wrap; align-items: center;">
        ${buildResourceActionsHtml(resource, 'detail')}
      </div>
    `;
  }
}

function industrySelectOptions(selectedSlug: string): string {
  const selected = normalizeIndustrySlug(selectedSlug);
  return industries
    .map(
      (industry) =>
        `<option value="${escapeHtml(industry.slug)}"${industry.slug === selected ? ' selected' : ''}>${escapeHtml(industry.name)}</option>`,
    )
    .join('');
}

function openDetailEditMode(id: string): void {
  const resource = getWorkspaceResources().find((r: any) => r.id === id);
  if (!resource) {
    showNotification('Resource not found.', 'error');
    return;
  }

  const perms = resourcePermissions(resource);
  if (!perms.edit) {
    showNotification(perms.editReason || 'You cannot edit this resource.', 'warning');
    return;
  }

  detailEditResourceId = id;
  const contentEl = document.getElementById('detail-content');
  if (!contentEl) return;

  const industrySlug = normalizeIndustrySlug(resource.industry);
  contentEl.innerHTML = `
    <form id="detail-edit-form" class="resource-detail-edit-form" action="javascript:void(0)">
      <div class="form-group">
        <label for="detail-edit-title">Title</label>
        <input type="text" id="detail-edit-title" class="form-control" value="${escapeHtml(resource.title || '')}" required />
      </div>
      <div class="form-group">
        <label for="detail-edit-industry">Industry</label>
        <select id="detail-edit-industry" class="form-control" required>
          <option value="">Select industry…</option>
          ${industrySelectOptions(industrySlug)}
        </select>
      </div>
      <div class="form-group">
        <label for="detail-edit-topic">Topic</label>
        <input type="text" id="detail-edit-topic" class="form-control" value="${escapeHtml(resource.topic || '')}" required />
      </div>
      <div class="form-group">
        <label for="detail-edit-description">Description</label>
        <textarea id="detail-edit-description" class="form-control" rows="3" required>${escapeHtml(resource.description || '')}</textarea>
      </div>
      <div class="form-group">
        <label for="detail-edit-content">Content</label>
        <textarea id="detail-edit-content" class="form-control resource-detail-edit-content" rows="16" required>${escapeHtml(resource.content || '')}</textarea>
      </div>
      <div class="resource-detail-actions" style="margin-top: var(--space-lg); display: flex; gap: var(--space-sm); flex-wrap: wrap;">
        <button type="submit" class="btn btn-primary">Save changes</button>
        <button type="button" class="btn btn-secondary" onclick="cancelDetailEdit()">Cancel</button>
      </div>
    </form>
  `;

  document.getElementById('detail-edit-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    void saveDetailEdit(id);
  });
  mountMarkdownFields(contentEl);
}

async function saveDetailEdit(id: string): Promise<void> {
  const title = (document.getElementById('detail-edit-title') as HTMLInputElement)?.value.trim();
  const industry = (document.getElementById('detail-edit-industry') as HTMLSelectElement)?.value;
  const topic = (document.getElementById('detail-edit-topic') as HTMLInputElement)?.value.trim();
  const description = (document.getElementById('detail-edit-description') as HTMLTextAreaElement)?.value.trim();
  const content = readMarkdownFieldValue('detail-edit-content');

  if (!title || !industry || !topic || !description || !content) {
    showNotification('Please fill in all required fields.', 'warning');
    return;
  }

  const resource = getWorkspaceResources().find((r: any) => r.id === id);
  const submitBtn = document.querySelector('#detail-edit-form button[type="submit"]') as HTMLButtonElement;
  const originalText = submitBtn?.textContent;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving…';
  }

  try {
    const response = await workspaceFetch(`${getVoiceApiUrl()}/resources/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        industry,
        topic,
        description,
        content,
        status: resource?.status,
      }),
    });
    const data = await response.json();
    if (response.ok && data.success) {
      showNotification('Resource updated successfully.', 'success');
      detailEditResourceId = null;
      await loadResources();
      const updated = getWorkspaceResources().find((r: any) => r.id === id) || data.resource;
      if (updated) {
        selectedResourceId = id;
        loadResourceDetail(updated);
      }
    } else {
      showNotification(`Failed to update resource: ${data.error || 'Unknown error'}`, 'error');
      if (submitBtn && originalText) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    }
  } catch (error) {
    showNotification('Connection error. Please try again.', 'error');
    console.error('[Portal] Detail edit error:', error);
    if (submitBtn && originalText) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  }
}

(window as any).cancelDetailEdit = function cancelDetailEdit(): void {
  if (!detailEditResourceId) return;
  const resource = getWorkspaceResources().find((r: any) => r.id === detailEditResourceId);
  detailEditResourceId = null;
  if (resource) loadResourceDetail(resource);
};

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

  const typeEl = document.getElementById('resource-type-filter') as HTMLSelectElement | null;
  if (status === 'removed') {
    if (typeEl) typeEl.value = 'removed';
    loadResources();
    return;
  }
  if (typeEl?.value === 'removed') {
    typeEl.value = 'user';
    loadResources();
    return;
  }
  
  // Update button states
  document.querySelectorAll('.tree-filters .btn').forEach(btn => {
    btn.classList.remove('active');
    if ((btn as HTMLElement).dataset.status === status) {
      btn.classList.add('active');
    }
  });
  
  // Rebuild tree with filter
  if (getWorkspaceResources() && getWorkspaceResources().length > 0) {
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

// View Resource Modal Functions
function openViewModal(id: string): void {
  const resource = getWorkspaceResources().find((r: any) => r.id === id);
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
  const resource = getWorkspaceResources().find((r: any) => r.id === id);
  if (!resource) {
    showNotification('Resource not found.', 'error');
    return;
  }

  const perms = resourcePermissions(resource);
  if (!perms.edit) {
    showNotification(perms.editReason || 'You cannot edit this resource.', 'warning');
    return;
  }

  const modal = document.getElementById('edit-resource-modal');
  if (!modal) return;

  (document.getElementById('edit-resource-id') as HTMLInputElement)!.value = resource.id;
  (document.getElementById('edit-resource-title-input') as HTMLInputElement)!.value = resource.title;
  const industrySelect = document.getElementById('edit-resource-industry') as HTMLSelectElement;
  if (industrySelect) {
    industrySelect.value = normalizeIndustrySlug(resource.industry);
  }
  (document.getElementById('edit-resource-topic') as HTMLInputElement)!.value = resource.topic;
  (document.getElementById('edit-resource-description') as HTMLTextAreaElement)!.value = resource.description;
  (document.getElementById('edit-resource-content') as HTMLTextAreaElement)!.value = resource.content;
  const statusSelect = document.getElementById('edit-resource-status') as HTMLSelectElement;
  if (statusSelect) {
    statusSelect.value = resource.status;
    const user = getWorkspaceUser();
    const isAdmin = user?.role === 'admin' || user?.role === 'super-admin';
    statusSelect.disabled = !isAdmin;
    statusSelect.title = isAdmin
      ? 'Change publication status'
      : 'Use Publish / Unpublish buttons to change live status';
  }

  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  mountMarkdownFields(modal);
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

(window as any).editResource = (id: string, mode?: string) => {
  if (mode === 'inline') {
    openDetailEditMode(id);
    return;
  }
  openEditModal(id);
};

(window as any).publishResource = async (id: string) => {
  const resource = getWorkspaceResources().find((r: any) => r.id === id);
  const perms = resource ? resourcePermissions(resource) : null;
  if (!perms?.publish) {
    showNotification('You cannot publish this resource.', 'warning');
    return;
  }

  const publishOk = await showConfirmDialog({
    title: 'Publish resource',
    message: 'Publish this resource? It will be visible on the website.',
    confirmLabel: 'Publish',
    variant: 'primary',
  });
  if (!publishOk) return;
  
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
  const resource = getWorkspaceResources().find((r: any) => r.id === id);
  const perms = resource ? resourcePermissions(resource) : null;
  if (!perms?.unpublish) {
    showNotification('You cannot unpublish this resource.', 'warning');
    return;
  }

  const unpublishOk = await showConfirmDialog({
    title: 'Unpublish resource',
    message: 'Unpublish this resource? It will no longer be visible on the public website.',
    details: 'Your draft copy stays in the workspace. You can edit and publish again later.',
    confirmLabel: 'Unpublish',
    variant: 'primary',
  });
  if (!unpublishOk) return;
  
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
  const archiveOk = await showConfirmDialog({
    title: 'Archive resource',
    message: 'Archive this resource? It will be hidden from normal views but can be restored later.',
    confirmLabel: 'Archive',
  });
  if (!archiveOk) return;
  
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
  const unarchiveOk = await showConfirmDialog({
    title: 'Unarchive resource',
    message: 'Unarchive this resource? It will be restored to draft status.',
    confirmLabel: 'Unarchive',
  });
  if (!unarchiveOk) return;
  
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
  trackPortalAction('saveResource');
  const form = e.target as HTMLFormElement;
  const formData = new FormData(form);
  const id = (document.getElementById('edit-resource-id') as HTMLInputElement)!.value;
  const resourceBefore = getWorkspaceResources().find((r: any) => r.id === id);
  const user = getWorkspaceUser();
  const isAdmin = user?.role === 'admin' || user?.role === 'super-admin';

  // Validate form
  const title = (document.getElementById('edit-resource-title-input') as HTMLInputElement)!.value.trim();
  const industry = (document.getElementById('edit-resource-industry') as HTMLSelectElement)!.value;
  const topic = (document.getElementById('edit-resource-topic') as HTMLInputElement)!.value.trim();
  const description = (document.getElementById('edit-resource-description') as HTMLTextAreaElement)!.value.trim();
  const content = readMarkdownFieldValue('edit-resource-content');

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
        status: isAdmin
          ? (document.getElementById('edit-resource-status') as HTMLSelectElement)!.value
          : resourceBefore?.status,
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
      portalActionFailure('saveResource', new Error(errorMsg));
      console.error('[Portal] Failed to update resource:', errorMsg);
      showNotification('Failed to update resource: ' + errorMsg, 'error');
      if (submitBtn && originalText) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    }
  } catch (error) {
    portalActionFailure('saveResource', error);
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
    const previewModal = document.getElementById('preview-resource-modal');
    
    if (viewModal && viewModal.getAttribute('aria-hidden') === 'false') {
      closeViewModal();
    }
    if (editModal && editModal.getAttribute('aria-hidden') === 'false') {
      closeEditModal();
    }
    if (previewModal && previewModal.getAttribute('aria-hidden') === 'false') {
      closePreviewModal();
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
  const resource = getWorkspaceResources().find((r: any) => r.id === id);
  const perms = resource ? resourcePermissions(resource) : null;
  if (!perms?.improve) {
    showNotification(
      resource?.status === 'published'
        ? 'Unpublish before running Improve on a live resource.'
        : 'You cannot improve this resource.',
      'warning',
    );
    return;
  }

  const improveOk = await showConfirmDialog({
    title: 'Improve resource',
    message: 'Improve this resource using voice profile + RAG + inference?',
    details: 'This may take a moment. Existing content will be rewritten.',
    confirmLabel: 'Improve',
    variant: 'primary',
  });
  if (!improveOk) return;
  
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
  const resource = getWorkspaceResources().find((r: any) => r.id === id);
  const perms = resource ? resourcePermissions(resource) : null;
  if (!perms?.delete) {
    showNotification(perms?.deleteReason || 'You cannot delete this resource.', 'warning');
    return;
  }

  const isPublishedRemove = resource?.status === 'published';
  const deleteOk = await showConfirmDialog({
    title: isPublishedRemove ? 'Remove from workspace' : 'Delete resource',
    message: isPublishedRemove
      ? 'Remove this resource from your workspace?'
      : 'Delete this resource permanently?',
    details: isPublishedRemove
      ? 'The public page and search index stay live. Use Unpublish first if you need to take it off the website.'
      : 'This action cannot be undone.',
    confirmLabel: isPublishedRemove ? 'Remove' : 'Delete',
    variant: 'danger',
  });
  if (!deleteOk) return;
  
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
      const message =
        data.softDeleted === true
          ? (data.message as string) || 'Removed from workspace. Public page unchanged.'
          : 'Resource deleted successfully.';
      showNotification(message, 'success');
      if (data.softDeleted) {
        (window as any).closeResourceDetail?.();
      }
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
  trackPortalAction('uploadResource');
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
  const publishOk = await showConfirmDialog({
    title: 'Publish resources',
    message: `Publish ${ids.length} resource(s)? They will be visible on the website.`,
    confirmLabel: 'Publish all',
    variant: 'primary',
  });
  if (!publishOk) return;
  
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
  const unpublishOk = await showConfirmDialog({
    title: 'Unpublish resources',
    message: `Unpublish ${ids.length} resource(s)? They will be removed from the public website.`,
    confirmLabel: 'Unpublish all',
    variant: 'primary',
  });
  if (!unpublishOk) return;
  
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

  const deletableIds = ids.filter((id) => {
    const resource = getWorkspaceResources().find((r: any) => r.id === id);
    return resource && resourcePermissions(resource).delete;
  });

  if (deletableIds.length === 0) {
    showNotification(
      'None of the selected resources can be deleted. Unpublish live resources first.',
      'warning',
    );
    return;
  }

  if (deletableIds.length < ids.length) {
    showNotification(
      `${ids.length - deletableIds.length} live resource(s) skipped — unpublish before deleting.`,
      'info',
    );
  }

  const deleteOk = await showConfirmDialog({
    title: 'Delete resources',
    message: `Delete ${deletableIds.length} resource(s) permanently?`,
    details: 'This cannot be undone.',
    confirmLabel: 'Delete all',
    variant: 'danger',
  });
  if (!deleteOk) return;
  
  try {
    const results = await Promise.all(deletableIds.map(id =>
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
  openPreviewModal(id);
};

function openPreviewModal(id: string): void {
  const resource = getWorkspaceResources().find((r: any) => r.id === id);
  if (!resource) {
    showNotification('Resource not found.', 'error');
    return;
  }

  const modal = document.getElementById('preview-resource-modal');
  const titleEl = document.getElementById('preview-resource-title');
  const bodyEl = document.getElementById('preview-resource-body');
  const editBtn = document.getElementById('edit-from-preview-btn');
  if (!modal || !titleEl || !bodyEl) return;

  titleEl.textContent = resource.title || 'Preview';
  editBtn?.setAttribute('onclick', `closePreviewModal(); editResource('${id}');`);

  const voiceScore = resource.metadata?.voiceScore || 0;
  const voiceScoreText = voiceScore ? `${Math.round(voiceScore * 100)}%` : 'N/A';

  bodyEl.innerHTML = `
    <div class="resource-preview-meta">
      <span class="badge badge-${escapeHtml(resource.status)}">${escapeHtml(resource.status)}</span>
      ${resource.portalRemovedAt ? '<span class="badge badge-archived">Removed from workspace</span>' : ''}
      <span class="voice-score">Voice score: ${voiceScoreText}</span>
    </div>
    <p class="resource-preview-description">${escapeHtml(resource.description || '')}</p>
    ${wrapMarkdownDocument(resource.content || '')}
  `;

  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closePreviewModal(): void {
  const modal = document.getElementById('preview-resource-modal');
  if (modal) {
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
}

(window as any).closePreviewModal = closePreviewModal;

(window as any).restoreResource = async (id: string) => {
  const resource = getWorkspaceResources().find((r: any) => r.id === id);
  const perms = resource ? resourcePermissions(resource) : null;
  if (!perms?.restore) {
    showNotification('You cannot restore this resource.', 'warning');
    return;
  }

  const restoreOk = await showConfirmDialog({
    title: 'Restore to workspace',
    message: 'Show this resource again in the workspace tree?',
    details: 'The public page and search index are unchanged.',
    confirmLabel: 'Restore',
    variant: 'primary',
  });
  if (!restoreOk) return;

  try {
    const response = await workspaceFetch(`${getVoiceApiUrl()}/resources/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restoreToWorkspace: true }),
    });
    const data = await response.json();
    if (response.ok && data.success) {
      showNotification('Resource restored to workspace.', 'success');
      const typeEl = document.getElementById('resource-type-filter') as HTMLSelectElement | null;
      if (typeEl?.value === 'removed') typeEl.value = 'user';
      currentTreeStatusFilter = '';
      await loadResources({ revealResourceId: id });
    } else {
      showNotification(data.error || 'Failed to restore resource.', 'error');
    }
  } catch (error) {
    showNotification('Connection error. Please try again.', 'error');
    console.error('[Portal] Restore error:', error);
  }
};

// Deduplicate Resources Handler
document.getElementById('deduplicate-resources-btn')?.addEventListener('click', async () => {
  const btn = document.getElementById('deduplicate-resources-btn') as HTMLButtonElement;
  if (!btn) return;
  
  const dedupeOk = await showConfirmDialog({
    title: 'Deduplicate resources',
    message: 'Remove duplicate resources (same industry + topic)?',
    details: 'The best version of each duplicate group will be kept.',
    confirmLabel: 'Deduplicate',
    variant: 'primary',
  });
  if (!dedupeOk) {
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
  
  const seedOk = await showConfirmDialog({
    title: 'Seed resources',
    message: 'Create initial resources from all industries and topics?',
    details: 'New resources are created as drafts in your library.',
    confirmLabel: 'Seed',
    variant: 'primary',
  });
  if (!seedOk) {
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

  setupResourceFilters();
  initializeCollapsibleSections();
  initWorkspaceVoiceProfileSelect();

  return {
    loadResources,
    selectResource(resourceId: string) {
      (window as any).selectResource(resourceId);
    },
  };
}
