# Storage, vectors, and library growth (production)

How the **corpus**, **semantic index**, and **library growth** work on the hybrid stack (Cloudflare Pages + Render API).

**Live API:** `brisbane-servers-api` · **Postgres:** users/sessions only · **Corpus:** `voice-framework/storage/` on the API host.

---

## Two persistence layers (one DATABASE_URL)

| Layer | Technology | What it stores | Survives API redeploy? |
|-------|------------|----------------|-------------------------|
| **Auth** | Postgres `DATABASE_URL` (**Neon recommended**) | Users, sessions, passkeys | **Yes** |
| **Corpus + vectors** | Same DB → `corpus_documents` JSONB | Resources, embeddings, growth, profiles | **Yes** |

**Do not use Render free Postgres for long-term** — it expires after 30 days. Use **[Neon](NEON_DATABASE.md)** (free tier, no expiry) and set `DATABASE_URL` on the API to the Neon connection string.

`MONOREPO_ROOT` on Render is `/opt/render/project/src` (repo root). All corpus paths resolve to:

```text
/opt/render/project/src/voice-framework/storage/
```

---

## Corpus files (what matters)

| File | Role |
|------|------|
| `resources.json` | Published/draft resource library (guides, materials) |
| `semantic-index.json` | Chunk embeddings for `/api/semantic/search` and RAG |
| `profiles.json` | Voice profiles (BIGPONS, industry profiles) |
| `growth-proposals.json` | Library growth queue (pending → approve) |
| `library-growth-config.json` | Schedule settings + `scheduleArmed` flag |
| `pipeline-config.json` | Voice/auto-publish thresholds |
| `case-study-drafts.json` | Draft case studies from growth |
| `text-storage.json` / `vector-storage.json` | Legacy voice-framework helpers |

**Git seed:** `voice-framework/storage/resources.json` and `profiles.json` are committed as a baseline. On deploy, `npm run bootstrap:storage` copies seeds only when files are **missing** (never overwrites disk data).

---

## Vectors / semantic search

| Piece | Location |
|-------|----------|
| Index file | `semantic-index.json` |
| Indexing | `src/lib/semantic/pipeline.ts` after resource create/update |
| Search API | `POST /api/semantic/search` |
| Admin UI | Account → Vectors summary, Reindex resource |
| Embeddings | `EMBEDDING_PROVIDER=openai` + `OPENAI_API_KEY`, or **hash** fallback (dev-quality) |

Vectors are **not** on Cloudflare Vectorize today — they live on the API filesystem next to `resources.json`. **Reindex** after bulk imports or disk restore.

---

## Library growth flow

```mermaid
flowchart TB
  subgraph storage [voice-framework/storage]
    R[resources.json]
    G[growth-proposals.json]
    C[library-growth-config.json]
    S[semantic-index.json]
  end

  Cron[POST /api/cron/library-growth] --> Plan[planGrowthProposals]
  UI[Account Library growth panel] --> Plan
  Plan --> G
  Admin[Approve proposal] --> Mat[materializeGrowthProposal]
  Mat --> R
  Mat --> S
  Mat --> Hook[Pages deploy hook]
```

| Step | Who | Action |
|------|-----|--------|
| 1 | Admin | Library growth → **Save settings** (`enabled`, interval) |
| 2 | Admin | **Activate schedule** (`scheduleArmed: true`) — required for cron |
| 3 | Cron or manual | **Run cycle now** → fills `growth-proposals.json` |
| 4 | Admin | **Approve & generate** → writes `resources.json`, reindexes vectors |
| 5 | API | Optional `CLOUDFLARE_PAGES_DEPLOY_HOOK_URL` → rebuild static site |

**API routes** (admin bearer token unless cron):

- `GET/PATCH/POST /api/admin/library-growth`
- `GET/POST /api/admin/growth-proposals`
- `POST /api/cron/library-growth` + `Authorization: Bearer $CRON_SECRET`

---

## Render API + Neon (recommended $0 durable)

| Setup | Corpus on redeploy |
|-------|-------------------|
| **Free API + Neon `DATABASE_URL`** | **Survives** in Postgres |
| **Free API + Render free Postgres** | Auth expires in **30 days** — avoid |
| **Free API + no DATABASE_URL** | **Lost** — filesystem only, git seed on bootstrap |

See **[NEON_DATABASE.md](NEON_DATABASE.md)** for setup steps.

---

## Checklist to completion

| # | Task | Owner |
|---|------|--------|
| 1 | **Neon `DATABASE_URL`** on API (replace Render 30-day DB) | [NEON_DATABASE.md](NEON_DATABASE.md) |
| 2 | Deploy latest `main` (library growth APIs + bootstrap) | Git push / auto-deploy |
| 3 | `OPENAI_API_KEY` on API (optional, better vectors) | Render env |
| 4 | `CLOUDFLARE_PAGES_DEPLOY_HOOK_URL` | Cloudflare Pages → Deploy hooks |
| 5 | GitHub secrets `API_BASE_URL` + `CRON_SECRET` | Repo → Actions |
| 6 | Resend **domain verified** → `AUTH_EMAIL_FROM=support@...` | Resend + Render |
| 7 | `/account` → Library growth → Activate schedule → Run cycle | You |
| 8 | `npm run verify:production -- --api https://brisbane-servers-api.onrender.com` | Local |

---

## Related

- [LIBRARY_GROWTH.md](../portal/LIBRARY_GROWTH.md) — product detail
- [PRODUCTION_GO_LIVE_STATUS.md](PRODUCTION_GO_LIVE_STATUS.md) — phased status
- [HOSTING_MCP_WORKSPACE.md](HOSTING_MCP_WORKSPACE.md) — MCP map
