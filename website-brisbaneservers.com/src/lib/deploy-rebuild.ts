/**
 * Trigger a static site rebuild after API content is published.
 * Set CLOUDFLARE_PAGES_DEPLOY_HOOK_URL on the standalone API host so new resources
 * are prerendered with full SEO (HTML, sitemap, JSON-LD) on the next deploy.
 */
import type { Resource } from './resource-types';
import { isIndexableResource } from './content-registry';

export type RebuildRequestResult = {
  triggered: boolean;
  skippedReason?: string;
  error?: string;
};

export function shouldRebuildForResourceChange(before: Resource, after: Resource): boolean {
  const becamePublished = after.status === 'published' && before.status !== 'published';
  const becameUnpublished = before.status === 'published' && after.status !== 'published';

  if (becamePublished || becameUnpublished) {
    return true;
  }

  if (after.status !== 'published') {
    return false;
  }

  const indexableFieldsChanged =
    before.title !== after.title ||
    before.description !== after.description ||
    before.content !== after.content ||
    before.industry !== after.industry ||
    before.topic !== after.topic;

  return indexableFieldsChanged && (isIndexableResource(before) || isIndexableResource(after));
}

export async function requestStaticSiteRebuild(reason: string): Promise<RebuildRequestResult> {
  const hookUrl = process.env.CLOUDFLARE_PAGES_DEPLOY_HOOK_URL?.trim();
  if (!hookUrl) {
    return {
      triggered: false,
      skippedReason: 'CLOUDFLARE_PAGES_DEPLOY_HOOK_URL is not configured',
    };
  }

  try {
    const response = await fetch(hookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, source: 'brisbane-servers-api' }),
    });

    if (!response.ok) {
      return {
        triggered: false,
        error: `Deploy hook returned HTTP ${response.status}`,
      };
    }

    return { triggered: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { triggered: false, error: message };
  }
}

/** Fire-and-forget rebuild — never blocks API responses. */
export function scheduleStaticSiteRebuild(reason: string): void {
  void requestStaticSiteRebuild(reason).then((result) => {
    if (result.triggered) {
      console.info(`[deploy-rebuild] Triggered static site rebuild: ${reason}`);
      return;
    }
    if (result.skippedReason) {
      console.info(`[deploy-rebuild] Skipped: ${result.skippedReason}`);
      return;
    }
    console.warn(`[deploy-rebuild] Failed (${reason}): ${result.error ?? 'unknown error'}`);
  });
}
