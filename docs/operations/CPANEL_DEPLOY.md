# cPanel deployment (today) vs Cloudflare (later)

This site is **SSR + API routes** (`output: 'server'`). It is **not** a static HTML/CSS/JS bundle you can drop into `public_html` alone.

## What does *not* work

- Uploading only the **Cloudflare** build (`npm run build` with default `astro.config.mjs`) — that output targets **Cloudflare Workers** (`dist/_worker.js`). Apache/cPanel will not execute it.
- Expecting **FTP-only** “static hosting” to run `/portal`, `/api/*`, or resource APIs without a **Node.js** process.

## What works on cPanel

Use the **Node standalone** build (does **not** replace the Cloudflare config):

```bash
cd website-brisbaneservers.com
npm install
npm run build:cpanel
```

From repo root:

```bash
npm run build:website:cpanel
```

This uses [website-brisbaneservers.com/astro.config.cpanel.mjs](../../website-brisbaneservers.com/astro.config.cpanel.mjs) (`@astrojs/node`, `mode: 'standalone'`). The default [astro.config.mjs](../../website-brisbaneservers.com/astro.config.mjs) remains **`@astrojs/cloudflare`** for future Cloudflare deploys.

### Run the app

After build:

```bash
cd website-brisbaneservers.com
node ./dist/server/entry.mjs
```

Set `HOST=0.0.0.0` and `PORT` if your host requires it (cPanel Node.js apps often assign a port).

## Directory layout on the server

Runtime paths expect the **monorepo layout** so `voice-framework/storage` (and JSON data) resolve next to the website package:

```
.../O1/   (or same parent folder you use on the host)
  website-brisbaneservers.com/   ← application root / startup cwd
  voice-framework/               ← required at sibling path (Vite alias + storage)
```

Upload **both** `website-brisbaneservers.com` and `voice-framework`, or deploy the whole repo. Do **not** upload only `website-brisbaneservers.com/dist` without the rest unless you have adjusted paths (not default).

Install production dependencies on the server (or build locally and upload `node_modules` + `dist`):

```bash
cd website-brisbaneservers.com
npm ci --omit=dev
npm run build:cpanel
```

## cPanel UI (typical)

1. **Setup Node.js Application** (or equivalent): choose Node **18+**, set application root to `website-brisbaneservers.com`, startup file `dist/server/entry.mjs` (or the path your host documents).
2. Set **environment variables** (production URL, admin credentials, JWT, OpenAI if used) — see [ENV_VARIABLES.md](../development/ENV_VARIABLES.md) and [PRODUCTION_CHECKLIST.md](../project/PRODUCTION_CHECKLIST.md).
3. Map the **public** domain to proxy to the Node port (Passenger, reverse proxy, or host-specific “Application URL”).

Exact clicks vary by host; use their Node.js app docs.

## Reverse proxy / HTTPS

If Apache serves the domain and proxies to Node, use your host’s recommended **.htaccess** or proxy config. Do not commit secrets into `.htaccess`.

## Cloudflare later

When you move to **Cloudflare Pages/Workers**, use the default build:

```bash
npm run build
```

Keep `astro.config.mjs` + `@astrojs/cloudflare` unchanged. The cPanel config is an **alternate** build; both can live in the repo.

## Summary

| Target | Command | Output |
|--------|---------|--------|
| Cloudflare | `npm run build` (default config) | `dist/_worker.js` |
| cPanel / Node host | `npm run build:cpanel` | `dist/server/entry.mjs` |

Neither option is “upload PHP files only”; both need the right runtime and layout as above.
