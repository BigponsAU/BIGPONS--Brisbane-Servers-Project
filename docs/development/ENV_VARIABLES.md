# Environment Variables Configuration

This document describes all environment variables used in the Brisbane Servers monorepo.

## Quick Start

Create a `.env` file in `website-brisbaneservers.com` for the hybrid frontend/API split (or set environment variables in your system) with the following variables:

```bash
PUBLIC_API_BASE_URL=http://localhost:3002/api
INTERNAL_API_BASE_URL=http://localhost:3002/api
PUBLIC_SITE_BASE=/
PUBLIC_SITE_URL=http://localhost:3000
PORT=3002
ALLOWED_ORIGINS=http://localhost:3000
NODE_ENV=development
```

## Environment Variables

### `PORT`

**Type**: Number  
**Default**: `3002`  
**Location**: `website-brisbaneservers.com/standalone-api/server.ts`

The port on which the standalone hybrid API server will run.

**Example**:
```bash
PORT=3002
```

---

### `ALLOWED_ORIGINS`

**Type**: String (comma-separated)  
**Default**: `http://localhost:3000`  
**Location**: `website-brisbaneservers.com/standalone-api/server.ts` (primary hybrid API), `voice-framework/dashboard/middleware/security.ts` (optional voice dashboard service)

Comma-separated list of allowed origins for CORS (Cross-Origin Resource Sharing). In production with GitHub Pages project sites, include `https://<user>.github.io` (the browser origin), not only the repository path.

**Format**: Comma-separated list of URLs

**Development Example**:
```bash
ALLOWED_ORIGINS=http://localhost:3000
```

**Production Example**:
```bash
ALLOWED_ORIGINS=https://example.com,https://www.example.com,https://api.example.com
```

**Note**: Requests with no origin (like mobile apps or curl requests) are automatically allowed.

---

### `NODE_ENV`

**Type**: String  
**Default**: `development`  
**Options**: `development`, `production`, `test`  
**Location**: Multiple files (error handling, logging)

Controls the environment mode, which affects error handling, logging, and security settings.

#### Development Mode (`NODE_ENV=development`)
- More verbose error messages with stack traces
- Detailed logging for debugging
- Relaxed security for local development

#### Production Mode (`NODE_ENV=production`)
- Minimal error messages (no stack traces to prevent information leakage)
- Optimized logging
- Strict security settings

**Example**:
```bash
NODE_ENV=development
```

---

### `PUBLIC_SITE_URL`

**Type**: String (absolute URL; trailing slash is trimmed at build time)  
**Default**: `https://brisbaneservers.com`  
**Location**: `website-brisbaneservers.com/astro.config.mjs` (`site`), canonical links, `/sitemap.xml`

Sets Astro’s `site` origin so canonical URLs, Open Graph/Twitter `og:url`, and the generated sitemap use the correct hostname. Use your real production domain in production; for preview or staging deploys, set this to that deploy’s public URL so metadata and XML stay consistent.

**Example (staging)**:
```bash
PUBLIC_SITE_URL=https://staging.example.com
```

---

### `PUBLIC_SITE_BASE`

**Type**: String (path prefix)  
**Default**: `/`  
**Location**: `website-brisbaneservers.com/astro.config.mjs`

Base path for static frontend deployment. Use `/` for custom domains or root hosting. For GitHub Pages project sites, use the repository path, for example `/O1/`.

---

### `PUBLIC_API_BASE_URL`

**Type**: String (absolute URL including `/api`)  
**Default**: `http://localhost:3002/api`  
**Location**: `website-brisbaneservers.com/src/lib/api-config.ts`, portal/client scripts, static resource pages

Primary API origin for the hybrid frontend. This is the URL used by browser-side code on the portal, contribute flow, resource detail page, and topic/community interactions. For **GitHub Pages**, set this to the absolute URL of your deployed standalone API.

**Example**:
```bash
PUBLIC_API_BASE_URL=https://api.example.com/api
```

---

### `INTERNAL_API_BASE_URL`

**Type**: String (absolute URL including `/api`)  
**Default**: falls back to `PUBLIC_API_BASE_URL`, then `http://localhost:3002/api`  
**Location**: `website-brisbaneservers.com/src/lib/api-config.ts`

Optional build-time API origin for prerendered resource pages. Use this when CI/build jobs should talk to a different/private API origin than the public browser-facing one.

**Example**:
```bash
INTERNAL_API_BASE_URL=https://api-preview.example.com/api
```

---

### `ADMIN_EMAIL` / `ADMIN_PASSWORD` (website + optional bootstrap admin)

**Type**: String  
**Default**: *none* — bootstrap admin login is **disabled** until both are set.  
**Location**: `website-brisbaneservers.com/src/pages/api/auth/login.ts`, `voice-framework/dashboard/middleware/auth.ts`

Used only for optional **environment-configured** admin login (same email/password for both the Astro API and the voice-framework dashboard when you choose to use that path). **There are no seeded defaults in code.** For production, set strong values in cPanel / your host’s environment, or rely on registered users in the auth database (SQLite locally or Postgres when `DATABASE_URL` is set).

---

### `DATABASE_URL`

**Type**: String (Postgres URL)  
**Default**: unset  
**Location**: `website-brisbaneservers.com/src/lib/db/auth-db.ts` and related auth/session DB modules

When set, the primary hybrid API uses Postgres for users, sessions, reset tokens, and auth audit trails. For production this is recommended over local filesystem stores.

---

### Semantic platform (website)

| Variable | Purpose |
|----------|---------|
| `RESOURCE_STORAGE` | `json` (default) or `sqlite` for local sql.js store |
| `EMBEDDING_PROVIDER` | `hash` (default without key) or `openai` |
| `OPENAI_API_KEY` | Embeddings + optional RAG quality |
| `OPENAI_EMBEDDING_MODEL` | e.g. `text-embedding-3-small` |

See [SEMANTIC_RUNBOOK.md](../operations/SEMANTIC_RUNBOOK.md).

---

## Usage in Code

### Dashboard Server Port
```typescript
const PORT = process.env.PORT || 3001;
```

### CORS Configuration
```typescript
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000'];
```

### Error Handling
```typescript
if (process.env.NODE_ENV === 'development' && error instanceof Error) {
  // Include stack traces in development
}
```

---

## Setting Environment Variables

### Option 1: `.env` File (Recommended for Development)

Create a `.env` file in `website-brisbaneservers.com`:

```bash
# website-brisbaneservers.com/.env
PUBLIC_API_BASE_URL=http://localhost:3002/api
INTERNAL_API_BASE_URL=http://localhost:3002/api
PUBLIC_SITE_BASE=/
PUBLIC_SITE_URL=http://localhost:3000
PORT=3002
ALLOWED_ORIGINS=http://localhost:3000
NODE_ENV=development
```

**Note**: Make sure `.env` is in your `.gitignore` to avoid committing sensitive configuration.

### Option 2: System Environment Variables

Set environment variables in your system:

**Windows (PowerShell)**:
```powershell
$env:PUBLIC_API_BASE_URL="http://localhost:3002/api"
$env:INTERNAL_API_BASE_URL="http://localhost:3002/api"
$env:PUBLIC_SITE_BASE="/"
$env:PUBLIC_SITE_URL="http://localhost:3000"
$env:PORT=3002
$env:ALLOWED_ORIGINS="http://localhost:3000"
$env:NODE_ENV="development"
```

**Linux/macOS (Bash)**:
```bash
export PUBLIC_API_BASE_URL="http://localhost:3002/api"
export INTERNAL_API_BASE_URL="http://localhost:3002/api"
export PUBLIC_SITE_BASE="/"
export PUBLIC_SITE_URL="http://localhost:3000"
export PORT=3002
export ALLOWED_ORIGINS="http://localhost:3000"
export NODE_ENV="development"
```

### Option 3: Package.json Scripts

You can also set environment variables in your `package.json` scripts:

```json
{
  "scripts": {
    "start:api": "NODE_ENV=development PORT=3002 npx tsx standalone-api/server.ts"
  }
}
```

---

## Production Deployment

For production deployment, ensure:

1. **Set `NODE_ENV=production`** for optimized performance and security
2. **Configure `ALLOWED_ORIGINS`** with your actual production domains
3. **Set `PORT`** if you need a different API port than 3002
4. **Set `PUBLIC_SITE_URL`** on the Astro static frontend build to your live site origin (canonical URLs and `/sitemap.xml`)
5. **Set `PUBLIC_API_BASE_URL`** to the deployed external API base
6. **Set `INTERNAL_API_BASE_URL`** if your CI/build network should fetch from a different API URL
7. **Set `PUBLIC_SITE_BASE`** to `/<repo>/` for GitHub Pages project sites or `/` for custom domains
8. **Prefer durable storage**: Postgres (`DATABASE_URL`) or paid persistent volumes; avoid ephemeral local JSON/SQLite for critical production data
9. **Use a process manager** (PM2, systemd, etc.) to manage environment variables
10. **Never commit `.env` files** to version control

---

## Troubleshooting

### Port Already in Use
If you see `Port 3001 is already in use`, either:
- Stop the process using that port
- Set `PORT` to a different value

### CORS Errors
If you see CORS errors, ensure:
- `ALLOWED_ORIGINS` includes your frontend URL
- URLs in `ALLOWED_ORIGINS` match exactly (including protocol and port)
- No trailing slashes in URLs

### Error Messages Not Showing Details
If error messages lack details, check:
- `NODE_ENV` is set to `development` for detailed errors
- In production, errors are intentionally minimal

