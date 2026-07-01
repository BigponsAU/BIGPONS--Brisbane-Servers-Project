/**
 * Workspace sidebar command palette — panel jump, resource/profile/voice prefixes.
 * UX mirrors public SemanticSearch: suggestions dropdown, Enter to run, no auto-nav on type.
 */
import { workspaceNavItems, type WorkspacePanelId } from '../data/account-workspace';

export const GLOBAL_SEARCH_PANEL_ALIASES: Record<string, WorkspacePanelId> = {
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

const PREFIX_HINTS = [
  { prefix: 'panel:', label: 'Jump to panel', example: 'panel:resources' },
  { prefix: 'resource:', label: 'Search resources', example: 'resource:compliance' },
  { prefix: 'profile:', label: 'Filter voice profiles', example: 'profile:brisbane' },
  { prefix: 'voice:', label: 'Paste into voice lab', example: 'voice:draft paragraph' },
] as const;

export interface WorkspaceGlobalSearchDeps {
  navigateToPanel: (panel: string) => void;
  applyResourceSearchQuery: (query: string) => void;
  filterProfileCardsByQuery: (query: string) => void;
}

type SearchSuggestion =
  | { kind: 'panel'; panel: string; label: string; detail: string; query: string }
  | { kind: 'prefix'; label: string; detail: string; query: string }
  | { kind: 'action'; label: string; detail: string; query: string };

let bound = false;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function visiblePanelItems(): typeof workspaceNavItems {
  return workspaceNavItems.filter((item) => {
    const link = document.querySelector<HTMLElement>(
      `.sidebar-nav-item[data-panel="${item.panel}"]`,
    );
    return link && link.offsetParent !== null && !link.hidden;
  });
}

function buildSuggestions(rawQuery: string): SearchSuggestion[] {
  const query = rawQuery.trim();
  const lower = query.toLowerCase();
  const suggestions: SearchSuggestion[] = [];

  if (!query) {
    for (const hint of PREFIX_HINTS) {
      suggestions.push({
        kind: 'prefix',
        label: hint.label,
        detail: hint.example,
        query: hint.example,
      });
    }
    for (const item of visiblePanelItems().slice(0, 8)) {
      suggestions.push({
        kind: 'panel',
        panel: item.panel,
        label: item.label,
        detail: item.description,
        query: `panel:${item.panel}`,
      });
    }
    return suggestions;
  }

  for (const hint of PREFIX_HINTS) {
    if (hint.prefix.startsWith(lower) || hint.label.toLowerCase().includes(lower)) {
      suggestions.push({
        kind: 'prefix',
        label: hint.label,
        detail: hint.example,
        query: query.includes(':') ? query : hint.example,
      });
    }
  }

  for (const item of visiblePanelItems()) {
    const haystack = `${item.label} ${item.panel} ${item.description}`.toLowerCase();
    if (haystack.includes(lower)) {
      suggestions.push({
        kind: 'panel',
        panel: item.panel,
        label: item.label,
        detail: item.description,
        query: `panel:${item.panel}`,
      });
    }
  }

  const aliasPanel = GLOBAL_SEARCH_PANEL_ALIASES[lower];
  if (aliasPanel && !suggestions.some((s) => s.kind === 'panel' && s.panel === aliasPanel)) {
    const nav = workspaceNavItems.find((item) => item.panel === aliasPanel);
    suggestions.unshift({
      kind: 'panel',
      panel: aliasPanel,
      label: nav?.label ?? aliasPanel,
      detail: 'Open panel',
      query: `panel:${aliasPanel}`,
    });
  }

  if (!lower.includes(':')) {
    suggestions.push({
      kind: 'action',
      label: `Search resources for “${query}”`,
      detail: 'Opens Resources with this filter',
      query,
    });
  }

  return suggestions.slice(0, 8);
}

export function applyGlobalSearchQuery(rawQuery: string, deps: WorkspaceGlobalSearchDeps): void {
  const query = rawQuery.trim();
  if (!query) return;

  const lower = query.toLowerCase();

  if (lower.startsWith('panel:')) {
    const panelQuery = query.slice(6).trim().toLowerCase();
    const panelTarget = GLOBAL_SEARCH_PANEL_ALIASES[panelQuery] ?? panelQuery;
    deps.navigateToPanel(panelTarget);
    return;
  }

  if (lower.startsWith('resource:')) {
    deps.applyResourceSearchQuery(query.slice(9).trim());
    return;
  }

  if (lower.startsWith('profile:')) {
    const profileQuery = query.slice(8).trim();
    deps.navigateToPanel('profiles');
    window.setTimeout(() => deps.filterProfileCardsByQuery(profileQuery), 150);
    return;
  }

  if (lower.startsWith('voice:')) {
    const voiceText = query.slice(6).trim();
    deps.navigateToPanel('voice-lab');
    window.setTimeout(() => {
      const textarea = document.getElementById('voice-lab-text') as HTMLTextAreaElement | null;
      if (textarea && voiceText) textarea.value = voiceText;
    }, 150);
    return;
  }

  const panelTarget = GLOBAL_SEARCH_PANEL_ALIASES[lower];
  if (panelTarget) {
    deps.navigateToPanel(panelTarget);
    return;
  }

  deps.applyResourceSearchQuery(query);
}

function renderSuggestions(
  resultsEl: HTMLElement,
  input: HTMLInputElement,
  suggestions: SearchSuggestion[],
  onPick: (query: string) => void,
): void {
  if (!suggestions.length) {
    resultsEl.innerHTML =
      '<div class="workspace-global-search__hint" role="status">No matches — press Enter to search resources.</div>';
    resultsEl.classList.add('active');
    input.setAttribute('aria-expanded', 'true');
    return;
  }

  resultsEl.innerHTML = suggestions
    .map((item, index) => {
      const badge =
        item.kind === 'panel' ? 'Panel' : item.kind === 'prefix' ? 'Prefix' : 'Search';
      return `<button type="button" class="workspace-global-search__option" role="option" data-index="${index}" data-query="${escapeHtml(item.query)}">
        <span class="workspace-global-search__option-badge">${badge}</span>
        <span class="workspace-global-search__option-body">
          <span class="workspace-global-search__option-label">${escapeHtml(item.label)}</span>
          <span class="workspace-global-search__option-detail">${escapeHtml(item.detail)}</span>
        </span>
      </button>`;
    })
    .join('');

  resultsEl.querySelectorAll<HTMLButtonElement>('.workspace-global-search__option').forEach((btn) => {
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const picked = btn.dataset.query ?? '';
      onPick(picked);
    });
  });

  resultsEl.classList.add('active');
  input.setAttribute('aria-expanded', 'true');
}

function closeSuggestions(resultsEl: HTMLElement, input: HTMLInputElement): void {
  resultsEl.classList.remove('active');
  input.setAttribute('aria-expanded', 'false');
}

export function bootWorkspaceGlobalSearch(deps: WorkspaceGlobalSearchDeps): void {
  const root = document.querySelector<HTMLElement>('[data-workspace-global-search]');
  const input = document.getElementById('global-search') as HTMLInputElement | null;
  const resultsEl = document.getElementById('workspace-global-search-results');
  const form = root?.querySelector('form');

  if (!root || !input || !resultsEl || bound) return;
  bound = true;

  const refreshSuggestions = (): void => {
    renderSuggestions(resultsEl, input, buildSuggestions(input.value), (picked) => {
      input.value = picked;
      applyGlobalSearchQuery(picked, deps);
      closeSuggestions(resultsEl, input);
      input.blur();
    });
  };

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = input.value.trim();
    if (query) {
      applyGlobalSearchQuery(query, deps);
      closeSuggestions(resultsEl, input);
    }
  });

  input.addEventListener('input', () => {
    refreshSuggestions();
  });

  input.addEventListener('focus', () => {
    refreshSuggestions();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      input.value = '';
      closeSuggestions(resultsEl, input);
      input.blur();
      return;
    }

    if (e.key === 'ArrowDown') {
      const first = resultsEl.querySelector<HTMLButtonElement>('.workspace-global-search__option');
      if (first) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  resultsEl.addEventListener('keydown', (e) => {
    const target = e.target as HTMLElement;
    if (!target.classList.contains('workspace-global-search__option')) return;
    const options = [...resultsEl.querySelectorAll<HTMLButtonElement>('.workspace-global-search__option')];
    const index = options.indexOf(target as HTMLButtonElement);
    if (e.key === 'ArrowDown' && index < options.length - 1) {
      e.preventDefault();
      options[index + 1]?.focus();
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (index <= 0) input.focus();
      else options[index - 1]?.focus();
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const picked = (target as HTMLButtonElement).dataset.query ?? '';
      input.value = picked;
      applyGlobalSearchQuery(picked, deps);
      closeSuggestions(resultsEl, input);
    }
  });

  document.addEventListener('click', (e) => {
    if (!root.contains(e.target as Node)) {
      closeSuggestions(resultsEl, input);
    }
  });
}

export function focusWorkspaceGlobalSearch(): void {
  const input = document.getElementById('global-search') as HTMLInputElement | null;
  if (!input) return;
  input.focus();
  input.select();
}
