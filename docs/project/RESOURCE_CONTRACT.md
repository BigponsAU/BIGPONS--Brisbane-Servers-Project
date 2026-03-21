# Resource contract (normative)

Single schema for hub APIs and public read paths. Extends the TypeScript `Resource` type in [website-brisbaneservers.com/src/lib/resources-api.ts](../../website-brisbaneservers.com/src/lib/resources-api.ts).

## Fields

| Field | Type | Required | Notes |
|-------|------|----------|--------|
| `id` | string | yes | Stable unique id (e.g. `{industry}-{topic}-{timestamp}`) |
| `industry` | string | yes | Industry slug/key |
| `topic` | string | yes | Normalized topic slug |
| `title` | string | yes | Display title |
| `description` | string | yes | Short summary |
| `content` | string | yes | Full body text |
| `generatedAt` | ISO string | yes | Last generation/update time |
| `generatedBy` | string | no | Email of editor |
| `ownerId` | string | no | Owner user id (community) |
| `version` | number | yes | Monotonic content version |
| `status` | `draft` \| `published` \| `archived` | yes | Lifecycle |
| `isStarterBlock` | boolean | no | Starter template |
| `visibility` | `public` \| `private` \| `starter` | no | Missing = legacy public-compatible |
| `metadata` | object | no | `wordCount`, `semanticLevel`, `voiceScore` |
| `embeddingModel` | string | no | Embedding provider model id |
| `embeddingVersion` | number | no | Integer bump when re-embedding |
| `chunkIds` | string[] | no | Deterministic chunk ids for this resource |
| `processingStatus` | enum | no | Ingest/index pipeline (see below) |
| `sourceRef` | object | no | `{ kind: 'upload' \| 'paste'; filename?: string; mimeType?: string }` |

### `processingStatus`

- `ready` — Text is usable; indexing may run async.
- `queued` — Awaiting processing.
- `ocr` — Scanned PDF / image pipeline; text may be placeholder until OCR completes.
- `embedding` — Chunk/embed in progress.
- `failed` — Pipeline error (see server logs).

## Visibility (public site)

Implemented by `isPublicResource()` in `resources-api.ts`:

- `status === 'published'`
- `visibility` is `undefined` or `public` (not `private` or `starter` for anonymous public listing)

Community moderation: resources created via community flows may start as `draft` until approved; approve flow promotes to `published` where applicable.

## Writers (inventory)

| Path | Role |
|------|------|
| [resources-api.ts](../../website-brisbaneservers.com/src/lib/resources-api.ts) | Load/save, `RESOURCES_FILE` |
| [api/resources/index.ts](../../website-brisbaneservers.com/src/pages/api/resources/index.ts) | List |
| [api/resources/[id].ts](../../website-brisbaneservers.com/src/pages/api/resources/[id].ts) | CRUD |
| [api/resources/generate.ts](../../website-brisbaneservers.com/src/pages/api/resources/generate.ts) | Generate + RAG |
| [api/resources/upload.ts](../../website-brisbaneservers.com/src/pages/api/resources/upload.ts) | Upload |
| [api/resources/process.ts](../../website-brisbaneservers.com/src/pages/api/resources/process.ts) | Process |
| [api/resources/seed.ts](../../website-brisbaneservers.com/src/pages/api/resources/seed.ts) | Seed |
| [api/resources/deduplicate.ts](../../website-brisbaneservers.com/src/pages/api/resources/deduplicate.ts) | Dedupe |
| [api/resources/from-starter-block.ts](../../website-brisbaneservers.com/src/pages/api/resources/from-starter-block.ts) | From starter |
| [api/resources/community-upload.ts](../../website-brisbaneservers.com/src/pages/api/resources/community-upload.ts) | Community |
| [api/community/approve.ts](../../website-brisbaneservers.com/src/pages/api/community/approve.ts) | Approve |
| [api/profiles/create-base.ts](../../website-brisbaneservers.com/src/pages/api/profiles/create-base.ts) | Reads resources |

Voice framework JSON: [text-storage.ts](../../voice-framework/storage/text-storage.ts), [profile-manager paths](../../voice-framework/storage/), [vector-storage.ts](../../voice-framework/storage/vector-storage.ts) (legacy TF-IDF; not public-site source of truth).

## Readers (inventory)

| Path | Role |
|------|------|
| [api/resources/public.ts](../../website-brisbaneservers.com/src/pages/api/resources/public.ts) | Public list/get |
| [resources/item/[resourceId].astro](../../website-brisbaneservers.com/src/pages/resources/item/[resourceId].astro) | SSR fetch public API |
| [resources/[industry]/](../../website-brisbaneservers.com/src/pages/resources/) | Resource hubs |
| [portal.astro](../../website-brisbaneservers.com/src/pages/portal.astro) | Hub UI |
| [analytics.ts](../../website-brisbaneservers.com/src/lib/analytics.ts) | Analytics |

## Semantic index

Chunk embeddings and metadata live in the unified semantic layer ([website-brisbaneservers.com/src/lib/semantic/](../../website-brisbaneservers.com/src/lib/semantic/)) — not duplicate `vectors.json` semantics for retrieval.
