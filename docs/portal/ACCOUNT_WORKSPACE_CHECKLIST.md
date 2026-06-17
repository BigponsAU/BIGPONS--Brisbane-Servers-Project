# Account workspace — completion checklist

**Product URL:** `/account` (legacy `/portal` redirects)  
**Purpose:** Signed-in control surface for voice-aligned resources, moderation, analytics, and the self-growing library.  
**Canonical ops:** [MASTER.md](../MASTER.md) · **Hosting (MCP):** [HOSTING_MCP_WORKSPACE.md](../operations/HOSTING_MCP_WORKSPACE.md) · **Growth:** [LIBRARY_GROWTH.md](LIBRARY_GROWTH.md)

Use this file to track **dashboard completion** across chat sessions. Items marked **Done** reflect the current repo; **Deploy** = operator action on hosting; **Chat** = continue in ongoing conversation.

---

## Self-growing library — capability matrix

| Capability | Status | Notes |
|------------|--------|-------|
| Collect contribution data | **Done** | Contributions, tokens, moderation panel |
| Analytics → understand gaps | **Done** | Topic metrics + pipeline suggestions |
| **Auto-generate materials** (resources, guides, case study copy) | **Done** | Growth queue + approve → `materializeGrowthProposal` |
| **Voice profiles per area** | **Manual only** | Profiles panel — **not** created by library growth |
| Voice-aligned generation | **Done** | Growth uses **default** or bundled profile only |
| User approval before publish | **Done** | Moderation + growth proposal queue |
| Scheduled / cycle growth | **Done (v1)** | Save settings → **Activate schedule** (physical) → cron/scheduler; **Run cycle now** always manual |
| Case studies auto-created | **Partial** | `case_study` proposals + draft JSON + build merge; promote curated entries manually |
| Pre-materialize dedup | **Partial (v1)** | Topic/title/published guards; semantic vector dedup = Phase 2 |
| Fully autonomous “writes itself” | **Phase 2+** | Not targeted for domain launch |

---

## Workspace UI — panel completion

| Panel | Status | Follow-up |
|-------|--------|-----------|
| Sign-in (password, passkeys, OAuth) | **Done** | **Deploy:** Google OAuth env on API |
| Overview (marketing shell) | **Done** | Optional: more live stats widgets |
| Resources (CRUD, generate, upload) | **Done** | **Chat:** marketing bands |
| Voice profiles | **Done** | — |
| Analytics | **Done** | — |
| Library growth | **Done (v1)** | **Deploy:** activate schedule in production |
| Semantic / vectors (admin) | **Done** | API host index — not Cloudflare Vectorize |
| Moderation (contributions) | **Done** | — |
| Site review (admin) | **Done** | — |
| Split `account-workspace-app.ts` | **Chat** | Maintainability |
| API connectivity banner | **Done** | — |

---

## Production go-live (hybrid)

Cross-reference [GO_LIVE_RUNBOOK.md](../operations/GO_LIVE_RUNBOOK.md) and [PRODUCTION_CHECKLIST.md](../project/PRODUCTION_CHECKLIST.md).

| Item | Status | Action |
|------|--------|--------|
| Phase 0: `npm run verify:go-live` | **Done** | Repo verified |
| Hosting MCP (Cloudflare) | **Active** | [HOSTING_MCP_WORKSPACE.md](../operations/HOSTING_MCP_WORKSPACE.md) |
| Worker `brisbane-servers-api-edge` | **Live** | https://api.brisbaneservers.com/api |
| Cloudflare Pages `brisbaneservers` | **Live** | https://brisbaneservers.com |
| `PUBLIC_API_BASE_URL` on Pages | **Done** | `https://api.brisbaneservers.com/api` |
| Postgres (Neon + Hyperdrive) | **Live** | Worker binding |
| Render legacy | **Retired** | [RENDER_MCP.md](../operations/RENDER_MCP.md) |
| `CLOUDFLARE_PAGES_DEPLOY_HOOK_URL` | **Optional** | Worker secret |
| `/account` on domain | **Live** | [ACCOUNT_DOMAIN_VERIFICATION.md](../operations/ACCOUNT_DOMAIN_VERIFICATION.md) |
| Intentional feature gaps | **Documented** | [FEATURES_NOT_BUILT.md](../operations/FEATURES_NOT_BUILT.md) |
| Deploy pending repo changes | **When ready** | `deploy:edge-worker` + Pages |

---

## Phase 2 product (post-launch)

1. Modularize `account-workspace-app.ts`
2. Resources panel marketing bands
3. Author propose-only growth queue
4. Semantic vector dedup
5. Case-study drafts at Cloudflare build time via API
6. Cloudflare Vectorize (optional backend migration)

---

## Files to know

| Area | Path |
|------|------|
| Go-live runbook | `docs/operations/GO_LIVE_RUNBOOK.md` |
| Page orchestrator | `website-brisbaneservers.com/src/pages/portal.astro` |
| Growth lib | `website-brisbaneservers.com/src/lib/library-growth/` |
| Cron route | `website-brisbaneservers.com/api/cron/library-growth.ts` |

---

**Last updated:** 2026-05-24 (go-live artifacts)
