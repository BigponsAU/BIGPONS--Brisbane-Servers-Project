# Neon Postgres — production database (required)

**Neon is the only supported production Postgres.** The Cloudflare Worker reaches Neon via **Hyperdrive**; Neon stores all durable data.

Use **[Neon](https://neon.tech)** for long-term free Postgres. **Do not use Render free Postgres** — it expires after 30 days and is removed from [`render.yaml`](../../render.yaml).

One `DATABASE_URL` stores:

| Data | Table |
|------|--------|
| Users, sessions, passkeys | `users`, `sessions`, … (auth) |
| Resources, vectors, growth, profiles, … | `corpus_documents` (JSONB by key) |

---

## Setup (15 minutes)

### 1. Create Neon project

1. [console.neon.tech](https://console.neon.tech) → New project → e.g. `brisbane-servers`.
2. Copy the **pooled** connection string (hostname contains `-pooler`), e.g.  
   `postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require`  
   Use the pooler URL for serverless (Worker/Hyperdrive) — not the direct (non-pooler) host.

### 2. Connect via Hyperdrive (production)

Hyperdrive config **`brisbane-servers-neon`** on account BIGPONS points at your Neon **pooled** URL.

Update origin in Cloudflare dashboard → **Hyperdrive**, or run:

```powershell
cd website-brisbaneservers.com
npm run configure:hyperdrive
npm run sync:edge-worker-secrets
```

For local / one-off scripts, set `DATABASE_URL` to the same pooled connection string.

### 3. Bootstrap runs automatically

`npm run prestart:api` → `bootstrap-voice-storage`:

- Creates `corpus_documents` if needed
- Imports git seed JSON into Postgres when rows are missing
- Mirrors Postgres → `voice-framework/storage/*.json` for ProfileManager

### 4. Migrate existing Render auth (optional)

```powershell
npm run migrate:render-postgres-to-neon
```

Or manually:

```bash
# Export from Render (dashboard → Connect → external URL)
pg_dump "$RENDER_DATABASE_URL" --no-owner --no-acl > render-auth.sql

# Import to Neon
psql "$NEON_DATABASE_URL" -f render-auth.sql
```

Or register fresh accounts after switching.

### 5. Decommission Render Postgres

After verify passes:

```powershell
npm run decommission:render-postgres
```

### 6. Verify

```bash
cd website-brisbaneservers.com
DATABASE_URL="postgresql://..." npm run bootstrap:storage
DATABASE_URL="postgresql://..." npx tsx scripts/migrate-corpus-to-postgres.ts
```

Sign in at `/account`, create a resource, redeploy API — resource should still exist.

---

## Corpus document keys

| `doc_key` | Content |
|-----------|---------|
| `resources` | Resource library |
| `semantic-index` | Embedding chunks |
| `growth-proposals` | Library growth queue |
| `library-growth-config` | Schedule settings |
| `pipeline-config` | Auto-publish thresholds |
| `contributions` | Community queue |
| `token-ledger` | Token balances |
| `case-study-drafts` | Growth case study drafts |
| `profiles` | Voice profiles |
| `text-storage` | Voice text storage |

---

## Local dev

```env
DATABASE_URL=postgresql://...@ep-xxx.neon.tech/neondb?sslmode=require
```

Without `DATABASE_URL`, corpus uses `voice-framework/storage/*.json` only.

---

## Egress budget (free tier: 5 GB/month)

| Action | Neon egress |
|--------|-------------|
| Pages build with `PAGES_BUILD_USE_GIT_CORPUS=1` | **None** — reads `voice-framework/storage/resources.json` in git |
| Pages build without git corpus | **High** — was 40+ API fetches per build (now 1 with build cache) |
| `npm run export:corpus-for-build` | **One** read of `/api/resources/public` |
| Portal publish / API | Small writes + reads |

When egress is low: set `PAGES_BUILD_USE_GIT_CORPUS=1` on Cloudflare Pages, run `npm run export:corpus-for-build`, commit `resources.json`, then push.

Check usage: [console.neon.tech](https://console.neon.tech) → project → **Usage**.

---

## Related

- [STORAGE_AND_VECTORS.md](STORAGE_AND_VECTORS.md)
- [PRODUCTION_GO_LIVE_STATUS.md](PRODUCTION_GO_LIVE_STATUS.md)
