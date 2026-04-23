# Running notes and live map

Incremental “how it actually works” while developing. **Not** a second full documentation set — the hub remains [docs/README.md](../README.md).

## GitHub Pages hybrid (primary)

```text
Git push → CI builds website-brisbaneservers.com → dist/ → GitHub Pages
Browser → static HTML/JS/CSS → fetch(PUBLIC_API_BASE_URL + /api/...)
Standalone API process → Astro route modules → auth / resources / SQLite|Postgres|JSON
```

- Env: `PUBLIC_API_BASE_URL`, `ALLOWED_ORIGINS`, `PUBLIC_SITE_BASE` (if path-prefixed site).
- Contract: [HYBRID_API_CONTRACT.md](HYBRID_API_CONTRACT.md).

## Browser zoom / responsive layout

```text
Native browser full-page zoom (no transform on <html>)
  → rem/em/% tokens scale with the user’s zoom
  → @media breakpoints in global.css / site-framework.css (CSS pixel layout viewport)
```

- Policy: [FEATURE_RECONCILIATION.md](FEATURE_RECONCILIATION.md).

## Gotchas (confusion reducers)

- **`/portal` vs `/account`:** production may redirect legacy `/portal` to `/account` ([vercel.json](../../website-brisbaneservers.com/vercel.json)); docs and nav should prefer **`/account`**.
- **Unified `npm start` vs hybrid:** same app features, different origins — hybrid needs API URL + CORS.
- **Cloudflare:** CDN Font Awesome / npm `pg-cloudflare` ≠ Cloudflare Pages deployment ([DEPLOYMENT_PATHWAYS.md](../operations/DEPLOYMENT_PATHWAYS.md)).

## Session log (append during work)

| Date | Verified / changed |
|------|---------------------|
| 2026-04-24 | Pushed resource voice resolution + catalogue descriptions (`resource-voice-profile`, ingestion/types), API wiring, account nav CTA; added `PROJECT_NEXT_STEPS_REPORT.md`; `npm run build` OK. |
| 2026-04-10 | Plan execution: added `DEPLOYMENT_PATHWAYS.md`, doc hub + `PORTAL.md` stub + `REPOSITORY_STATUS` banner. |
| 2026-04-10 | `npm run build` in `website-brisbaneservers.com` passed (pre/post checks OK). Build-time API fetches log `ECONNREFUSED` when no standalone API — expected; see hybrid runbook. |
| 2026-04-10 | Viewport alignment pass: `--site-main-offset-top`, `--layout-padding-inline-start/end`, header safe-top, `html` scroll-padding + notch, cookie banner bottom safe inset; shell/hero/footer gutters unified. |
| 2026-04-10 | Cookie banner: `dvh`/viewport-capped height, `min(72rem, 100vw-…)` width, inner scroll, `vmin` padding, removed duplicate Astro scoped CSS so one stylesheet applies. |
