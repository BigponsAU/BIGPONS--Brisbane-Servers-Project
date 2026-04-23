# Markdown inventory (repo-wide)

**Hub:** [docs/README.md](../README.md). **Primary deploy:** [DEPLOYMENT_PATHWAYS.md](../operations/DEPLOYMENT_PATHWAYS.md).

Rough classification (~74 `.md` files across the monorepo):

| Bucket | Location | Role |
|--------|----------|------|
| **Hub + operations** | `docs/README.md`, `docs/operations/*`, `DOCS_INDEX.md`, root `README.md` | Runbooks, deploy pathways, troubleshooting |
| **Portal + credentials** | `docs/portal/*` | Account/workspace API and auth env notes |
| **Architecture + status** | `docs/project/*` | Wire card, contracts, backlog, historical status snapshots |
| **Development** | `docs/development/*` | Env, hybrid contract, zoom policy, running notes, this inventory |
| **Design** | `docs/design/*` | Design tokens reference |
| **Archive** | `docs/archive/**` | Superseded implementation write-ups — not authoritative for prod run |
| **Website package** | `website-brisbaneservers.com/*.md` | Module-local (build, design blocks, zoom history, debug) — link from hub, not duplicate deploy matrix |
| **Voice framework** | `voice-framework/**/*.md` | NLP package, dashboard, tests — see hub for entry |
| **Root stray** | `PORTAL.md` | Pointer only — canonical [docs/portal/PORTAL.md](../portal/PORTAL.md) |

When adding docs: either extend the hub table or add a one-line link from `docs/README.md` so the index stays truthful.
