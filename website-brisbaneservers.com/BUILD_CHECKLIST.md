# Build & Run Checklist

> **Canonical guide:** [../docs/MASTER.md](../docs/MASTER.md) — §8 build & validation, §3 SEO checklist.

## Quick commands

| Command | Use |
|---------|-----|
| `npm run build` | Production static build (Cloudflare Pages) |
| `npm run build:hosted` | Build matching production env |
| `npm run build:cpanel` | Node / cPanel — [CPANEL_DEPLOY.md](../docs/operations/CPANEL_DEPLOY.md) |
| `npm test` | Vitest (includes SEO tests) |
| `npm run verify:go-live` | Phase 0 gate: test + typecheck + build 6/6 |
| `npx tsx scripts/validate-content-seo.ts` | SEO field validation only |

## Pre-build (automatic on `npm run build`)

- TypeScript, Astro config, dependencies, viewport meta, CSS variables
- **Content SEO validation** (case studies, industries, topics)
- Hosted API HTTPS check (CI only)

## Post-build

- `dist/` exists, `index.html`, viewport in HTML, CSS bundle, asset refs

## SEO checklist

See [MASTER §3 & §8](../docs/MASTER.md#3-seo-organic-search):

- [ ] `PUBLIC_SITE_URL` set on deploy environment
- [ ] `public/og-default.png` present
- [ ] `/sitemap.xml` and `/robots.txt` correct for host
- [ ] `CLOUDFLARE_PAGES_DEPLOY_HOOK_URL` on API host
- [ ] Google Search Console sitemap submitted

## Design / zoom policy

Native browser zoom + CSS breakpoints only — [FEATURE_RECONCILIATION.md](../docs/development/FEATURE_RECONCILIATION.md)
