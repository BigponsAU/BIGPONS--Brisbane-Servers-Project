# Semantic platform operations

## Endpoints

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `POST /api/semantic/search` | Editor | Internal similarity search over chunk index |
| `GET /api/resources/related?id=` | Public (rate-limited) | Related published resources |
| `POST /api/admin/reindex-resource` | Admin | Re-embed one resource after model change |
| `GET /api/admin/vectors-summary` | Admin | Legacy vectors + `semanticIndex` stats |

## Environment

- `RESOURCE_STORAGE` — `json` (default) or `sqlite` (local Node; run `npx tsx scripts/migrate-json-to-sqlite.ts` after switching).
- `EMBEDDING_PROVIDER` — `hash` (default without API key) or `openai`.
- `OPENAI_API_KEY` — Required for real embeddings.
- `OPENAI_EMBEDDING_MODEL` — Default `text-embedding-3-small`.

## Re-embed after model change

1. Bump embedding defaults in code or env.
2. Call `POST /api/admin/reindex-resource` with `{ "resourceId": "..." }` per resource, or script a loop over `/api/resources` in the hub.

## Rate limits

Semantic search and related endpoints use in-memory per-IP limits (single instance). Scale out with shared KV/Redis for counters.

## Failure modes

- `processingStatus: failed` on a resource — check server logs for `[pipeline] index failed`.
- Empty RAG context — no chunks yet; generate/upload once to populate `semantic-index.json`.

See [RESOURCE_CONTRACT.md](../project/RESOURCE_CONTRACT.md) and [SEMANTIC_PLATFORM_PLAN.md](../project/SEMANTIC_PLATFORM_PLAN.md).
