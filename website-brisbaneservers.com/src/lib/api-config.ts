import { joinUrl, normalizePathPrefix, readRuntimeEnv, stripTrailingSlash } from '../utils/runtime-env';

/** Relative prefix — works on Cloudflare Pages (same origin) and local Astro dev (Vite proxy). */
export const API_PATH_PREFIX = '/api';
/** Same-site subdomain — session cookies work with the marketing site on brisbaneservers.com. */
const PROD_PUBLIC_API_FALLBACK = 'https://api.brisbaneservers.com/api';

function normalizeApiBase(baseUrl: string): string {
  let normalized = /^https?:\/\//i.test(baseUrl)
    ? stripTrailingSlash(baseUrl)
    : normalizePathPrefix(baseUrl);

  // Never bake plain http API origins into production client bundles.
  if (import.meta.env.PROD && normalized.startsWith('http://')) {
    normalized = `https://${normalized.slice('http://'.length)}`;
  }

  return normalized;
}

export function getPublicApiBaseUrl(): string {
  const fallback = import.meta.env.PROD ? PROD_PUBLIC_API_FALLBACK : API_PATH_PREFIX;
  return normalizeApiBase(readRuntimeEnv('PUBLIC_API_BASE_URL', fallback) ?? fallback);
}

export function getInternalApiBaseUrl(): string {
  return normalizeApiBase(
    readRuntimeEnv('INTERNAL_API_BASE_URL')
      ?? readRuntimeEnv('PUBLIC_API_BASE_URL')
      ?? API_PATH_PREFIX
  );
}

export function resolvePublicApiUrl(path: string): string {
  return joinUrl(getPublicApiBaseUrl(), path);
}

export function resolveInternalApiUrl(path: string): string {
  return joinUrl(getInternalApiBaseUrl(), path);
}

export function getPublicSiteBase(): string {
  return normalizePathPrefix(readRuntimeEnv('PUBLIC_SITE_BASE', '/') ?? '/');
}

export function resolvePublicSitePath(path: string): string {
  const siteBase = getPublicSiteBase();
  if (!path || path === '/') {
    return siteBase;
  }

  if (siteBase === '/') {
    return path.startsWith('/') ? path : `/${path}`;
  }

  return joinUrl(siteBase, path);
}
