# Semantic platform: hub + public site integration

Normative backlog for storage, embeddings, RAG, and public read alignment. Phases A–G; implement against repository and API paths listed in [RESOURCE_CONTRACT.md](RESOURCE_CONTRACT.md).

## Design reference (PHI / dynamic symmetry)

Geometric armature over organic content: **contracts first** (schema, visibility), **content second** (uploads, PDFs). One pipeline spiral from ingest to published read model; proportionate tuning of chunk size, top-k, and model versions.

## Target architecture

- **Canonical store:** Structured metadata + text chunks + versioned embeddings (DB or JSON dev) + unified chunk index — not competing ad hoc vector files.
- **Hub:** Authoring, publish lifecycle, indexing jobs, RAG generate/improve, voice guardrails.
- **Public:** Read-only published slice; same resource IDs and visibility as hub (`isPublicResource`).

**Pipeline:** ingest → normalize/chunk → embed → index → retrieve (RAG) → generate/improve → ToneAnalyzer / VoiceMatcher.

## Surface map

| Concern | Hub | Public |
|--------|-----|--------|
| Authoring | Yes | Contribute flows only |
| Published display | Full | `/resources`, item pages via `/api/resources/public` |
| Semantic search | Admin / testing | Optional related resources |
| OCR / heavy work | Async + status | Final text only |

## Upgrade themes

1. Storage abstraction with JSON default; optional SQLite (`RESOURCE_STORAGE=sqlite`) for local/dev.
2. Unified semantic index (`semantic-index.json` or SQLite) — replace TF-IDF and 1D `vectors.json` placeholders on the hot path.
3. RAG on generate/improve with retrieval logging.
4. OCR as ingest branch (`processingStatus` on resources).
5. Cloudflare: no mutable disk — use JSON/SQLite locally; production should target D1 + Vectorize or external DB (see checklist).

## Dependency graph

`A → B → C → D`; `B + C → E`; `C + uploads → F`; `D + E + F → G`.

## Using this document

- Phase A (contract + inventory) gates embedding work.
- Track stories per phase in your PM tool; link acceptance tests (e.g. publish → visible on `/resources` within N minutes).

See also: [SEMANTIC_RUNBOOK.md](../operations/SEMANTIC_RUNBOOK.md), [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md).
