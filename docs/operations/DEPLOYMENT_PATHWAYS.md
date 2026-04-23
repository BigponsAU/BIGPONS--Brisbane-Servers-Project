# Deployment pathways

**Primary production path (authoritative): [GitHub Pages hybrid](GITHUB_PAGES_HYBRID.md)** — static Astro frontend on GitHub Pages plus a **separate** Node host for the standalone API (`website-brisbaneservers.com/standalone-api/server.ts`). Browser calls use `PUBLIC_API_BASE_URL`; CORS must allow the Pages origin.

Other paths below are **alternate** (local dev, optional hosts) or **not configured** until you add infrastructure.

## Pathway matrix

| Pathway | Static site | API | Storage / DB | Status |
|---------|-------------|-----|--------------|--------|
| **GitHub Pages hybrid** | GitHub Pages (`src-static` build) | [standalone-api](../../website-brisbaneservers.com/standalone-api/server.ts) + [HYBRID_API_CONTRACT.md](../development/HYBRID_API_CONTRACT.md) | Env-dependent (`DATABASE_URL`, auth DB, JSON under API host) | **Primary** — [GITHUB_PAGES_HYBRID.md](GITHUB_PAGES_HYBRID.md), [ENV_VARIABLES.md](../development/ENV_VARIABLES.md) |
| Unified dev | Same origin (e.g. `npm start` / `start-unified.ts`) | Same process | Local JSON / SQLite | **Dev / alternate** — [RUN_AND_TROUBLESHOOT.md](RUN_AND_TROUBLESHOOT.md) |
| Node standalone (cPanel) | N/A (SSR bundle) | `@astrojs/node` | Filesystem-friendly | **Alternate host** — [CPANEL_DEPLOY.md](CPANEL_DEPLOY.md) |
| Vercel | [vercel.json](../../website-brisbaneservers.com/vercel.json) (redirects only in-repo) | Not defined here | — | **Partial** — static + redirects; API must be hosted separately unless you add serverless routes |
| Cloudflare Pages / Workers | Not configured in-repo | Not configured | — | **Not a deploy path** until `wrangler`/Workers config exists; see [Cloudflare note](#cloudflare-cdn-and-npm-not-cloud-hosting) |

## Cloudflare (CDN and npm — not “we deploy on Cloudflare”)

- **cdnjs.cloudflare.com** in `BaseLayout.astro` loads Font Awesome — a **CDN**, not Cloudflare Pages.
- **pg-cloudflare** may appear in `package-lock.json` as a **transitive** dependency of Postgres drivers — not application hosting.

Do not treat “Cloudflare” in the repo as a first-class deployment target unless you add explicit Workers/Pages configuration and document env vars here.

## Related

- [Run & troubleshoot](RUN_AND_TROUBLESHOOT.md)
- [Hybrid API contract](../development/HYBRID_API_CONTRACT.md)
- [Running notes / live map](../development/RUNNING_NOTES_MAP.md)
