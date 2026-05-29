# Production Deployment Checklist

> **Canonical guide:** [MASTER.md](../MASTER.md) — §10 production security, §5 deployment, §8 build validation.

## Critical (never deploy with defaults)

- [ ] Change `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `JWT_SECRET`
- [ ] Default admin `admin@brisbaneservers.com` / `admin123` must **not** be used
- [ ] Set `DATABASE_URL` (Postgres + `sslmode=require`) for production signup — see [BRISBANESERVERS_PRODUCTION.md](../operations/BRISBANESERVERS_PRODUCTION.md)
- [ ] Set `NODE_ENV=production`
- [ ] Set `ALLOWED_ORIGINS=https://brisbaneservers.com` (and API subdomain if used)
- [ ] Enable HTTPS on API host
- [ ] Privacy policy matches actual data collection; cookie consent live

## Repo readiness (before deploy)

```bash
cd website-brisbaneservers.com
npm run verify:go-live
```

Status tracker: [PRODUCTION_GO_LIVE_STATUS.md](../operations/PRODUCTION_GO_LIVE_STATUS.md)

## Deployment

> **Phased runbook:** [GO_LIVE_RUNBOOK.md](../operations/GO_LIVE_RUNBOOK.md)

- [ ] Cloudflare Pages connected; env vars set (see `website-brisbaneservers.com/cloudflare-pages.env.example`)
- [ ] Standalone API deployed via [`render.yaml`](../../render.yaml) service `brisbane-servers-api` or equivalent; `npm run verify:production -- --api <host>`
- [ ] `CLOUDFLARE_PAGES_DEPLOY_HOOK_URL` set on API host (SEO)
- [ ] `CRON_SECRET` set on API host; library growth cron or `LIBRARY_GROWTH_SCHEDULER=1` (see [LIBRARY_GROWTH.md](../portal/LIBRARY_GROWTH.md))
- [ ] Library growth enabled in account workspace (admin → Library growth)
- [ ] `npm run build` passes locally including content SEO validation
- [ ] Post-deploy: `/sitemap.xml`, `/robots.txt`, `/account` login

## Post-deploy verification

```bash
curl https://your-domain.com/api/health
curl https://your-domain.com/sitemap.xml
```

## Full checklist

Security, obfuscation, monitoring, and voice-dashboard specifics remain in this file for deep reference. Operational summary: [MASTER §10](MASTER.md#10-production-security-checklist).

---

**Last updated:** 2026-05-24
