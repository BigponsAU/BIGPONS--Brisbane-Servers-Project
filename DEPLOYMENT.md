# Hosting: Cloudflare Pages + Hosted API

> **Canonical guide:** [docs/MASTER.md](docs/MASTER.md) — sections 5–7 cover deployment, env vars, and troubleshooting in full.

Cloudflare Pages serves the static Astro frontend from `website-brisbaneservers.com/dist`. The production backend is the standalone API (`standalone-api/server.ts`, handlers in `api/`).

## Quick checklist

1. Connect repo to **Cloudflare Pages** (not Workers) — root `website-brisbaneservers.com`, build `npm run build`, output `dist`
2. Set Pages env: `PUBLIC_API_BASE_URL`, `PUBLIC_SITE_URL`, `PUBLIC_SITE_BASE=/`
3. Deploy standalone API to Node host; set `ALLOWED_ORIGINS`, secrets, `DATABASE_URL`
4. Set **`CLOUDFLARE_PAGES_DEPLOY_HOOK_URL`** on API host for SEO when publishing resources
5. Verify `/account`, `/sitemap.xml`, `/robots.txt`

**Live hosting (MCP-linked):** [docs/operations/HOSTING_MCP_WORKSPACE.md](docs/operations/HOSTING_MCP_WORKSPACE.md) · [status](docs/operations/PRODUCTION_GO_LIVE_STATUS.md)

See [MASTER.md §5](docs/MASTER.md#5-deployment--cloudflare-pages-primary) and [GO_LIVE_RUNBOOK.md](docs/operations/GO_LIVE_RUNBOOK.md).

## Local development

```bash
npm run start:hybrid
```

Frontend: `http://localhost:3000` · API: `http://localhost:3002/api`

## Related

- [MASTER.md](docs/MASTER.md) — full operations & SEO reference
- [docs/operations/CLOUDFLARE_PAGES.md](docs/operations/CLOUDFLARE_PAGES.md) — Cloudflare-specific supplement
