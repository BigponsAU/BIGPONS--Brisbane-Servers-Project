/**
 * Enforced CSP for Cloudflare Pages `_headers`.
 * Keeps account workspace (API fetch, Google OAuth, CF analytics) working.
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self' https://accounts.google.com",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com https://challenges.cloudflare.com https://*.cloudflare.com https://www.googletagmanager.com https://*.googletagmanager.com https://tagmanager.google.com https://www.google-analytics.com https://*.google-analytics.com",
  "script-src-elem 'self' 'unsafe-inline' https://static.cloudflareinsights.com https://challenges.cloudflare.com https://*.cloudflare.com https://www.googletagmanager.com https://*.googletagmanager.com https://tagmanager.google.com https://www.google-analytics.com https://*.google-analytics.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://api.brisbaneservers.com https://*.cloudflare.com https://cloudflareinsights.com https://*.cloudflareinsights.com https://www.googletagmanager.com https://*.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://stats.g.doubleclick.net wss:",
  "frame-src 'self' https://accounts.google.com https://challenges.cloudflare.com https://www.googletagmanager.com",
  'upgrade-insecure-requests',
].join('; ');
