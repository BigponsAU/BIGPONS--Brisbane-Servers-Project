# Brisbane Servers website

Static Astro frontend with a **hybrid API** hosted separately (Cloudflare Pages + standalone Node API).

## Layout

- **Frontend:** `src/` — pages, components, styles (built to `dist/`)
- **API handlers:** `api/` — loaded at runtime by `standalone-api/server.ts`
- **API server:** `standalone-api/server.ts` (default port 3002)

## Scripts

```bash
npm run dev              # Astro dev server (port 3000)
npm run start:api        # Standalone hybrid API (port 3002)
npm run build            # Production static build → dist/
npm run build:hosted     # Local build with production-like env
npm run preview:hosted   # Preview after build:hosted
npm test                 # Vitest (includes API contract tests)
```

From monorepo root: `npm run start:hybrid` runs website + standalone API together.

## Deployment & SEO

**Master guide:** [docs/MASTER.md](../docs/MASTER.md) — deployment, SEO, content publishing, build validation.
