# Brisbane Servers website (Astro)

Public site, resource library, authenticated **portal**, and **API routes** (`src/pages/api/`). In this monorepo the usual way to run everything is from the repo root: `npm start` (see [Run & troubleshoot](../docs/operations/RUN_AND_TROUBLESHOOT.md)).

## Package commands

```bash
npm run dev      # Astro dev server (default stack uses root npm start)
npm run build    # Production build (Cloudflare adapter by default)
npm run build:cpanel   # cPanel / Node build — see docs
npm run preview  # Preview production build
```

## Documentation

- [Build & run checklist](BUILD_CHECKLIST.md)
- [Design blocks system](DESIGN_BLOCKS_SYSTEM.md)
- [Monorepo documentation hub](../docs/README.md)
