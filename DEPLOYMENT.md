# Hosting: GitHub Pages + Voice Dashboard API

GitHub Pages serves only static files from `website-brisbaneservers.com/dist`. Run the voice-framework dashboard (Node/Express) on a separate host. Bake the dashboard’s public API root into the static site with **`PUBLIC_API_BASE_URL`** (HTTPS).

---

## Phase 1 — Push this repository to GitHub

1. Commit and push `main` to `origin` (this repo).
2. Authenticate for push (HTTPS token or SSH). From a machine without `gh` login, use Git Credential Manager or a PAT.

---

## Phase 2 — Run the dashboard API (pick one path)

### Path A — Render (blueprint in repo root: `render.yaml`)

1. Open [render.com](https://render.com) and sign in.
2. Click **New** → **Blueprint**.
3. Connect the GitHub account that owns this repo; select **`BIGPONS--Brisbane-Servers-Project`** (or the repo name you use).
4. Apply the blueprint. Wait until the **Web Service** is live.
5. Open that service → **Environment**. Set:
   - **`ALLOWED_ORIGINS`** — exact `Origin` values, comma-separated. For GitHub Pages at `https://<user>.github.io/<repo>/`, the browser still sends **`Origin: https://<user>.github.io`** (no `/repo`). Add every domain that loads the site (including a custom domain if you use one).
   - **`ADMIN_EMAIL`** and **`ADMIN_PASSWORD`** — set both if admin login against this API must work.
6. Copy the service **public URL** (example: `https://voice-framework-dashboard-xxxx.onrender.com`).
7. Confirm **`https://<that-host>/api/health`** returns JSON in a browser.

**Persistence:** Free Render disks are ephemeral. Data under `/app/storage` resets on restart unless you attach a paid disk at **`/app/storage`** or move storage off the instance.

### Path B — GHCR image + your own host

1. On GitHub: **Actions** → **Publish Voice Dashboard (Docker / GHCR)** → **Run workflow** (or push a change under `voice-framework/` to `main`).
2. Pull **`ghcr.io/bigponsau/voice-framework-dashboard:latest`** (owner segment is lowercase; adjust if your GitHub owner differs).
3. Run the container with the same environment variables as in `render.yaml` / `DEPLOYMENT.md` (see the `docker run` block in the previous revision or `voice-framework/.env.example`).

---

## Phase 3 — Wire GitHub Actions (Pages build)

1. On GitHub: **Settings** → **Secrets and variables** → **Actions** → **Variables** tab.
2. Create or update:

| Name | Value |
|------|--------|
| **`PUBLIC_API_BASE_URL`** | `https://<render-or-other-host>/api` (no trailing slash after `api` unless your routes require it; this repo expects the API root to end with `/api`). |
| **`INTERNAL_API_BASE_URL`** | Set to the **same** value as `PUBLIC_API_BASE_URL` unless the Actions runner reaches a different internal URL (rare). |

3. Leave **`PUBLIC_SITE_URL`** and **`PUBLIC_SITE_BASE`** unset to use workflow defaults for `https://<owner>.github.io/<repo>/`, or set them explicitly for a custom domain.
4. **Do not** set **`SKIP_HOSTED_API_CHECK`** unless you are deliberately publishing a site build that will not call the API yet. Remove it after `PUBLIC_API_BASE_URL` is set.

---

## Phase 4 — Deploy the static site

1. On GitHub: **Actions** → **Deploy to GitHub Pages** → **Run workflow**, or push to **`main`** (workflow runs on push to `main`).
2. Wait for **build** then **deploy** jobs to finish.
3. Open the Pages URL; exercise login and any portal calls that hit `/api`.

---

## Phase 5 — GitHub CLI (optional, from a machine where you control auth)

1. Run **`gh auth login`** once.
2. Set variables from a terminal (replace placeholders):

```bash
gh variable set PUBLIC_API_BASE_URL --body "https://YOUR-HOST.onrender.com/api" --repo BigponsAU/BIGPONS--Brisbane-Servers-Project
gh variable set INTERNAL_API_BASE_URL --body "https://YOUR-HOST.onrender.com/api" --repo BigponsAU/BIGPONS--Brisbane-Servers-Project
```

3. Trigger Pages: **`gh workflow run "Deploy to GitHub Pages" --repo BigponsAU/BIGPONS--Brisbane-Servers-Project`**

---

## CORS (dashboard service)

1. Keep **`ALLOWED_ORIGINS`** aligned with real browser origins.
2. Or leave **`ALLOW_GITHUB_PAGES=1`** in Render (blueprint default) so any `https://*.github.io` origin is accepted (looser; tighten for production if needed).

---

## Local development (Cursor)

1. Copy `voice-framework/.env.example` → `.env` and `website-brisbaneservers.com/.env.example` → `.env` as needed.
2. Run **`npm run start:unified`** from the monorepo root (or start website + dashboard separately).
3. Point **`PUBLIC_API_BASE_URL`** at `http://localhost:3001/api` for local builds, or rely on the Vite dev proxy in `astro.config.mjs` when using relative `/api`.
