# Deployment pathways



> **Canonical guide:** [MASTER.md](../MASTER.md) — §5 deployment, §6 pathways, §7 env vars.



## Pathway matrix



| Pathway | Static site | API | Status |

|---------|-------------|-----|--------|

| **Cloudflare Pages hybrid** | Cloudflare Pages | `standalone-api/` + `api/` | **Primary** |

| Unified dev | localhost:3000 | localhost:3002 | Dev |

| Node / cPanel | SSR bundle | `@astrojs/node` | Alternate — [CPANEL_DEPLOY.md](CPANEL_DEPLOY.md) |

| Voice dashboard | N/A | Docker / Render | Optional adjunct |

| GitHub Pages | — | — | **Deprecated** — [GITHUB_PAGES_HYBRID.md](GITHUB_PAGES_HYBRID.md) |



Full details: [MASTER §6](MASTER.md#6-deployment-pathways)



## Related



- [MASTER.md](../MASTER.md)

- [CLOUDFLARE_PAGES.md](CLOUDFLARE_PAGES.md)

- [RUN_AND_TROUBLESHOOT.md](RUN_AND_TROUBLESHOOT.md)

- [HYBRID_API_CONTRACT.md](../development/HYBRID_API_CONTRACT.md)

