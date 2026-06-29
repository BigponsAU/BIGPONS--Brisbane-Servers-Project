/**
 * Canonical client fetch helpers for /api/resources (avoids duplicate URL logic).
 */
import { workspaceFetch } from '../lib/client-api';

export interface ResourcesFetchResult {
  ok: boolean;
  status: number;
  resources: unknown[];
  error?: string;
  success?: boolean;
}

export async function fetchAuthenticatedResources(
  apiBase: string,
  options?: { status?: string },
): Promise<ResourcesFetchResult> {
  const params = new URLSearchParams();
  if (options?.status) params.append('status', options.status);
  const qs = params.toString();
  const url = `${apiBase.replace(/\/+$/, '')}/resources${qs ? `?${qs}` : ''}`;

  const response = await workspaceFetch(url, {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  });

  if (!response.ok) {
    let error = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      error = body.error || error;
    } catch {
      /* ignore */
    }
    return { ok: false, status: response.status, resources: [], error };
  }

  const data = await response.json();
  const resources = Array.isArray(data.resources) ? data.resources : [];
  return {
    ok: true,
    status: response.status,
    resources,
    success: data.success !== false,
    error: data.error,
  };
}

export async function fetchStarterBlocks(apiBase: string): Promise<unknown[]> {
  const base = apiBase.replace(/\/+$/, '');
  const starterRes = await workspaceFetch(`${base}/resources/starter-blocks`, {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  });

  if (starterRes.ok) {
    const data = await starterRes.json();
    return Array.isArray(data.resources) ? data.resources : [];
  }

  const fallback = await fetchAuthenticatedResources(base);
  if (fallback.ok) {
    return fallback.resources.filter(
      (r) => (r as { isStarterBlock?: boolean }).isStarterBlock === true,
    );
  }

  return [];
}

export function buildResourcesListUrl(
  apiBase: string,
  options: {
    status?: string;
    typeFilter?: string;
    removedOnly?: boolean;
  },
): string {
  const base = apiBase.replace(/\/+$/, '');
  const { status, typeFilter = 'user', removedOnly } = options;

  if (typeFilter === 'starter') {
    return `${base}/resources/starter-blocks`;
  }

  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (removedOnly || typeFilter === 'removed') {
    params.append('removedOnly', '1');
  }
  const qs = params.toString();
  return `${base}/resources${qs ? `?${qs}` : ''}`;
}
