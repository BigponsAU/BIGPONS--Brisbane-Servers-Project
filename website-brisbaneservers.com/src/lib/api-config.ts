import { joinUrl, normalizePathPrefix, readRuntimeEnv, stripTrailingSlash } from '../utils/runtime-env';

/** Relative prefix — works on Cloudflare Pages (same origin) and local Astro dev (Vite proxy). */
export const API_PATH_PREFIX = '/api';

function normalizeApiBase(baseUrl: string): string {
  return /^https?:\/\//i.test(baseUrl)
    ? stripTrailingSlash(baseUrl)
    : normalizePathPrefix(baseUrl);
}

export function getPublicApiBaseUrl(): string {
  return normalizeApiBase(readRuntimeEnv('PUBLIC_API_BASE_URL', API_PATH_PREFIX) ?? API_PATH_PREFIX);
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
