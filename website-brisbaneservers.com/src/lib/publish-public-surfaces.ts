/**
 * On publish/unpublish: refresh public SEO surfaces only — no full-site deploy by default.
 *
 * Resource HTML is served live (SSR) from the public API read model. This module purges
 * CDN cache for affected paths and optionally falls back to a full Pages deploy hook.
 */
import {
  getAffectedPublicPaths,
  shouldUpdatePublicSurfaces,
} from './content-plane';
import type { Resource } from './resource-types';

export type PublicSurfaceUpdateResult = {
  updated: boolean;
  skippedReason?: string;
  paths: string[];
  cachePurged: boolean;
  fullDeployTriggered: boolean;
  errors: string[];
};

const ZONE_ID = process.env.CLOUDFLARE_ZONE_ID ?? 'd17d7ab59aec5a7a6fb4f08f9740f779';

function siteOrigin(): string {
  return (process.env.PUBLIC_SITE_URL ?? 'https://brisbaneservers.com').replace(/\/$/, '');
}

async function purgeCloudflareCache(paths: string[]): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!token) {
    return { ok: false, error: 'CLOUDFLARE_API_TOKEN not set' };
  }

  const files = paths.map((path) => {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `${siteOrigin()}${normalized}`;
  });

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ files }),
      },
    );

    const data = (await response.json()) as { success?: boolean; errors?: Array<{ message: string }> };
    if (!response.ok || !data.success) {
      const msg = data.errors?.map((e) => e.message).join('; ') ?? `HTTP ${response.status}`;
      return { ok: false, error: msg };
    }
    return { ok: true };
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function triggerFullSiteDeploy(reason: string): Promise<{ ok: boolean; error?: string }> {
  const hookUrl = process.env.CLOUDFLARE_PAGES_DEPLOY_HOOK_URL?.trim();
  if (!hookUrl) {
    return { ok: false, error: 'CLOUDFLARE_PAGES_DEPLOY_HOOK_URL not configured' };
  }

  try {
    const response = await fetch(hookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, source: 'brisbane-servers-api', legacy: true }),
    });
    if (!response.ok) {
      return { ok: false, error: `Deploy hook HTTP ${response.status}` };
    }
    return { ok: true };
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function updatePublicSurfacesOnPublish(
  before: Resource,
  after: Resource,
  reason: string,
): Promise<PublicSurfaceUpdateResult> {
  const result: PublicSurfaceUpdateResult = {
    updated: false,
    paths: [],
    cachePurged: false,
    fullDeployTriggered: false,
    errors: [],
  };

  if (!shouldUpdatePublicSurfaces(before, after)) {
    result.skippedReason = 'No public SEO surface change';
    return result;
  }

  result.updated = true;
  result.paths = getAffectedPublicPaths(before, after);

  const purge = await purgeCloudflareCache(result.paths);
  if (purge.ok) {
    result.cachePurged = true;
  } else if (purge.error) {
    result.errors.push(`Cache purge: ${purge.error}`);
  }

  if (process.env.USE_FULL_SITE_DEPLOY_HOOK === '1') {
    const deploy = await triggerFullSiteDeploy(reason);
    if (deploy.ok) {
      result.fullDeployTriggered = true;
    } else if (deploy.error) {
      result.errors.push(`Deploy hook: ${deploy.error}`);
    }
  }

  return result;
}

/** Fire-and-forget — never blocks API responses. */
export function schedulePublicSurfaceUpdate(before: Resource, after: Resource, reason: string): void {
  void updatePublicSurfacesOnPublish(before, after, reason).then((result) => {
    if (!result.updated) {
      console.info(`[publish-surfaces] Skipped: ${result.skippedReason ?? 'no change'}`);
      return;
    }
    console.info(
      `[publish-surfaces] Public SEO paths (${result.paths.length}): ${result.paths.join(', ')}`,
    );
    if (result.cachePurged) {
      console.info('[publish-surfaces] CDN cache purged for affected paths');
    }
    if (result.fullDeployTriggered) {
      console.info('[publish-surfaces] Legacy full-site deploy hook triggered');
    }
    for (const err of result.errors) {
      console.warn(`[publish-surfaces] ${err}`);
    }
  });
}
