# Design preview, local viewing, and GitHub Pages

## What “standardize” means here

One **contract** for how the site is built and previewed, so you are not guessing paths or env values on every session:

| Layer | What to standardize | Where it lives |
|-------|----------------------|----------------|
| **URLs** | Same `PUBLIC_SITE_URL` + `PUBLIC_SITE_BASE` in local `.env`, CI, and production | `website-brisbaneservers.com/.env`, GitHub Actions vars |
| **API** | One public API base for the browser; optional internal base for CI prerender | `PUBLIC_API_BASE_URL`, `INTERNAL_API_BASE_URL` |
| **Design** | Tokens and layout in `src/styles/design-tokens.css` + components; iterate in dev, then push to refresh Pages | Astro + CSS |

Incomplete layout is **not** blocked by GitHub Pages or the database: you can change markup and styles freely in **`npm run dev`**. What *does* affect “live” feel for **account** flows is whether **`PUBLIC_API_BASE_URL`** points at a running API and CORS is set — that is separate from finishing visual layout.

## Suggested next steps (roadmap notes)

These are practical follow-ups after the auth and static-site work; tackle them in whatever order matches your release.

### Ship and operate

- **Production environment**: set `DATABASE_URL` (Postgres API host), SMTP (`AUTH_EMAIL_FROM`, `SMTP_*`), `PUBLIC_SITE_URL`, `PUBLIC_API_BASE_URL`, `ALLOWED_ORIGINS`, and optionally bootstrap `ADMIN_EMAIL` / `ADMIN_PASSWORD` if you use that path.
- **API + database**: deploy the standalone API next to Postgres; point the site’s `PUBLIC_API_BASE_URL` at that API (see `docs/operations/GITHUB_PAGES_HYBRID.md`).
- **Staging smoke test**: register → verify email → login → password reset → revoke sessions → admin audit (if used).

### Further hardening (optional)

- **Secrets**: keep secrets out of the repo; rotate anything that was ever committed.
- **Backups**: automate Postgres backups; document restore.
- **Abuse**: review rate limits; add CAPTCHA on register if spam appears.
- **Observability**: API logging and alerts on errors.

### Product and design

- **Visual pass**: typography, spacing, empty states, mobile account workspace.
- **Content / IA**: clarify public copy and CTAs around the account workspace.

### Automation (optional)

- **CI**: GitHub Actions to build `dist` and deploy Pages (see `.github/workflows/` if present).
- **E2E**: a small scripted or Playwright flow against staging for auth.

---

## How you are supposed to view the site (local vs GitHub Pages)

| Goal | What to run | URL (typical) |
|------|-------------|----------------|
| **Design and edit with live reload** | From repo root: `npm run start:website` **or** `cd website-brisbaneservers.com && npm run dev` | `http://localhost:3000` (Astro dev server) |
| **Site + API together** (login, account, API calls) | From repo root: `npm run start:hybrid` | Site: `http://localhost:3000` · API: `http://localhost:3002` |
| **Preview production build locally** | `cd website-brisbaneservers.com && npm run build && npm run preview` | Shown in the terminal (often `4321` or similar) |

**For day-to-day design work, use `npm run dev` (or `start:website`).** It reloads when you save files. You do **not** need to upload the repo to see changes.

---

## GitHub Pages: when does it update?

- GitHub Pages serves the **built** static output (`dist/`), not your working copy.
- The live Pages URL updates **after** the site is built and deployed—usually when you **push** to the branch your workflow uses, or when the GitHub Action finishes.
- That is **slower** than local dev and is not a substitute for live reload while editing.

**Workflow that works well:**

1. **Iterate locally** with `npm run dev` (fast, live reload).
2. When you want the **public GitHub Pages URL** to match, **commit and push**; wait for the deploy workflow to finish, then refresh the Pages site.

You do **not** have to “upload” the repo manually if you use `git push`; the workflow deploys from the repository.

---

## Push once: GitHub Pages (`*.github.io`)

1. **Enable Pages**: Repo → **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. **Optional variables**: Repo → **Settings → Secrets and variables → Actions → Variables** — set `PUBLIC_API_BASE_URL` (and others per `docs/operations/GITHUB_PAGES_HYBRID.md`) when the API exists.
3. **Push to `main`**: The workflow `.github/workflows/deploy-github-pages.yml` builds `website-brisbaneservers.com` and deploys `dist/`. The live URL is typically `https://<your-username>.github.io/<repo>/`.
4. **Design loop**: Edit locally with `npm run dev` (live reload). When you want the public URL updated, **commit and push**; wait for the green check on the workflow, then hard-refresh the Pages site.

## Related docs

- Hybrid static + API: `docs/operations/GITHUB_PAGES_HYBRID.md`
- Env variables: `docs/development/ENV_VARIABLES.md`
- API contract: `docs/development/HYBRID_API_CONTRACT.md`
