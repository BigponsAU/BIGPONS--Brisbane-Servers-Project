/**
 * Persist how the resources create/tree UI was left so reloads and list
 * refreshes do not snap back to a default open first-industry menu.
 */
const STORAGE_KEY = 'portal-resources-ui-state';

export type ResourcesUiState = {
  expandedIndustries: string[];
  expandedTopics: string[];
  sections: Record<string, boolean>;
  lastIndustry: string;
  lastTopic: string;
  lastWordCount: string;
};

const EMPTY: ResourcesUiState = {
  expandedIndustries: [],
  expandedTopics: [],
  sections: {},
  lastIndustry: '',
  lastTopic: '',
  lastWordCount: '',
};

export function topicExpansionKey(industry: string, topic: string): string {
  return `${industry}::${topic}`;
}

export function loadResourcesUiState(): ResourcesUiState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY, sections: {} };
    const parsed = JSON.parse(raw) as Partial<ResourcesUiState>;
    return {
      expandedIndustries: Array.isArray(parsed.expandedIndustries)
        ? parsed.expandedIndustries.filter((v): v is string => typeof v === 'string')
        : [],
      expandedTopics: Array.isArray(parsed.expandedTopics)
        ? parsed.expandedTopics.filter((v): v is string => typeof v === 'string')
        : [],
      sections: parsed.sections && typeof parsed.sections === 'object' ? { ...parsed.sections } : {},
      lastIndustry: typeof parsed.lastIndustry === 'string' ? parsed.lastIndustry : '',
      lastTopic: typeof parsed.lastTopic === 'string' ? parsed.lastTopic : '',
      lastWordCount: typeof parsed.lastWordCount === 'string' ? parsed.lastWordCount : '',
    };
  } catch {
    return { ...EMPTY, sections: {} };
  }
}

export function saveResourcesUiState(partial: Partial<ResourcesUiState>): ResourcesUiState {
  const current = loadResourcesUiState();
  const next: ResourcesUiState = {
    ...current,
    ...partial,
    sections: { ...current.sections, ...(partial.sections || {}) },
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota / private mode */
  }
  return next;
}

export function rememberCreateFields(fields: {
  industry?: string;
  topic?: string;
  wordCount?: string;
}): void {
  const patch: Partial<ResourcesUiState> = {};
  if (fields.industry !== undefined) patch.lastIndustry = fields.industry;
  if (fields.topic !== undefined) patch.lastTopic = fields.topic;
  if (fields.wordCount !== undefined) patch.lastWordCount = fields.wordCount;
  saveResourcesUiState(patch);
}
