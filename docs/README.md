# Documentation

Human-written project documentation lives under **`docs/`**. Use this file as the table of contents.

## Start here

1. **Production deploy (primary):** [operations/DEPLOYMENT_PATHWAYS.md](operations/DEPLOYMENT_PATHWAYS.md) — GitHub Pages hybrid + API
2. **Run locally:** [operations/RUN_AND_TROUBLESHOOT.md](operations/RUN_AND_TROUBLESHOOT.md)
3. **Understand layout:** [project/CODEBASE_WIRE_CARD.md](project/CODEBASE_WIRE_CARD.md)
4. **Account / workspace + API surface:** [portal/PORTAL.md](portal/PORTAL.md)

## Folder map

| Folder | Purpose |
|--------|---------|
| [operations/](operations/) | Runbooks, deploy, semantic pipeline ops |
| [portal/](portal/) | Portal behaviour and credentials |
| [project/](project/) | Architecture, contracts, status, checklists |
| [development/](development/) | Environment variables and dev notes |
| [design/](design/) | Design tokens and system reference |
| [archive/](archive/) | Superseded or historical docs |

## Public site map (IA)

Canonical locations for voice and design narrative:

- **Portal voice framework rules** — [`/account`](../website-brisbaneservers.com/src/pages/portal.astro) and [`src/lib/portal-voice-framework.ts`](../website-brisbaneservers.com/src/lib/portal-voice-framework.ts) (includes `resourceVoiceInterconnection` and `portalAndPublicInterconnectionSummary` tying corpus narrative to public UX)
- **Home interconnection visuals** — [`index`](../website-brisbaneservers.com/src/pages/index.astro) + [`HomeInterconnectionRig`](../website-brisbaneservers.com/src/components/HomeInterconnectionRig.astro) + margin/section satellite components (see [PORTAL.md](portal/PORTAL.md) system workflow)
- **Corrections welcome** — [`/about#corrections-welcome`](../website-brisbaneservers.com/src/pages/about.astro)
- **Resources & contribute** — public `/resources` and `/contribute`; signed-in workspace at **`/account`** (legacy `/portal` may redirect)

---

## Getting started

- [Repository status](project/REPOSITORY_STATUS.md) — Current overview and readiness
- [Voice framework README](../voice-framework/README.md) — NLP package overview
- [Website README](../website-brisbaneservers.com/README.md) — Astro app overview

## Operations & deployment

- [Deployment pathways](operations/DEPLOYMENT_PATHWAYS.md) — **Primary: GitHub Pages hybrid**; alternate paths; Cloudflare clarification
- [GitHub Pages hybrid](operations/GITHUB_PAGES_HYBRID.md) — Static site + standalone API
- [Run & troubleshoot](operations/RUN_AND_TROUBLESHOOT.md) — Start stack, verify, common failures
- [cPanel deploy](operations/CPANEL_DEPLOY.md) — Node / cPanel build path (alternate host)
- [Semantic runbook](operations/SEMANTIC_RUNBOOK.md) — Embeddings and semantic index

## Portal

- [Portal](portal/PORTAL.md) — Features and API summary
- [Voice portal scope map](portal/VOICE_PORTAL_SCOPE_MAP.md) — Repo + `/account` UI map, API tables, where backend logic lives
- [Credentials](portal/CREDENTIALS.md) — Default and production admin auth

## Architecture & contracts

- [Codebase wire card](project/CODEBASE_WIRE_CARD.md) — Wiring, routes, storage, diagrams
- [Resource contract](project/RESOURCE_CONTRACT.md) — Resource and API expectations
- [Semantic platform plan](project/SEMANTIC_PLATFORM_PLAN.md) — Backlog for storage / RAG alignment
- [Production checklist](project/PRODUCTION_CHECKLIST.md) — Production readiness
- [Repository fixes summary](project/FIXES_IMPLEMENTED.md) — Hardening and fix log
- [Test upload guide](project/TEST_UPLOAD_GUIDE.md) — Upload and validation
- [PHI armature](project/PHI_ARMATURE.md) — Layout / φ design reference (replaces older “layout viewport” draft; no separate `LAYOUT_PHI_VIEWPORT.md`)

## Development

- [Resource pipeline & draw-back](development/RESOURCE_PIPELINE_AND_DRAWBACK.md) — Ingestion layers, rollback matrix, atomic JSON persistence
- [Feature reconciliation](development/FEATURE_RECONCILIATION.md) — Native browser zoom + CSS media queries; no JS zoom tier (avoid duplicate implementations)
- [Running notes & map](development/RUNNING_NOTES_MAP.md) — Incremental “how it works” during development
- [Project next steps report](development/PROJECT_NEXT_STEPS_REPORT.md) — Priorities after checkpoints (deploy, auth, resources, quality)
- [Doc inventory](development/DOC_INVENTORY.md) — How Markdown is bucketed in this repo
- [Environment variables](development/ENV_VARIABLES.md)
- [Env example](development/ENV_EXAMPLE.md)
- [Voice quick start](../voice-framework/QUICK_START.md)
- [Build instructions](../voice-framework/BUILD_INSTRUCTIONS.md)
- [Build & run checklist](../website-brisbaneservers.com/BUILD_CHECKLIST.md)

## Design

- [Design tokens reference](design/DESIGN_TOKENS_REFERENCE.md)
- [Design blocks system](../website-brisbaneservers.com/DESIGN_BLOCKS_SYSTEM.md)

## API & debugging

- [API mapping](../voice-framework/API_MAPPING.md)
- [Dashboard README](../voice-framework/dashboard/README.md)
- [Debug quick reference](../voice-framework/DEBUG_QUICK_REFERENCE.md)
- [Debug sweep report](../website-brisbaneservers.com/DEBUG_SWEEP_REPORT.md)
- [Chrome cache fix](../website-brisbaneservers.com/CHROME_CACHE_FIX.md)

## Archived implementation notes

Historical feature write-ups (still useful for deep dives):

- [Starter blocks implementation](archive/implementation/STARTER_BLOCKS_IMPLEMENTATION.md)
- [Starter blocks verification](archive/implementation/STARTER_BLOCKS_VERIFICATION.md)
- [Base profile implementation](archive/implementation/BASE_PROFILE_IMPLEMENTATION.md)
- [Color coding & analytics sync](archive/implementation/COLOR_CODING_AND_SYNC.md)
- [Workspace & profiles fixes](archive/implementation/WORKSPACE_AND_PROFILES_FIX.md)

## Archive (superseded)

- [Cleanup documentation](archive/CLEANUP_DOCUMENTATION.md)
- [Setup complete](archive/SETUP_COMPLETE.md) — superseded by portal + run docs
- [Integration summary](archive/INTEGRATION_SUMMARY.md) — superseded by [portal/PORTAL.md](portal/PORTAL.md)
- [Consolidation complete](archive/CONSOLIDATION_COMPLETE.md) — superseded by portal + run docs

---

*Last updated: 2026-04-10*
