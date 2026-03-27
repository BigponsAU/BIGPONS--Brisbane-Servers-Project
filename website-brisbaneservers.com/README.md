# Brisbane Servers website (Astro)

Hybrid setup:

- Static frontend source: `src-static`
- Shared components/layouts/styles: `src`
- Standalone API host: `standalone-api/server.ts`
- Original Astro API route modules retained under `src/pages/api/` and mounted by the standalone server

In this monorepo you can still run the legacy unified flow from the repo root with `npm start`, but the GitHub Pages migration path uses the hybrid split described in [Run & troubleshoot](../docs/operations/RUN_AND_TROUBLESHOOT.md) and [GitHub Pages hybrid](../docs/operations/GITHUB_PAGES_HYBRID.md).

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

- [Build & run checklist](BUILD_CHECKLIST.md)
- [Design blocks system](DESIGN_BLOCKS_SYSTEM.md)
- [Monorepo documentation hub](../docs/README.md)
- [Hybrid API contract](../docs/development/HYBRID_API_CONTRACT.md)
- [GitHub Pages hybrid deploy](../docs/operations/GITHUB_PAGES_HYBRID.md)
