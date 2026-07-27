// @ts-nocheck
/**
 * Voice profile picker + context bar (Resources + sidebar).
 */
import { workspaceFetch } from '../lib/client-api';

const PORTAL_RESOURCE_VOICE_PROFILE_KEY = 'portalResourceVoiceProfileId';

const VOICE_PROFILE_SELECT_IDS = [
  'resource-voice-profile-select',
  'sidebar-voice-profile-select',
] as const;

export type VoiceContextDeps = {
  getVoiceApiUrl: () => string;
  isDev: boolean;
};

function voiceProfileSelects(): HTMLSelectElement[] {
  return VOICE_PROFILE_SELECT_IDS.map((id) => document.getElementById(id) as HTMLSelectElement | null).filter(
    (el): el is HTMLSelectElement => Boolean(el),
  );
}

export function createVoiceContext(deps: VoiceContextDeps) {
  const { getVoiceApiUrl, isDev } = deps;

  function getWorkspaceVoiceProfileIdForApi(): string | undefined {
    for (const sel of voiceProfileSelects()) {
      const value = sel.value?.trim();
      if (value) return value;
    }
    return undefined;
  }

  function setVoiceProfileSelectMessage(message: string): void {
    for (const sel of voiceProfileSelects()) {
      sel.innerHTML = '';
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = message;
      sel.appendChild(opt);
    }
  }

  function applySelectedVoiceProfileId(profileId: string): void {
    for (const sel of voiceProfileSelects()) {
      if ([...sel.options].some((o) => o.value === profileId) || profileId === '') {
        sel.value = profileId;
      }
    }
    if (profileId) {
      localStorage.setItem(PORTAL_RESOURCE_VOICE_PROFILE_KEY, profileId);
    } else {
      localStorage.removeItem(PORTAL_RESOURCE_VOICE_PROFILE_KEY);
    }
    syncVoiceContextBar();
    syncVoiceMapProfileLink();
  }

  function populateWorkspaceVoiceProfileSelect(profiles: unknown[]): void {
    const selects = voiceProfileSelects();
    if (!selects.length) return;

    for (const sel of selects) {
      sel.innerHTML = '<option value="">Auto (saved default or library-derived)</option>';

      for (const raw of profiles) {
        const profile = raw as {
          id?: string;
          name?: string;
          voiceName?: string;
          isDefault?: boolean;
          archived?: boolean;
        };
        if (!profile.id || profile.archived) continue;
        const opt = document.createElement('option');
        opt.value = profile.id;
        const label = profile.name || profile.voiceName || profile.id;
        opt.textContent = profile.isDefault ? `${label} (default)` : label;
        sel.appendChild(opt);
      }
    }

    const ids = new Set((profiles as { id?: string }[]).map((p) => String(p.id)).filter(Boolean));
    const stored = localStorage.getItem(PORTAL_RESOURCE_VOICE_PROFILE_KEY) || '';
    let next = '';
    if (stored && ids.has(stored)) {
      next = stored;
    } else {
      const def = (profiles as { isDefault?: boolean; id?: string }[]).find((p) => p.isDefault);
      if (def?.id) next = String(def.id);
    }

    applySelectedVoiceProfileId(next);
    syncVoiceContextBar(profiles);
  }

  function syncVoiceContextBar(profiles?: unknown[]): void {
    const summary = document.getElementById('voice-context-summary');
    if (!summary) return;

    const list = profiles ?? ((window as unknown as { allProfiles?: unknown[] }).allProfiles ?? []);
    const sel = voiceProfileSelects()[0] ?? null;
    const selected = sel?.selectedOptions?.[0]?.textContent?.trim() || 'Auto';
    const def = (list as { isDefault?: boolean; name?: string; voiceName?: string }[]).find(
      (p) => p.isDefault,
    );
    const defLabel = def ? String(def.name || def.voiceName || 'Default') : 'None set';
    summary.textContent = `Creating with: ${selected} · Workspace default: ${defLabel}`;
  }

  function syncVoiceMapProfileLink(profiles?: unknown[]): void {
    const el = document.getElementById('voice-map-profile-link');
    if (!el) return;
    const list = profiles ?? ((window as unknown as { allProfiles?: unknown[] }).allProfiles ?? []);
    const sel = voiceProfileSelects()[0] ?? null;
    const selectedRaw = sel?.selectedOptions?.[0]?.textContent?.trim() || 'Auto';
    const brisbaneRaw =
      (list as { name?: string; voiceName?: string; isDefault?: boolean }[]).find((p) =>
        String(p.name || p.voiceName || '')
          .toLowerCase()
          .includes('brisbane'),
      )?.name || 'Brisbane';
    const escape = (value: string) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    el.innerHTML = `Map centre is the <strong>${escape(String(brisbaneRaw))}</strong> site voice. Creating with <strong>${escape(selectedRaw)}</strong> (sidebar) — that profile shapes new drafts; it does not move the hub.`;
  }

  function initWorkspaceVoiceProfileSelect(): void {
    for (const sel of voiceProfileSelects()) {
      if (sel.dataset.bound === '1') continue;
      sel.dataset.bound = '1';
      sel.addEventListener('change', () => {
        applySelectedVoiceProfileId(sel.value);
      });
    }
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
    syncVoiceMapProfileLink,
    populateWorkspaceVoiceProfileSelect,
  };
}

export type VoiceContextApi = ReturnType<typeof createVoiceContext>;
