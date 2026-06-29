// @ts-nocheck
/**
 * Voice profile picker + context bar on the Resources panel.
 */
import { workspaceFetch } from '../lib/client-api';

const PORTAL_RESOURCE_VOICE_PROFILE_KEY = 'portalResourceVoiceProfileId';

export type VoiceContextDeps = {
  getVoiceApiUrl: () => string;
  isDev: boolean;
};

export function createVoiceContext(deps: VoiceContextDeps) {
  const { getVoiceApiUrl, isDev } = deps;

  function getWorkspaceVoiceProfileIdForApi(): string | undefined {
    const sel = document.getElementById('resource-voice-profile-select') as HTMLSelectElement | null;
    const value = sel?.value?.trim();
    return value || undefined;
  }

  function setVoiceProfileSelectMessage(message: string): void {
    const sel = document.getElementById('resource-voice-profile-select') as HTMLSelectElement | null;
    if (!sel) return;
    sel.innerHTML = '';
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = message;
    sel.appendChild(opt);
  }

  function populateWorkspaceVoiceProfileSelect(profiles: unknown[]): void {
    const sel = document.getElementById('resource-voice-profile-select') as HTMLSelectElement | null;
    if (!sel) return;

    sel.innerHTML = '<option value="">Auto (saved default or library-derived)</option>';

    for (const raw of profiles) {
      const profile = raw as { id?: string; name?: string; voiceName?: string; isDefault?: boolean; archived?: boolean };
      if (!profile.id || profile.archived) continue;
      const opt = document.createElement('option');
      opt.value = profile.id;
      const label = profile.name || profile.voiceName || profile.id;
      opt.textContent = profile.isDefault ? `${label} (default)` : label;
      sel.appendChild(opt);
    }

    const ids = new Set(
      (profiles as { id?: string }[]).map((p) => String(p.id)).filter(Boolean),
    );
    const stored = localStorage.getItem(PORTAL_RESOURCE_VOICE_PROFILE_KEY) || '';
    if (stored && ids.has(stored)) {
      sel.value = stored;
    } else {
      const def = (profiles as { isDefault?: boolean; id?: string }[]).find((p) => p.isDefault);
      if (def?.id) sel.value = String(def.id);
      else sel.value = '';
    }

    if (sel.value) {
      localStorage.setItem(PORTAL_RESOURCE_VOICE_PROFILE_KEY, sel.value);
    } else {
      localStorage.removeItem(PORTAL_RESOURCE_VOICE_PROFILE_KEY);
    }

    syncVoiceContextBar(profiles);
  }

  function syncVoiceContextBar(profiles?: unknown[]): void {
    const summary = document.getElementById('voice-context-summary');
    if (!summary) return;

    const list =
      profiles ?? ((window as unknown as { allProfiles?: unknown[] }).allProfiles ?? []);
    const sel = document.getElementById('resource-voice-profile-select') as HTMLSelectElement | null;
    const selected = sel?.selectedOptions?.[0]?.textContent?.trim() || 'Auto';
    const def = (list as { isDefault?: boolean; name?: string; voiceName?: string }[]).find(
      (p) => p.isDefault,
    );
    const defLabel = def ? String(def.name || def.voiceName || 'Default') : 'None set';
    summary.textContent = `Creating with: ${selected} · Workspace default: ${defLabel}`;
  }

  function initWorkspaceVoiceProfileSelect(): void {
    const sel = document.getElementById('resource-voice-profile-select') as HTMLSelectElement | null;
    if (!sel || sel.dataset.bound === '1') return;
    sel.dataset.bound = '1';
    sel.addEventListener('change', () => {
      if (sel.value) {
        localStorage.setItem(PORTAL_RESOURCE_VOICE_PROFILE_KEY, sel.value);
      } else {
        localStorage.removeItem(PORTAL_RESOURCE_VOICE_PROFILE_KEY);
      }
      syncVoiceContextBar();
    });
  }

  async function ensureWorkspaceVoiceProfiles(): Promise<void> {
    const cached = (window as unknown as { allProfiles?: unknown[] }).allProfiles;
    if (cached?.length) {
      populateWorkspaceVoiceProfileSelect(cached);
      return;
    }

    try {
      const response = await workspaceFetch(`${getVoiceApiUrl()}/profiles`, {
        headers: { Accept: 'application/json' },
        credentials: 'include',
      });
      if (!response.ok) {
        setVoiceProfileSelectMessage('Voice profiles unavailable');
        return;
      }
      const data = await response.json();
      if (!data.success || !Array.isArray(data.profiles)) {
        setVoiceProfileSelectMessage('Voice profiles unavailable');
        return;
      }
      (window as unknown as { allProfiles?: unknown[] }).allProfiles = data.profiles;
      populateWorkspaceVoiceProfileSelect(data.profiles);
    } catch (e) {
      setVoiceProfileSelectMessage('Could not load voice profiles');
      if (isDev) console.warn('[Portal] ensureWorkspaceVoiceProfiles:', e);
    }
  }

  return {
    getWorkspaceVoiceProfileIdForApi,
    initWorkspaceVoiceProfileSelect,
    ensureWorkspaceVoiceProfiles,
    syncVoiceContextBar,
    populateWorkspaceVoiceProfileSelect,
  };
}

export type VoiceContextApi = ReturnType<typeof createVoiceContext>;
