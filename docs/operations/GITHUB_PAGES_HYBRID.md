# GitHub Pages Hybrid Deployment (deprecated)

> **Deprecated:** Production frontend hosting moved to **Cloudflare Pages**. Use [CLOUDFLARE_PAGES.md](CLOUDFLARE_PAGES.md) instead.

This document is retained for migration reference only.

## What changed

| Before (GitHub Pages) | After (Cloudflare Pages) |
|-----------------------|--------------------------|
| `src-static/` + re-export shims | Single `src/` tree |
| `src/pages/api/` in Astro tree | `api/` at website root (standalone server only) |
| `PUBLIC_SITE_BASE=/<repo>/` | `PUBLIC_SITE_BASE=/` at domain root |
| `.github/workflows/deploy-github-pages.yml` | Cloudflare Git integration + `npm run build` |
| GitHub Actions variables | Cloudflare Pages environment variables |

The standalone API host and `PUBLIC_API_BASE_URL` model are unchanged.
