# Resource pipeline outline and draw-back (rollback) plan

This document aligns **ingestion → persistence → async processing → public read** with the normative [Resource contract](../project/RESOURCE_CONTRACT.md) and keeps behaviour predictable when API calls fail, are retried, or overlap. It complements portal copy and interconnection framing (see [PORTAL.md](../portal/PORTAL.md), `portal-voice-framework.ts`) without changing those contracts.

## Layered structure

| Layer | Responsibility | Primary artefacts |
|--------|----------------|---------------------|
| **Intake** | Validate auth, body shape, quotas; assign `processingStatus` and `sourceRef` | API routes under `api/resources/*`, community routes |
| **Normalize** | Single place for id pattern, topic slug, defaults (`resource-ingestion.ts`) | TypeScript helpers |
| **Mutate in memory** | Load full list, append/update one `Resource`, run voice/RAG side effects | Route handlers |
| **Persist** | `ResourceRepository.saveAll` — must not leave a torn JSON file on disk | `json-resource-repository.ts` (atomic replace), `sqlite-resource-repository.ts` (transaction + rollback) |
| **Async / follow-up** | OCR, embeddings, semantic index — **never** required for a valid `Resource` row to exist | Semantic layer, future workers |
| **Read** | Public catalog, SSR pages, static fallbacks | `public-published-resources.ts`, `isPublicResource()` |

## Stages and status fields

- **`status`**: `draft` | `published` | `archived` — editorial / moderation lifecycle.
- **`processingStatus`**: `ready` | `queued` | `ocr` | `embedding` | `failed` — pipeline position; optional on older rows (treat as `ready` when missing for read paths that only care about text).
- **`visibility`**: controls anonymous catalog; **`starter`** is included when published (see contract).

**Rule:** Public text and links must remain coherent if `processingStatus` is `queued` or `failed` (e.g. show “processing” or hide from semantic search only — not half-written content).

## Draw-back matrix (by failure)

| Failure point | Symptom | Draw-back behaviour |
|---------------|---------|---------------------|
| Intake validation (400) | No resource id yet | No write; client fixes body. |
| Auth / RBAC (401/403) | No write | No write. |
| Voice / extrapolation throws mid-handler | Partial in-memory object | Do not call `saveResources`; return 500; no new id exposed as saved. |
| `loadResources` parse error | Empty or partial load | Repository returns `[]` or skips bad rows (JSON); **do not** save until operator fixes file (documented in runbook). |
| `saveAll` throws after successful voice work | User sees error but draft might exist | **Retry:** same request creates a **new** id unless you add idempotency keys later; document as current behaviour. |
| `saveAll` torn write (legacy) | Invalid JSON on disk | Mitigated by **atomic JSON replace** (write temp → rename). On failure, previous file remains (Windows replace uses replace-then-rename sequence where needed). |
| SQLite `saveAll` | DB error mid-transaction | `ROLLBACK` leaves pre-transaction state; then rethrow. |
| Async embed / OCR fails | `processingStatus: failed` | Resource row remains valid text; hub can show failure and offer retry; **do not** delete the resource unless product explicitly requires it. |

## Consistency rules (design + code)

1. **Single id + slug pattern** — use `resource-ingestion` helpers so all writers stay aligned.
2. **Default `processingStatus`** — map intake kind to `ready` vs `queued` in one place (uploads / community → often `queued` until scanned).
3. **Public vs private** — only `isPublicResource()` gates the anonymous catalog; static build uses the same rules via bundled or generated data.
4. **Naming** — “Interconnection” language stays in UX/docs; pipeline docs use neutral verbs (intake, persist, index).

## Implementation pointers

| Piece | Location |
|-------|-----------|
| Ingestion helpers | `website-brisbaneservers.com/src/lib/resource-ingestion.ts` |
| Atomic JSON persistence | `website-brisbaneservers.com/src/lib/repositories/json-resource-repository.ts` |
| Contract + field meanings | `docs/project/RESOURCE_CONTRACT.md` |

## Future hardening (not required for step 1)

- Idempotency keys (`Idempotency-Key` header) for POST create routes.
- Per-resource append or versioned files instead of full-array rewrite (scales better).
- Advisory lock or queue for concurrent editors against the same JSON store.
