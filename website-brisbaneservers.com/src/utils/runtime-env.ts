type RuntimeEnvValue = string | undefined;

function readImportMetaEnv(name: string): RuntimeEnvValue {
  try {
    const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
    return env?.[name];
  } catch {
    return undefined;
  }
}

function readProcessEnv(name: string): RuntimeEnvValue {
  if (typeof process === 'undefined') {
    return undefined;
  }

  return process.env?.[name];
}

export function readRuntimeEnv(name: string, fallback?: string): RuntimeEnvValue {
  const value = readImportMetaEnv(name) ?? readProcessEnv(name);
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  return fallback;
}

export function getRuntimeEnv(name: string, fallback?: string): RuntimeEnvValue {
  return readRuntimeEnv(name, fallback);
}

export function isDevelopmentMode(): boolean {
  return readRuntimeEnv('NODE_ENV', 'development') !== 'production';
}

export function hasAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

export function stripTrailingSlash(value: string): string {
  if (value === '/') {
    return value;
  }

  return value.replace(/\/+$/, '');
}

export function ensureLeadingSlash(value: string): string {
  if (!value) {
    return '/';
  }

  return value.startsWith('/') ? value : `/${value}`;
}

export function normalizePathPrefix(value: string): string {
  const withLeadingSlash = ensureLeadingSlash(value);
  if (withLeadingSlash === '/') {
    return '/';
  }

  return stripTrailingSlash(withLeadingSlash);
}

export function joinUrl(base: string, path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (hasAbsoluteUrl(base)) {
    return `${stripTrailingSlash(base)}${normalizedPath}`;
  }

  const normalizedBase = normalizePathPrefix(base);
  if (normalizedBase === '/') {
    return normalizedPath;
  }

  return `${normalizedBase}${normalizedPath}`;
}
