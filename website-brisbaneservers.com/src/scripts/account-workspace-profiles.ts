// @ts-nocheck — profiles panel (extracted from account-workspace-app)
import { workspaceFetch } from '../lib/client-api';
import { escapeHtml, showWorkspaceNotification } from './account-workspace-utils';
import { showConfirmDialog } from './portal-confirm-dialog';

export type ProfilesWorkspaceDeps = {
  getVoiceApiUrl: () => string;
  navigateToPanel: (panel: string) => void;
  ensureWorkspaceVoiceProfiles: () => Promise<void>;
  isDev: boolean;
};

export function registerProfilesWorkspace(deps: ProfilesWorkspaceDeps): {
  loadProfiles: () => Promise<void>;
  createBaseProfile: () => Promise<void>;
} {
  const { getVoiceApiUrl, navigateToPanel, ensureWorkspaceVoiceProfiles, isDev } = deps;
  const showNotification = showWorkspaceNotification;

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
    `<button type="button" class="btn btn-primary btn-sm" onclick="event.stopPropagation(); useProfileForGenerate('${pid}')">Generate with</button>` +
    `</div>` +
    `</article>`
  );
}

function renderProfileCardsGrid(profiles: Record<string, unknown>[]): void {
  const listDiv = document.getElementById('profiles-list');
  if (!listDiv) return;
  listDiv.className = 'profiles-list profiles-list-sidebar';
  listDiv.innerHTML = profiles.map((profile) => renderProfileCardV1(profile)).join('');
}

function resetProfileDetailWorkspace(): void {
  document.getElementById('profile-workspace-empty')?.classList.remove('hidden');
  document.getElementById('profile-detail-panel')?.classList.add('hidden');
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
      resetProfileDetailWorkspace();
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

    const initial =
      profiles.find((p: Record<string, unknown>) => p.isDefault && !p.archived) ||
      profiles.find((p: Record<string, unknown>) => !p.archived) ||
      profiles[0];
    if (initial?.id) {
      (window as any).selectProfile(String(initial.id));
    }

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
        Accept: 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.profile?.id) {
        const id = String(data.profile.id);
        (window as any).selectProfile?.(id);
        void (window as any).viewProfile?.(id);
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

// View Profile — inline workspace pane (profiles panel) with modal fallback
function buildProfileMetaHtml(profile: Record<string, unknown>): string {
  return `<div class="profiles-detail-meta-grid">
    <p><strong>Voice name:</strong> ${escapeHtml(String(profile.voiceName || 'N/A'))}</p>
    <p><strong>Version:</strong> ${escapeHtml(String(profile.version || 'N/A'))}</p>
    <p><strong>Description:</strong> ${escapeHtml(String(profile.description || 'No description'))}</p>
    <p><strong>Created:</strong> ${profile.createdAt ? new Date(String(profile.createdAt)).toLocaleString() : 'N/A'}</p>
    <p><strong>Tags:</strong> ${Array.isArray(profile.tags) && profile.tags.length ? (profile.tags as string[]).map((t) => escapeHtml(t)).join(', ') : 'None'}</p>
  </div>`;
}

function buildProfileStatsInlineHtml(profile: Record<string, unknown>, corpusIds: string[]): string {
  const stats = (profile.stats as Record<string, unknown>) || {};
  return `<div class="profile-card-v1__stats profiles-detail-stats-grid">
    <div class="profile-card-v1__stat"><span class="profile-card-v1__stat-label">Corpus</span><span class="profile-card-v1__stat-value">${stats.corpusResourceCount ?? corpusIds.length ?? 0}</span></div>
    <div class="profile-card-v1__stat"><span class="profile-card-v1__stat-label">Linked resources</span><span class="profile-card-v1__stat-value">${stats.linkedResourceCount ?? 0}</span></div>
    <div class="profile-card-v1__stat"><span class="profile-card-v1__stat-label">Avg voice score</span><span class="profile-card-v1__stat-value">${typeof stats.avgVoiceScore === 'number' ? Math.round(stats.avgVoiceScore * 100) + '%' : '—'}</span></div>
  </div>
  <p class="profiles-detail-hint">Use <strong>Generate with this voice</strong> below or pick this profile in Create content.</p>`;
}

function buildProfileCorpusInlineHtml(profile: Record<string, unknown>, corpusIds: string[]): string {
  if (corpusIds.length === 0) return '';
  const idToTitle = new Map(
    (currentResources || []).map((r: { id?: string; title?: string; topic?: string }) => [
      r.id || '',
      r.title || r.topic || r.id || '',
    ])
  );
  const corpusListHtml = corpusIds
    .slice(0, 32)
    .map((rid: string) => {
      const label = idToTitle.get(rid) || rid;
      return `<li><span class="profiles-corpus-id">${escapeHtml(rid)}</span> — ${escapeHtml(String(label))}</li>`;
    })
    .join('');
  const corpusMore =
    corpusIds.length > 32 ? `<li class="profiles-corpus-more">…and ${corpusIds.length - 32} more</li>` : '';
  return `<div class="profiles-detail-corpus-card">
    <h4>Resource corpus (${corpusIds.length})</h4>
    <p class="profiles-detail-hint">On-repo resources that contributed text. Rings and matrix below summarise resulting voice characteristics.</p>
    <ul class="profiles-corpus-list">${corpusListHtml}${corpusMore}</ul>
  </div>`;
}

function buildProfileActionsHtml(profile: Record<string, unknown>): string {
  const pid = escapeHtml(String(profile.id));
  if (profile.id === 'default') {
    return '<span class="profiles-detail-hint">Bundled default is read-only. Use <strong>Build / refresh BIGPONS</strong> above to save a site corpus voice in storage.</span>';
  }
  const parts: string[] = [];
  if (!profile.isDefault) {
    parts.push(`<button type="button" class="btn btn-success btn-sm" onclick="setDefaultProfile('${pid}', true)">Set as default</button>`);
  }
  if (profile.archived) {
    parts.push(`<button type="button" class="btn btn-warning btn-sm" onclick="unarchiveProfile('${pid}', this)">Unarchive</button>`);
  } else {
    parts.push(`<button type="button" class="btn btn-secondary btn-sm" onclick="archiveProfile('${pid}', this)">Archive</button>`);
  }
  parts.push(`<button type="button" class="btn btn-primary btn-sm" onclick="useProfileForGenerate('${pid}')">Generate with this voice</button>`);
  return parts.join('');
}

function renderProfileDetailInline(profile: Record<string, unknown>): void {
  const panel = document.getElementById('profile-detail-panel');
  if (!panel) return;

  document.getElementById('profile-workspace-empty')?.classList.add('hidden');
  panel.classList.remove('hidden');

  const titleEl = document.getElementById('profile-detail-title');
  const subtitleEl = document.getElementById('profile-detail-subtitle');
  const badgeEl = document.getElementById('profile-detail-badge') as HTMLElement | null;
  if (titleEl) titleEl.textContent = String(profile.name || 'Unnamed');
  if (subtitleEl) subtitleEl.textContent = String(profile.voiceName || '');
  if (badgeEl) {
    const isDefault = Boolean(profile.isDefault);
    const isArchived = Boolean(profile.archived);
    badgeEl.hidden = false;
    badgeEl.className =
      'profile-item-badge ' + (isDefault ? 'badge-published' : isArchived ? 'badge-archived' : 'badge-draft');
    badgeEl.textContent = isDefault ? 'Default' : isArchived ? 'Archived' : 'Active';
  }

  const corpusIds: string[] = Array.isArray(profile.corpusResourceIds) ? (profile.corpusResourceIds as string[]) : [];
  const meta = document.getElementById('profile-detail-meta');
  if (meta) meta.innerHTML = buildProfileMetaHtml(profile);
  const statsEl = document.getElementById('profile-detail-stats');
  if (statsEl) statsEl.innerHTML = buildProfileStatsInlineHtml(profile, corpusIds);
  const corpusEl = document.getElementById('profile-detail-corpus');
  if (corpusEl) corpusEl.innerHTML = buildProfileCorpusInlineHtml(profile, corpusIds);

  const viz = document.getElementById('profile-detail-viz');
  if (viz) {
    viz.innerHTML = '';
    renderProfileVisualizations(profile, viz);
  }

  const actions = document.getElementById('profile-detail-actions');
  if (actions) actions.innerHTML = buildProfileActionsHtml(profile);
}

function openProfileDetailModal(profile: Record<string, unknown>): void {
  const corpusIds: string[] = Array.isArray(profile.corpusResourceIds) ? (profile.corpusResourceIds as string[]) : [];
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
        <h2>Voice Profile: ${escapeHtml(String(profile.name || 'Unnamed'))}</h2>
        <button class="modal-close" onclick="this.closest('.modal').remove(); document.body.style.overflow = '';" aria-label="Close modal">&times;</button>
      </div>
      <div class="modal-body">
        ${buildProfileMetaHtml(profile)}
        ${buildProfileStatsInlineHtml(profile, corpusIds)}
        ${buildProfileCorpusInlineHtml(profile, corpusIds)}
      </div>
      <div class="modal-footer profiles-detail-actions">
        ${buildProfileActionsHtml(profile)}
        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal')?.remove(); document.body.style.overflow = '';">Close</button>
      </div>
    </div>
  `;

  const modalBody = modal.querySelector('.modal-body');
  if (modalBody) modalBody.appendChild(visualizationContainer);

  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';
}

(window as any).viewProfile = async (id: string) => {
  try {
    const response = await workspaceFetch(`${getVoiceApiUrl()}/profiles`, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      const profile = data.profiles?.find((p: Record<string, unknown>) => p.id === id);
      if (profile) {
        if (document.getElementById('profile-detail-panel')) {
          renderProfileDetailInline(profile);
          return;
        }
        openProfileDetailModal(profile);
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
    resetProfileDetailWorkspace();
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

  listDiv.className = 'profiles-list profiles-list-sidebar';
  listDiv.innerHTML = filteredProfiles.map((profile: Record<string, unknown>) => renderProfileCardV1(profile)).join('');

  const initial =
    filteredProfiles.find((p: Record<string, unknown>) => p.isDefault && !p.archived) ||
    filteredProfiles.find((p: Record<string, unknown>) => !p.archived) ||
    filteredProfiles[0];
  if (initial?.id) {
    (window as any).selectProfile?.(String(initial.id));
  }
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
    const ok = await showConfirmDialog({
      title: 'Set default voice profile',
      message:
        'Set this profile as the default voice profile? New resource runs that use “Auto” will prefer this saved profile when present.',
      confirmLabel: 'Set default',
      variant: 'primary',
    });
    if (!ok) return;
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
  
  const dedupeOk = await showConfirmDialog({
    title: 'Sculpt profile library',
    message:
      'Analyze and merge duplicate profiles using neural similarity matching?',
    details: 'The best version of each duplicate group will be kept and merged.',
    confirmLabel: 'Sculpt library',
    variant: 'primary',
  });
  if (!dedupeOk) {
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
  document.getElementById('refresh-profiles')?.addEventListener('click', loadProfiles);

  return { loadProfiles, createBaseProfile };
}
