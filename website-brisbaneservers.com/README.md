# Brisbane Servers website (Astro)

Hybrid setup:

- Static frontend source: `src-static`
- Shared components/layouts/styles: `src`
- Standalone API host: `standalone-api/server.ts`
- Original Astro API route modules retained under `src/pages/api/` and mounted by the standalone server

**Primary production path:** [Deployment pathways](../docs/operations/DEPLOYMENT_PATHWAYS.md) (GitHub Pages static site + standalone API). In this monorepo you can still run the unified flow from the repo root with `npm start`; the hybrid split is in [Run & troubleshoot](../docs/operations/RUN_AND_TROUBLESHOOT.md) and [GitHub Pages hybrid](../docs/operations/GITHUB_PAGES_HYBRID.md).

## Package commands

```bash
npm run dev      # Static frontend dev server
npm run start:api  # Standalone API server on port 3002 by default
npm run build    # Static frontend build for GitHub Pages
npm run build:github-pages  # Alias for CI/static deploys
npm run build:cpanel   # cPanel / Node build — see docs
npm run preview  # Preview production build
```

## Documentation

- [Portal / voice + workflow](../docs/portal/PORTAL.md) (workspace rules, resource corpus narrative, **what is automated vs manual**)
- [Deployment pathways](../docs/operations/DEPLOYMENT_PATHWAYS.md) (authoritative matrix; GitHub Pages hybrid primary)
- [Feature reconciliation](../docs/development/FEATURE_RECONCILIATION.md) (native browser zoom + media-query layout; canonical file list)
- [Build & run checklist](BUILD_CHECKLIST.md)
- [Design blocks system](DESIGN_BLOCKS_SYSTEM.md)
- [Monorepo documentation hub](../docs/README.md)
- [Hybrid API contract](../docs/development/HYBRID_API_CONTRACT.md)
- [GitHub Pages hybrid deploy](../docs/operations/GITHUB_PAGES_HYBRID.md)
