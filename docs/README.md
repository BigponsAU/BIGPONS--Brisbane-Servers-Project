# Documentation

**Canonical master guide:** [MASTER.md](MASTER.md) — deployment, SEO, content publishing, build validation, troubleshooting, and doc index.

Use this file as a folder map; detailed operational content lives in **MASTER.md**.

---

## Start here

1. **[MASTER.md](MASTER.md)** — full operations & SEO reference
2. **Live hosting (MCP):** [operations/HOSTING_MCP_WORKSPACE.md](operations/HOSTING_MCP_WORKSPACE.md) · [go-live status](operations/PRODUCTION_GO_LIVE_STATUS.md)
3. **Run locally:** [MASTER §9](MASTER.md#9-run-locally--troubleshoot) or [operations/RUN_AND_TROUBLESHOOT.md](operations/RUN_AND_TROUBLESHOOT.md)
4. **Understand layout:** [project/CODEBASE_WIRE_CARD.md](project/CODEBASE_WIRE_CARD.md)
5. **Account / workspace:** [portal/PORTAL.md](portal/PORTAL.md) · [completion checklist](portal/ACCOUNT_WORKSPACE_CHECKLIST.md)

## Folder map

| Folder | Purpose |
|--------|---------|
| [MASTER.md](MASTER.md) | **Canonical** deployment, SEO, content, build, ops |
| [operations/](operations/) | Runbooks (summarized in MASTER; deep-dive supplements) |
| [portal/](portal/) | Portal behaviour and credentials |
| [project/](project/) | Architecture, contracts, checklists |
| [development/](development/) | Environment variables and dev notes |
| [design/](design/) | Design tokens |
| [archive/](archive/) | Historical docs |

## Public site map (IA)

- **Portal voice framework** — [`/account`](../website-brisbaneservers.com/src/pages/portal.astro), [`portal-voice-framework.ts`](../website-brisbaneservers.com/src/lib/portal-voice-framework.ts)
- **Home interconnection** — [`index`](../website-brisbaneservers.com/src/pages/index.astro), [`HomeInterconnectionRig`](../website-brisbaneservers.com/src/components/HomeInterconnectionRig.astro)
- **Corrections welcome** — [`/about#corrections-welcome`](../website-brisbaneservers.com/src/pages/about.astro)
- **Resources & contribute** — `/resources`, `/contribute`; workspace at `/account`

---

## Supplementary docs (deep dives)

Content below is **summarized in [MASTER.md](MASTER.md)**. Open these for extended detail only.

### Operations
- [brisbaneservers.com production](operations/BRISBANESERVERS_PRODUCTION.md) — domain, Postgres, admin data, privacy
- [Cloudflare Pages](operations/CLOUDFLARE_PAGES.md)
- [Render MCP](operations/RENDER_MCP.md)
- [Deployment pathways](operations/DEPLOYMENT_PATHWAYS.md)
- [Run & troubleshoot](operations/RUN_AND_TROUBLESHOOT.md)
- [cPanel deploy](operations/CPANEL_DEPLOY.md)
- [GitHub Pages hybrid](operations/GITHUB_PAGES_HYBRID.md) (deprecated)
- [Semantic runbook](operations/SEMANTIC_RUNBOOK.md)

### Portal
- [Portal](portal/PORTAL.md)
- [Voice portal scope map](portal/VOICE_PORTAL_SCOPE_MAP.md)
- [Credentials](portal/CREDENTIALS.md)

### Architecture & development
- [Codebase wire card](project/CODEBASE_WIRE_CARD.md)
- [Resource contract](project/RESOURCE_CONTRACT.md)
- [Production checklist](project/PRODUCTION_CHECKLIST.md)
- [Go-live status tracker](operations/PRODUCTION_GO_LIVE_STATUS.md) — brisbaneservers.com checklist progress
- [Environment variables](development/ENV_VARIABLES.md)
- [Feature reconciliation](development/FEATURE_RECONCILIATION.md)
- [Website build checklist](../website-brisbaneservers.com/BUILD_CHECKLIST.md)

### Design & voice framework
- [Design tokens](design/DESIGN_TOKENS_REFERENCE.md)
- [Voice framework README](../voice-framework/README.md)

### Archive
- [archive/](archive/) — superseded implementation notes

---

*Last updated: 2026-05-24*
