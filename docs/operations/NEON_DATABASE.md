# Neon Postgres — durable $0 corpus + auth

Use **[Neon](https://neon.tech)** (or Supabase) for **long-term free** Postgres. Avoid Render’s **free** Postgres (`brisbane-servers-db`) — it **expires after 30 days**.

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
   Use the pooler URL for Render/serverless — not the direct (non-pooler) host.

### 2. Set on Render API

**brisbane-servers-api** → **Environment**:

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | Neon connection string (replace Render Postgres URL) |

Save → redeploy.

### 3. Bootstrap runs automatically

`npm run prestart:api` → `bootstrap-voice-storage`:

- Creates `corpus_documents` if needed
- Imports git seed JSON into Postgres when rows are missing
- Mirrors Postgres → `voice-framework/storage/*.json` for ProfileManager

### 4. Migrate existing Render auth (optional)

If you already have users on Render Postgres:

```bash
# Export from Render (dashboard → Connect → external URL)
pg_dump "$RENDER_DATABASE_URL" --no-owner --no-acl > render-auth.sql

# Import to Neon
psql "$NEON_DATABASE_URL" -f render-auth.sql
```

Or register fresh accounts after switching.

### 5. Verify

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

## Related

- [STORAGE_AND_VECTORS.md](STORAGE_AND_VECTORS.md)
- [PRODUCTION_GO_LIVE_STATUS.md](PRODUCTION_GO_LIVE_STATUS.md)
