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
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com https://challenges.cloudflare.com https://*.cloudflare.com",
  "script-src-elem 'self' 'unsafe-inline' https://static.cloudflareinsights.com https://challenges.cloudflare.com https://cdnjs.cloudflare.com https://*.cloudflare.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
  "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com data:",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://api.brisbaneservers.com https://brisbane-servers-api.onrender.com https://*.cloudflare.com https://cloudflareinsights.com https://*.cloudflareinsights.com wss:",
  "frame-src 'self' https://accounts.google.com https://challenges.cloudflare.com",
  'upgrade-insecure-requests',
].join('; ');
