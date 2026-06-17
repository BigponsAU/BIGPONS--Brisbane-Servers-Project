# brisbaneservers.com — production operations

Professional go-live guide for the public site, account signup, admin workspace, data handling, and legal pages.

**Architecture:** Cloudflare Pages (static site) + **Cloudflare Worker** (API at `api.brisbaneservers.com`) + **Neon** Postgres via Hyperdrive.

**Step-by-step:** [HOSTING_MCP_WORKSPACE.md](HOSTING_MCP_WORKSPACE.md) · [GO_LIVE_RUNBOOK.md](GO_LIVE_RUNBOOK.md)

**Production API URL:** `https://api.brisbaneservers.com/api` only. Render is retired — [RENDER_MCP.md](RENDER_MCP.md).

---

## 1. Domain and Cloudflare Pages

### Custom domain

| Item | Value |
|------|--------|
| **Primary domain** | `https://brisbaneservers.com` |
| **WWW** | Redirect `www.brisbaneservers.com` → apex (Cloudflare DNS / Page Rule or Redirect Rule) |
| **Account workspace** | `https://brisbaneservers.com/account/` |
| **Privacy policy** | `https://brisbaneservers.com/privacy-policy/` |

### Cloudflare Pages build variables (Production)

Set in **Workers & Pages → your project → Settings → Environment variables**:

```env
PUBLIC_SITE_URL=https://brisbaneservers.com
PUBLIC_SITE_BASE=/
PUBLIC_API_BASE_URL=https://api.brisbaneservers.com/api
INTERNAL_API_BASE_URL=https://api.brisbaneservers.com/api
```

Remove `SKIP_HOSTED_API_CHECK` once the API is live.

**Never** put database credentials, `JWT_SECRET`, or admin passwords on Cloudflare Pages — those belong on the **Worker** secrets only.

---

## 2. Secure database for signup (required in production)

User registration, sessions, verification tokens, and auth audit logs must **not** rely on ephemeral SQLite on a free host. Use **managed Postgres** with TLS.

### Recommended providers

| Provider | Why |
|----------|-----|
| **Neon**, **Supabase**, **Render Postgres**, **Railway Postgres** | Managed patches (CVE response), backups, TLS, access control |

### API host environment

```env
NODE_ENV=production
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require
JWT_SECRET=<openssl rand -hex 32>
PUBLIC_SITE_URL=https://brisbaneservers.com
ALLOWED_ORIGINS=https://brisbaneservers.com
ALLOW_CLOUDFLARE_PAGES=1
```

Optional bootstrap admin (change immediately after first login):

```env
ADMIN_EMAIL=you@brisbaneservers.com
ADMIN_PASSWORD=<strong unique password>
```

Email verification (required for signup flow):

```env
AUTH_EMAIL_FROM=Brisbane Servers <support@brisbaneservers.com>
AUTH_EMAIL_REPLY_TO=connect@brisbaneservers.com
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
```

Google OAuth (optional — portal **Continue with Google**):

```env
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=https://<api-host>/api/auth/oauth/google/callback
```

Create a verified bcrypt admin in Postgres (preferred over long-lived `ADMIN_PASSWORD`):

```bash
cd website-brisbaneservers.com
ADMIN_SEED_EMAIL=you@brisbaneservers.com ADMIN_SEED_PASSWORD='...' npm run seed:admin
```

Domain mailboxes (`connect@`, `contact@`, `bigpons@`) via **Cloudflare Email Routing**: [CLOUDFLARE_EMAIL.md](CLOUDFLARE_EMAIL.md).

### Security practices (CVE and hardening)

| Control | Implementation |
|---------|------------------|
| **Passkeys (recommended)** | Register at `/account/` after first sign-in — phishing-resistant; replaces daily use of `ADMIN_PASSWORD` |
| **Bootstrap password** | `ADMIN_EMAIL` + `ADMIN_PASSWORD` in API env only for **initial** setup; run `npm run seed:admin` then add passkey and remove password from env |
| **Dependency CVEs** | CI runs `npm audit --audit-level=high` on website and API deps; fix or pin before deploy |
| **Secrets** | API host env vars only; rotate `JWT_SECRET` and admin password if ever exposed |
| **Transport** | HTTPS everywhere; Postgres `sslmode=require` |
| **Passwords** | bcrypt hashes in DB (already in code); no plaintext storage |
| **Sessions** | JWT + server-side session rows in Postgres; revoke via `/api/auth/revoke-all` |
| **Rate limits** | Auth endpoints rate-limited (`auth-rate-limit`) |
| **CORS** | Explicit `ALLOWED_ORIGINS`; no wildcard in production |
| **Audit trail** | Auth events logged to DB (`/api/admin/auth-audit`, admin-only) |

After deploy, verify:

```bash
curl https://<api-host>/api/health
```

Sign up a test user at `https://brisbaneservers.com/account/` — confirm email verification, login, **register passkey**, and open **Moderation** / **Site review** as admin.

```bash
# One-time admin seed (API host with DATABASE_URL set):
cd website-brisbaneservers.com
ADMIN_SEED_EMAIL=you@brisbaneservers.com ADMIN_SEED_PASSWORD='...' npm run seed:admin
```

---

## 3. Admin workspace — what you can manage today

Sign in at **`/account/`** as `admin` or `super-admin`.

| Capability | Where | API |
|------------|-------|-----|
| User list (emails, roles, verification) | Analytics / admin sections in portal | `GET /api/admin/users` |
| Auth audit (login failures, blocks) | Admin tooling | `GET /api/admin/auth-audit` |
| Community contributions (moderate) | Resources / community flows | `POST /api/community/approve`, `reject` |
| Resource corpus (modeling / voice) | Resources, profiles, analytics panels | `/api/resources/*`, `/api/profiles/*` |
| Token ledger (contribution rewards) | Dashboard token card | `GET /api/tokens/me` (user); ledger updated on approve |
| Pipeline / vectors (semantic index) | Analytics admin meta | `/api/admin/vectors-summary`, `reindex-resource` |

### Data for modeling vs advertising — professional separation

**For voice / content modeling (legitimate product use):**

- Published resources, starter blocks, voice profiles, and contribution text are stored for **content quality and generation** — not sold as raw personal data.
- Admins work in the signed-in workspace; changes are tied to authenticated roles.

**For advertising / aggregate insights (anonymous):**

- Use **aggregated** metrics only: page views (if you add privacy-respecting analytics), resource counts, industry/topic popularity, conversion funnels **without** exporting user emails into ad platforms.
- Do **not** send account emails or contribution author identity to ad networks without explicit consent and an updated privacy policy.
- Cookie banner (`CookieConsent.astro`) must gate non-essential tracking; essential cookies cover login session and consent preference.

**Admin access to identifiable data:**

- Restrict `admin` / `super-admin` to trusted operators only.
- Review `/api/admin/auth-audit` after incidents.
- Prefer Postgres provider audit logs + Cloudflare access logs for infrastructure forensics.

---

## 4. Privacy and policy updates (professional workflow)

Legal pages are **static content** in the repo (not a CMS today):

| Page | Source file |
|------|-------------|
| Privacy Policy | `website-brisbaneservers.com/src/pages/privacy-policy.astro` |
| Terms of Service | `website-brisbaneservers.com/src/pages/terms-of-service.astro` |
| Cookie notice copy | `website-brisbaneservers.com/src/data/value-proposition.ts` (`cookies` section) |

### When to update

Update privacy policy and terms when you:

- Turn on new analytics or advertising pixels
- Change what account signup stores or how long you retain it
- Add new third-party processors (email, hosting, AI APIs)
- Expand admin data export or modeling use of user content

### Update process

1. **Draft** — edit the `.astro` legal page; bump **“Last updated”** date in the hero.
2. **Review** — legal/compliance review (Australian Privacy Principles if serving AU users).
3. **Align** — ensure cookie banner text and `/contribute` forms match the policy.
4. **Commit & push** to `main` — Cloudflare Pages rebuilds automatically.
5. **Notify** — if changes are material, email registered users or show an in-app notice on next login (manual today; no automated policy-version gate yet).
6. **Record** — keep a changelog entry in git commit message (e.g. `legal: privacy policy — add analytics disclosure May 2026`).

### Contact block (keep consistent)

- Privacy / support: `support@brisbaneservers.com`
- Operator: BIGPONS (ABN 93 297 393 962) — as stated on the privacy page

---

## 5. End-to-end checklist for brisbaneservers.com

### Cloudflare

- [ ] Pages project connected to GitHub; root `website-brisbaneservers.com`
- [ ] Custom domain `brisbaneservers.com` active (SSL Full Strict)
- [ ] Build env: `PUBLIC_SITE_URL`, `PUBLIC_SITE_BASE=/`, `PUBLIC_API_BASE_URL`
- [ ] Disable legacy GitHub Pages if still enabled
- [x] **Email Routing** — `connect@`, `contact@`, `bigpons@`, `support@` → `brisbaneservers@gmail.com` (confirmed 2026-05-25; MX on Cloudflare). See [CLOUDFLARE_EMAIL.md](CLOUDFLARE_EMAIL.md).
- [ ] **SMTP on API host** — `support@` outbound for verification/reset (receiving is live; sending is separate)

### API host

- [ ] `DATABASE_URL` Postgres with TLS
- [ ] `JWT_SECRET`, `ADMIN_*` set (no defaults)
- [ ] `ALLOWED_ORIGINS=https://brisbaneservers.com`
- [ ] SMTP configured for verification emails
- [ ] `CLOUDFLARE_PAGES_DEPLOY_HOOK_URL` set (rebuild site when resources publish — SEO)

### Security

- [ ] `npm audit` clean for high severity in CI
- [ ] No secrets in git
- [ ] Admin accounts use strong passwords + email verification

### Legal & trust

- [ ] Privacy policy and terms match actual data practices
- [ ] Cookie consent banner live on public pages
- [ ] `/account` signup discloses purpose of account data

### Smoke test

- [ ] `https://brisbaneservers.com/` loads
- [ ] `https://brisbaneservers.com/account/` — register, verify, login
- [ ] Admin can open dashboard and list users (admin role)
- [ ] `https://brisbaneservers.com/sitemap.xml` and `/robots.txt` correct

---

## 6. Suggested API hostname (optional)

For a cleaner production setup:

1. Create **`api.brisbaneservers.com`** CNAME → API host (Render/Fly/etc.).
2. Set `PUBLIC_API_BASE_URL=https://api.brisbaneservers.com/api`.
3. Add `https://api.brisbaneservers.com` to API TLS certificate.
4. Redeploy Cloudflare Pages after changing the public API URL.

---

## Related

- [MASTER.md](../MASTER.md) — deployment §5, security §10
- [CLOUDFLARE_PAGES.md](CLOUDFLARE_PAGES.md) — Cloudflare-specific steps
- [ENV_VARIABLES.md](../development/ENV_VARIABLES.md) — full env reference
- [portal/CREDENTIALS.md](../portal/CREDENTIALS.md) — admin login configuration
- [project/PRODUCTION_CHECKLIST.md](../project/PRODUCTION_CHECKLIST.md) — extended checklist
