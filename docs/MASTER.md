# Brisbane Servers — Master Operations & SEO Guide

**Canonical reference for deployment, SEO, content publishing, build validation, and day-to-day operations.**

Last updated: 2026-05-24

---

## Table of contents

1. [Quick start](#1-quick-start)
2. [Architecture overview](#2-architecture-overview)
3. [SEO (organic search)](#3-seo-organic-search)
4. [Adding new content](#4-adding-new-content)
5. [Deployment — Cloudflare Pages (primary)](#5-deployment--cloudflare-pages-primary)
6. [Deployment pathways](#6-deployment-pathways)
7. [Environment variables](#7-environment-variables)
8. [Build & validation](#8-build--validation)
9. [Run locally & troubleshoot](#9-run-locally--troubleshoot)
10. [Production security checklist](#10-production-security-checklist)
11. [Documentation index](#11-documentation-index)

---

## 1. Quick start

| Goal | Action |
|------|--------|
| **Deploy production site** | [HOSTING_MCP_WORKSPACE.md](operations/HOSTING_MCP_WORKSPACE.md) · [GO_LIVE_RUNBOOK.md](operations/GO_LIVE_RUNBOOK.md) |
| **Hosting status** | [PRODUCTION_GO_LIVE_STATUS.md](operations/PRODUCTION_GO_LIVE_STATUS.md) |
| **Run locally** | From repo root: `npm run start:hybrid` → frontend `http://localhost:3000`, API `http://localhost:3002/api` |
| **Add a case study** | Add entry to `src/data/case-studies.ts` → push → Cloudflare rebuilds |
| **Add a topic guide** | Add topic to `src/data/industries.ts` + guide in `src/data/topic-guides/*.ts` → push |
| **Publish an API resource** | Publish in `/account` workspace → deploy hook triggers rebuild → prerendered SEO page |
| **Library growth cycle** | Enable in workspace → cron `POST /api/cron/library-growth` or `LIBRARY_GROWTH_SCHEDULER=1` |
| **Validate before release** | `cd website-brisbaneservers.com && npm run verify:go-live` |
| **Go-live progress** | [PRODUCTION_GO_LIVE_STATUS.md](operations/PRODUCTION_GO_LIVE_STATUS.md) |
| **Render MCP (API host)** | [RENDER_MCP.md](operations/RENDER_MCP.md) — `npm run configure:render-mcp` |

**Primary priority:** organic search (Google). Link previews (Open Graph / Twitter) are secondary but supported.

---

## 2. Architecture overview

```
┌─────────────────────┐     HTTPS      ┌──────────────────────────┐
│  Cloudflare Pages   │ ──────────────▶│  Standalone API (Node)   │
│  Astro static dist/ │   PUBLIC_API   │  standalone-api/server   │
│  Marketing + /account│               │  Handlers in api/        │
└─────────────────────┘                └──────────────────────────┘
         │                                         │
         │  Build-time prerender                   │  Runtime publish
         │  (guides, case studies,                 │  → deploy hook
         │   published resources)                  │  → Pages rebuild
         ▼                                         ▼
   sitemap.xml, JSON-LD, HTML              JSON / Postgres storage
```

| Path | Role |
|------|------|
| `website-brisbaneservers.com/src/` | Astro pages, layouts, components, data |
| `website-brisbaneservers.com/api/` | Hybrid API route handlers |
| `website-brisbaneservers.com/standalone-api/` | Node server mounting `api/` |
| `website-brisbaneservers.com/dist/` | Static build output (gitignored) |
| `website-brisbaneservers.com/public/` | Static assets (`og-default.png`, `_redirects`) |

**Important:** The frontend is **static** (`output: 'static'`). API resources published at runtime do not appear in Google until Cloudflare Pages **rebuilds** and prerenders HTML.

---

## 3. SEO (organic search)

### 3.1 What is implemented

SEO is centralized in layouts and shared libraries:

| File | Purpose |
|------|---------|
| `src/layouts/BaseLayout.astro` | `<title>`, meta description, canonical, `og:*`, Twitter cards, JSON-LD graph, `lang="en-AU"`, `og:locale` |
| `src/layouts/SiteShell.astro` | Pass-through for `structuredData`, `ogType`, `noindex` |
| `src/lib/seo.ts` | Title format, canonical URLs, `WebSite` / `Organization` / `BreadcrumbList` / `TechArticle` JSON-LD |
| `src/lib/content-seo.ts` | **Unified SEO for all content types** — case studies, guides, resources, hub pages |
| `src/lib/content-registry.ts` | Sitemap paths, `isIndexableResource()`, pre-build validation |
| `src/pages/sitemap.xml.ts` | Dynamic sitemap (marketing URLs + industries + topics + indexable resources) |
| `src/pages/robots.txt.ts` | `Allow: /`, `Disallow: /account`, `Disallow: /portal`, sitemap reference |
| `src/components/Breadcrumbs.astro` | Visible breadcrumbs + schema.org microdata |

**Title format:** `{Page} | Brisbane Servers` (applied automatically via `formatPageTitle()`).

**Structured data on every indexed page:**
- `WebSite` + `Organization` (logo, `areaServed: Australia`, BIGPONS parent)
- Page-specific `BreadcrumbList` + `TechArticle` on guides, case studies, and resource detail pages
- `CollectionPage` on hub pages (`/resources`, `/case-studies`, industry hubs)

**Private routes:** `/account`, `/portal`, `/resources/item` (query-param fallback), and `/404` use `noindex, nofollow`.

### 3.2 Sitemap & robots

- **`/sitemap.xml`** — includes `/`, marketing pages, all industry/topic URLs, case studies, and prerendered `/resources/item/{id}` for indexable published resources. Includes `<lastmod>`.
- **`/robots.txt`** — blocks crawlers from `/account` and `/portal`; references sitemap.

Verify after deploy:
```bash
curl -s https://brisbaneservers.com/sitemap.xml | head
curl -s https://brisbaneservers.com/robots.txt
```

### 3.3 Open Graph (secondary)

- Default image: `public/og-default.png` (1200×630)
- Alternates: `public/og-nature.png`, `public/og-southbank.png`
- Per-page override: pass `ogImage` prop to `SiteShell`

### 3.4 Pre-build SEO validation

Every `npm run build` runs `scripts/validate-content-seo.ts` via pre-build checks:

**Errors (fail build):**
- Case study missing `pageTitle`, `metaDescription`, `heroTitle`, `cardTitle`, or duplicate slug
- Industry/topic missing name or description

**Warnings (log only):**
- Topic in `industries.ts` without a curated guide in `topic-guides/`

Run manually:
```bash
cd website-brisbaneservers.com
npx tsx scripts/validate-content-seo.ts
```

### 3.5 Google Search Console (recommended)

1. Verify domain ownership in [Google Search Console](https://search.google.com/search-console)
2. Submit sitemap: `https://brisbaneservers.com/sitemap.xml`
3. Monitor **Pages** → indexed vs. excluded
4. After publishing new API resources, confirm rebuild ran and new URLs appear in sitemap

### 3.6 SEO file reference

```
src/lib/seo.ts              — low-level helpers
src/lib/content-seo.ts      — per-content-type builders (use these for new pages)
src/lib/content-registry.ts — sitemap registry + validation
src/lib/deploy-rebuild.ts   — publish → Cloudflare rebuild hook
scripts/validate-content-seo.ts
scripts/scaffold-case-study.ts
tests/seo.test.ts
tests/content-seo.test.ts
```

---

## 4. Adding new content

All content types should use `content-seo.ts` helpers so new pages automatically get breadcrumbs, JSON-LD, and correct titles.

### 4.1 Case studies

**Steps:**
1. Scaffold (optional): `npx tsx scripts/scaffold-case-study.ts my-project-slug`
2. Add full object to `src/data/case-studies.ts`
3. Push to `main` → Cloudflare Pages rebuilds

**Automatic on deploy:**
- Route: `/case-studies/{slug}` via `src/pages/case-studies/[slug].astro`
- Nav, projects grid, sitemap, breadcrumbs, `TechArticle` JSON-LD
- Template: `src/components/CaseStudyPage.astro` → `caseStudyDetailSeo()`

**Required SEO fields:** `slug`, `pageTitle`, `metaDescription`, `heroTitle`, `cardTitle`

### 4.2 Topic guides (static)

**Steps:**
1. Add industry/topic to `src/data/industries.ts` (creates route + sitemap entry)
2. Add curated guide to matching file in `src/data/topic-guides/` (e.g. `healthcare.ts`)
3. Register in `src/data/topic-guides/index.ts` if new industry file
4. Push → rebuild

**Automatic on deploy:**
- Route: `/resources/{industry}/{topic}`
- SEO via `topicGuideSeo()` in `[industry]/[topic].astro`
- Industry hub via `industryHubSeo()` in `[industry]/index.astro`

**Without step 2:** page still renders with `topic.description` fallback but pre-build warns about thin content.

### 4.3 Published API resources

**Steps:**
1. Generate/upload/process resource in `/account` portal
2. Publish (status → `published`) or approve community contribution
3. API calls deploy hook → Cloudflare Pages rebuilds
4. Build prerenders `/resources/item/{id}` for resources passing `isIndexableResource()`

**Indexability gate (`isIndexableResource`):**
- Must be `published` + public visibility
- Must pass `isSubstantiveApiResource()` (voice score ≥ 0.7, not legacy seed, ≥ 120 words, etc.)

**Legacy URL:** `/resources/item?id=…` → `noindex` + client redirect to `/resources/item/{id}`

**Links from topic pages:** use `/resources/item/{id}` (not query params)

### 4.4 What is automatic vs. manual

| Action | Route | Sitemap | Breadcrumbs | JSON-LD | Prerender |
|--------|-------|---------|-------------|---------|-----------|
| Add case study + deploy | Auto | Auto | Auto | Auto | On deploy |
| Add topic to industries + deploy | Auto | Auto | Auto | Auto | On deploy |
| Add curated guide | Same route | Same | Same | Same | On deploy |
| Publish API resource | After rebuild | After rebuild | After rebuild | After rebuild | **Rebuild required** |
| Publish but fails indexability gate | Topic supplement only | No item URL | — | — | — |

### 4.5 Deploy hook (required for API resource SEO)

Set on **API host** (not Cloudflare Pages):

| Variable | Value |
|----------|--------|
| `CLOUDFLARE_PAGES_DEPLOY_HOOK_URL` | URL from Cloudflare Pages → Settings → Builds → Deploy hooks |

Triggered when:
- Resource published/unpublished/updated (`api/resources/[id].ts` PUT)
- Community contribution approved (`api/community/approve.ts`)
- Library growth proposal materialized with auto-publish (`api/admin/growth-proposals.ts`)

Implementation: `src/lib/deploy-rebuild.ts`

### 4.6 Library growth (automated proposals)

Admin **Account workspace** → **Library growth** plans topic gaps, queues proposals, and materializes voice-aligned resources on approve.

| Step | Where |
|------|--------|
| Configure schedule | `voice-framework/storage/library-growth-config.json` or workspace UI |
| Run cycle | Workspace **Run cycle now**, or production automation below |
| Approve | Workspace → proposal → **Approve & generate** |
| SEO | Auto-publish triggers deploy hook (same as §4.5) |

**Production automation (API host):**

| Variable | Purpose |
|----------|---------|
| `CRON_SECRET` | Bearer token for `POST /api/cron/library-growth` |
| `LIBRARY_GROWTH_SCHEDULER` | Set `1` for in-process due-cycle checks (optional alternative to HTTP cron) |

Example cron (daily):

```bash
curl -sS -X POST "https://<api-host>/api/cron/library-growth" \
  -H "Authorization: Bearer $CRON_SECRET"
```

Details: [portal/LIBRARY_GROWTH.md](portal/LIBRARY_GROWTH.md)

---

## 5. Deployment — Cloudflare Pages (primary)

### 5.1 Use Pages, not Workers

| Use | Do not use |
|-----|------------|
| **Workers & Pages → Pages → Connect to Git** | Create a Worker with `npx wrangler deploy` |
| Build: `npm run build`, output: `dist` | Empty build + wrangler deploy |

### 5.2 Connect GitHub

1. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Configure:

| Setting | Value |
|---------|--------|
| Root directory | `website-brisbaneservers.com` |
| Build command | `npm run build` |
| Build output | `dist` |
| Production branch | `main` |

### 5.3 Cloudflare Pages environment variables

| Variable | Required | Example |
|----------|----------|---------|
| `PUBLIC_API_BASE_URL` | **Yes** | `https://your-api.onrender.com/api` |
| `INTERNAL_API_BASE_URL` | Optional | Same as public |
| `PUBLIC_SITE_URL` | **Yes** | `https://brisbaneservers.com` |
| `PUBLIC_SITE_BASE` | **Yes** | `/` |
| `SKIP_HOSTED_API_CHECK` | Temporary only | `1` while API not ready |

**Never** put `JWT_SECRET`, `DATABASE_URL`, or admin passwords on Cloudflare Pages.

### 5.4 Deploy the standalone API

Deploy `website-brisbaneservers.com/standalone-api/server.ts` to Render, Fly, Railway, or VPS.

Verify:
- `https://<api-host>/api/health`
- `https://<api-host>/api/resources/public`

**API host variables:**

| Variable | Purpose |
|----------|---------|
| `ALLOWED_ORIGINS` | `https://brisbaneservers.com,https://project.pages.dev` |
| `ALLOW_CLOUDFLARE_PAGES` | Optional `1` for `*.pages.dev` previews |
| `PUBLIC_SITE_URL` | `https://brisbaneservers.com` |
| `CLOUDFLARE_PAGES_DEPLOY_HOOK_URL` | **SEO:** rebuild on publish |
| `CRON_SECRET` | Secured `POST /api/cron/library-growth` |
| `LIBRARY_GROWTH_SCHEDULER` | Optional `1` — in-process growth cycle scheduler |
| `DATABASE_URL`, `JWT_SECRET`, `ADMIN_*`, `SMTP_*` | Auth & persistence — **required for production signup** |

Domain go-live: [operations/GO_LIVE_RUNBOOK.md](operations/GO_LIVE_RUNBOOK.md). Postgres, admin, privacy: [operations/BRISBANESERVERS_PRODUCTION.md](operations/BRISBANESERVERS_PRODUCTION.md)

### 5.5 Custom domain

1. Cloudflare Pages → Custom domains → add domain
2. Update `PUBLIC_SITE_URL`
3. Keep `PUBLIC_SITE_BASE=/`
4. Add domain to API `ALLOWED_ORIGINS`
5. Redeploy

Redirects in `public/_redirects` (portal → account) apply on Cloudflare Pages.

### 5.6 Verify production

1. Open site URL
2. Visit `/account/` — login calls `PUBLIC_API_BASE_URL`
3. DevTools → Network: API requests go to hosted API
4. Check `/sitemap.xml` and `/robots.txt`
5. Spot-check a topic guide page for JSON-LD in page source

### 5.7 Local production-matching build

```bash
cd website-brisbaneservers.com
PUBLIC_API_BASE_URL=https://your-api.onrender.com/api \
PUBLIC_SITE_URL=https://brisbaneservers.com \
PUBLIC_SITE_BASE=/ \
npm run build:hosted
npm run preview:hosted
```

### 5.8 Deployment troubleshooting

| Symptom | Fix |
|---------|-----|
| Login “Connection error” | Set `PUBLIC_API_BASE_URL` on Pages; redeploy |
| CORS blocked | Add origin to `ALLOWED_ORIGINS` or `ALLOW_CLOUDFLARE_PAGES=1` |
| Assets 404 | Set `PUBLIC_SITE_BASE=/` |
| Build fails HTTPS check | Use `https://` API URL or temporary `SKIP_HOSTED_API_CHECK=1` |
| New resource not in Google | Confirm deploy hook fired; check sitemap after rebuild |
| Wrong Cloudflare product | Use **Pages** + `npm run build` |

---

## 6. Deployment pathways

| Pathway | Static site | API | Status |
|---------|-------------|-----|--------|
| **Cloudflare Pages hybrid** | Cloudflare Pages | `standalone-api/` | **Primary** |
| Unified dev | localhost:3000 | localhost:3002 | Dev |
| Node / cPanel | SSR bundle | `@astrojs/node` | Alternate — see `docs/operations/CPANEL_DEPLOY.md` |
| Voice dashboard | N/A | Docker / Render | Optional adjunct |
| GitHub Pages | — | — | **Deprecated** — see `docs/operations/GITHUB_PAGES_HYBRID.md` |

In-repo Cloudflare config: `website-brisbaneservers.com/wrangler.toml` (`pages_build_output_dir = "dist"`).

---

## 7. Environment variables

### Frontend build (Cloudflare Pages)

| Variable | Purpose |
|----------|---------|
| `PUBLIC_SITE_URL` | Canonical origin, sitemap, OG URLs |
| `PUBLIC_SITE_BASE` | Astro base path (`/` at domain root) |
| `PUBLIC_API_BASE_URL` | Baked into static JS for browser API calls |
| `INTERNAL_API_BASE_URL` | Build-time fetch for prerendering resources |

### API host

See full reference: [docs/development/ENV_VARIABLES.md](development/ENV_VARIABLES.md)

Critical for SEO + ops:
- `CLOUDFLARE_PAGES_DEPLOY_HOOK_URL`
- `ALLOWED_ORIGINS`
- `PUBLIC_SITE_URL`
- `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (change defaults!)
- `DATABASE_URL` (production persistence)

---

## 8. Build & validation

### Commands

| Command | Use |
|---------|-----|
| `npm run dev` | Local Astro dev server (:3000) |
| `npm run build` | Production static build |
| `npm run build:hosted` | Build matching Cloudflare env |
| `npm run build:cpanel` | Node SSR build (alternate host) |
| `npm test` | Vitest (includes SEO tests) |
| `npm run prebuild` | TypeScript, viewport, CSS vars, **content SEO** |

### Pre-build checks (`scripts/pre-build-check.ts`)

- TypeScript compilation
- Astro config
- Dependencies
- Viewport meta in layouts
- CSS variables
- **Content SEO validation**
- Hosted API HTTPS check (CI only)

### Post-build checks (`scripts/post-build-verify.ts`)

- `dist/` exists
- `index.html` generated
- Viewport meta in HTML files
- CSS bundle present
- **Brand chroma** — marketing `.btn.btn-primary` uses violet→pink gradient (`brand-chroma.css`); account workspace buttons are scoped so they do not override the public bundle
- Asset references valid

### Production / SEO checklist

- [ ] `PUBLIC_SITE_URL` set to live domain
- [ ] `public/og-default.png` present
- [ ] `/sitemap.xml` lists expected URLs with `<lastmod>`
- [ ] `/robots.txt` references correct sitemap URL
- [ ] `CLOUDFLARE_PAGES_DEPLOY_HOOK_URL` set on API host
- [ ] Google Search Console sitemap submitted
- [ ] Layout uses native browser zoom (no JS zoom tier) — see `docs/development/FEATURE_RECONCILIATION.md`

---

## 9. Run locally & troubleshoot

### Quick start

From repo root:
```bash
npm run start:hybrid
```

- Frontend: `http://localhost:3000`
- API: `http://localhost:3002/api`
- Health: `http://localhost:3002/api/health`

Login credentials: [docs/portal/CREDENTIALS.md](portal/CREDENTIALS.md)

### Separate processes

```bash
cd website-brisbaneservers.com
npm run dev          # frontend :3000
npm run start:api    # API :3002
```

### Verify locally

1. `http://localhost:3002/api/health` → OK
2. `http://localhost:3002/api/resources/public` → JSON
3. `http://localhost:3000/resources` → renders
4. `http://localhost:3000/account` → login targets API

### Common issues

| Issue | Fix |
|-------|-----|
| “Voice framework server not running” | Start API: `npm run start:api` or `npm run start:hybrid` |
| Port in use | `netstat -ano \| findstr :3000` then kill PID |
| CORS locally | API allows localhost origins in dev |

Full runbook: [docs/operations/RUN_AND_TROUBLESHOOT.md](operations/RUN_AND_TROUBLESHOOT.md)

---

## 10. Production security checklist

**Never deploy with defaults:**
- Admin: `admin@brisbaneservers.com` / `admin123`
- JWT: `brisbane-servers-secret-key-change-in-production`

**Before go-live:**
- [ ] Set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `JWT_SECRET` (use `openssl rand -hex 32`)
- [ ] Set `NODE_ENV=production`
- [ ] Set `ALLOWED_ORIGINS` to production HTTPS origins only
- [ ] Remove `SKIP_HOSTED_API_CHECK` once API is live
- [ ] Enable HTTPS on API host
- [ ] Do not commit `.env` files

Full checklist: [docs/project/PRODUCTION_CHECKLIST.md](project/PRODUCTION_CHECKLIST.md)

---

## 11. Documentation index

This master document consolidates operational and SEO guidance. Use the links below for deep dives that remain in separate files.

### Operations & deployment
| Document | Contents |
|----------|----------|
| [operations/HOSTING_MCP_WORKSPACE.md](operations/HOSTING_MCP_WORKSPACE.md) | **Live** Cloudflare Pages + Render map (MCP-linked) |
| [operations/GO_LIVE_RUNBOOK.md](operations/GO_LIVE_RUNBOOK.md) | Phased domain go-live (Pages + API + account) |
| [operations/PRODUCTION_GO_LIVE_STATUS.md](operations/PRODUCTION_GO_LIVE_STATUS.md) | Go-live checklist progress |
| [operations/RENDER_MCP.md](operations/RENDER_MCP.md) | Render MCP setup |
| [operations/CLOUDFLARE_PAGES.md](operations/CLOUDFLARE_PAGES.md) | → **See [§5](#5-deployment--cloudflare-pages-primary)** |
| [operations/ACCOUNT_DOMAIN_VERIFICATION.md](operations/ACCOUNT_DOMAIN_VERIFICATION.md) | Phase 3 `/account` browser checklist |
| [operations/DEPLOYMENT_PATHWAYS.md](operations/DEPLOYMENT_PATHWAYS.md) | → **See [§6](#6-deployment-pathways)** |
| [operations/RUN_AND_TROUBLESHOOT.md](operations/RUN_AND_TROUBLESHOOT.md) | → **See [§9](#9-run-locally--troubleshoot)** |
| [operations/CPANEL_DEPLOY.md](operations/CPANEL_DEPLOY.md) | cPanel / Node SSR alternate |
| [operations/GITHUB_PAGES_HYBRID.md](operations/GITHUB_PAGES_HYBRID.md) | Deprecated migration reference |
| [operations/SEMANTIC_RUNBOOK.md](operations/SEMANTIC_RUNBOOK.md) | Embeddings & semantic index |
| [../DEPLOYMENT.md](../DEPLOYMENT.md) | → **See [§5](#5-deployment--cloudflare-pages-primary)** |

### Portal & API
| Document | Contents |
|----------|----------|
| [portal/PORTAL.md](portal/PORTAL.md) | Account workspace features |
| [portal/ACCOUNT_WORKSPACE_CHECKLIST.md](portal/ACCOUNT_WORKSPACE_CHECKLIST.md) | Dashboard + self-growing library completion tracker |
| [portal/LIBRARY_GROWTH.md](portal/LIBRARY_GROWTH.md) | Growth cycle, cron, case-study drafts |
| [portal/VOICE_PORTAL_SCOPE_MAP.md](portal/VOICE_PORTAL_SCOPE_MAP.md) | UI + API surface map |
| [portal/CREDENTIALS.md](portal/CREDENTIALS.md) | Login / admin env |
| [development/HYBRID_API_CONTRACT.md](development/HYBRID_API_CONTRACT.md) | `/api/*` contract |
| [project/RESOURCE_CONTRACT.md](project/RESOURCE_CONTRACT.md) | Resource shape |

### Architecture & development
| Document | Contents |
|----------|----------|
| [project/CODEBASE_WIRE_CARD.md](project/CODEBASE_WIRE_CARD.md) | Wiring & routes |
| [development/ENV_VARIABLES.md](development/ENV_VARIABLES.md) | Full env reference |
| [development/FEATURE_RECONCILIATION.md](development/FEATURE_RECONCILIATION.md) | Zoom / responsive policy |
| [development/RESOURCE_PIPELINE_AND_DRAWBACK.md](development/RESOURCE_PIPELINE_AND_DRAWBACK.md) | Ingestion pipeline |
| [project/PRODUCTION_CHECKLIST.md](project/PRODUCTION_CHECKLIST.md) | → **See [§10](#10-production-security-checklist)** |
| [../website-brisbaneservers.com/BUILD_CHECKLIST.md](../website-brisbaneservers.com/BUILD_CHECKLIST.md) | → **See [§8](#8-build--validation)** |

### Design & voice framework
| Document | Contents |
|----------|----------|
| [design/DESIGN_TOKENS_REFERENCE.md](design/DESIGN_TOKENS_REFERENCE.md) | CSS tokens |
| [../voice-framework/README.md](../voice-framework/README.md) | NLP package |
| [../voice-framework/QUICK_START.md](../voice-framework/QUICK_START.md) | Voice framework dev |

### Archive
Historical implementation notes: [docs/archive/](archive/)

---

*For doc maintenance: update this file first when changing deployment or SEO behaviour; keep linked docs as stubs or deep-dive supplements pointing back here.*
