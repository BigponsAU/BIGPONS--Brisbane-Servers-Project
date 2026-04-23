# GitHub Pages Hybrid Deployment

**This is the primary production pathway.** See the full matrix: [DEPLOYMENT_PATHWAYS.md](DEPLOYMENT_PATHWAYS.md).

This repository supports a hybrid deployment model:

- GitHub Pages serves the static Astro frontend built from `website-brisbaneservers.com/src-static`
- A separate standalone API host serves the dynamic routes mounted from `website-brisbaneservers.com/src/pages/api/*`

## Required repository variables

Configure these under **GitHub → your repo → Settings → Secrets and variables → Actions → Variables** (or set them in the **github-pages** environment if you use environment-scoped vars).

The workflow **defaults** `PUBLIC_SITE_BASE` and `PUBLIC_SITE_URL` for a normal **project site** (`https://<owner>.github.io/<repo>/`). Override the variables below only when you use a **custom domain** or a different public API URL.

| Variable | When to set | Example |
|----------|-------------|---------|
| `PUBLIC_API_BASE_URL` | **Always for real hybrid use** — browser calls this API from the static site | `https://api.yourdomain.com/api` |
| `INTERNAL_API_BASE_URL` | Optional — build-time fetches in CI (defaults to `PUBLIC_API_BASE_URL`) | Same as public, or an internal CI URL |
| `PUBLIC_SITE_URL` | Optional — overrides canonical site origin (defaults to `https://<owner>.github.io/<repo>`) | `https://yourdomain.com` |
| `PUBLIC_SITE_BASE` | Optional — path prefix (defaults to `/<repo>/`; use `/` for custom domain at root) | `/` or `/O1/` |

Static-only preview (no API): you can leave `PUBLIC_API_BASE_URL` unset; the build still completes, but account/login and dynamic resource calls will not work until you point the variable at a live API and add that origin to `ALLOWED_ORIGINS` on the API host.

## Workflow

The workflow in `.github/workflows/deploy-github-pages.yml`:

1. Installs dependencies in `website-brisbaneservers.com`
2. Builds the static Astro frontend
3. Uploads `website-brisbaneservers.com/dist`
4. Deploys that artifact to GitHub Pages

## API deployment

GitHub Pages does not run the dynamic backend. Deploy the standalone API separately from:

`website-brisbaneservers.com/standalone-api/server.ts`

The API host must expose the same `/api/*` contract documented in `docs/development/HYBRID_API_CONTRACT.md`.

## Local verification

```bash
npm run start:hybrid
cd website-brisbaneservers.com && npm run build
```

Verify:

- `http://localhost:3002/api/health`
- `http://localhost:3002/api/resources/public`
- `http://localhost:3000/account`
- `http://localhost:3000/contribute`

## Notes

- The static resource detail page lives at `/resources/item/?id=<resourceId>`
- Shared runtime/API resolution lives in `src/lib/api-config.ts`
- The value/zoom descriptor layer is resolved in `src/lib/page-descriptors.ts`
