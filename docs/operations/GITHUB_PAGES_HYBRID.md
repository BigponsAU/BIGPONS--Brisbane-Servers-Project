# GitHub Pages Hybrid Deployment

This repository now supports a hybrid deployment model:

- GitHub Pages serves the static Astro frontend built from `website-brisbaneservers.com/src-static`
- A separate standalone API host serves the dynamic routes mounted from `website-brisbaneservers.com/src/pages/api/*`

## Required repository variables

Set these GitHub repository variables before enabling the Pages workflow:

```bash
PUBLIC_API_BASE_URL=https://your-api-host.example.com/api
INTERNAL_API_BASE_URL=https://your-api-host.example.com/api
PUBLIC_SITE_URL=https://your-domain.example.com
PUBLIC_SITE_BASE=/
```

Use `PUBLIC_SITE_BASE=/<repo>/` only if you are deploying as a GitHub Pages project site without a custom domain.

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
- `http://localhost:3000/portal`
- `http://localhost:3000/contribute`

## Notes

- The static resource detail page lives at `/resources/item/?id=<resourceId>`
- Shared runtime/API resolution lives in `src/lib/api-config.ts`
- The value/zoom descriptor layer is resolved in `src/lib/page-descriptors.ts`
