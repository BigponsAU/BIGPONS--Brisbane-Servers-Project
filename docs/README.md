# Documentation

Human-written project documentation lives under **`docs/`**. Use this file as the table of contents.

## Start here

1. **Run locally:** [operations/RUN_AND_TROUBLESHOOT.md](operations/RUN_AND_TROUBLESHOOT.md)
2. **Understand layout:** [project/CODEBASE_WIRE_CARD.md](project/CODEBASE_WIRE_CARD.md)
3. **Portal + API surface:** [portal/PORTAL.md](portal/PORTAL.md)

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

Canonical locations for voice and design narrative on the marketing site:

- **Design philosophy (additive semantics)** — [`/about#additive-semantics`](../website-brisbaneservers.com/src/pages/about.astro) (live: `/about#additive-semantics`)
- **Corrections welcome** — [`/about#corrections-welcome`](../website-brisbaneservers.com/src/pages/about.astro)
- **Resources & contribute** — public `/resources` and `/contribute`; signed-in tools at **`/portal`**

---

## Getting started

- [Repository status](project/REPOSITORY_STATUS.md) — Current overview and readiness
- [Voice framework README](../voice-framework/README.md) — NLP package overview
- [Website README](../website-brisbaneservers.com/README.md) — Astro app overview

## Operations & deployment

- [Run & troubleshoot](operations/RUN_AND_TROUBLESHOOT.md) — Start stack, verify, common failures
- [cPanel deploy](operations/CPANEL_DEPLOY.md) — Node / cPanel build path
- [Semantic runbook](operations/SEMANTIC_RUNBOOK.md) — Embeddings and semantic index

## Portal

- [Portal](portal/PORTAL.md) — Features and API summary
- [Credentials](portal/CREDENTIALS.md) — Default and production admin auth

## Architecture & contracts

- [Codebase wire card](project/CODEBASE_WIRE_CARD.md) — Wiring, routes, storage, diagrams
- [Resource contract](project/RESOURCE_CONTRACT.md) — Resource and API expectations
- [Semantic platform plan](project/SEMANTIC_PLATFORM_PLAN.md) — Backlog for storage / RAG alignment
- [Production checklist](project/PRODUCTION_CHECKLIST.md) — Production readiness
- [Repository fixes summary](project/FIXES_IMPLEMENTED.md) — Hardening and fix log
- [Test upload guide](project/TEST_UPLOAD_GUIDE.md) — Upload and validation
- [Layout / φ viewport](project/LAYOUT_PHI_VIEWPORT.md) — Layout notes (with [PHI armature](project/PHI_ARMATURE.md))

## Development

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

*Last updated: 2026-03-22*
