/**
 * Meta starter: documents how voice profiling, RAG, and inference work on this site.
 * Seeds the corpus so the system can retrieve and voice its own purpose.
 */

import type { Resource } from './resource-types';
import { loadResources, saveResources } from './resources-api';

export const INFERENCE_META_STARTER_ID = 'starter-inference-on-resources';
const SEED_ACTOR = 'system-seed';

const META_STARTER_CONTENT = `# Inference on Resources

This starter block explains how Brisbane Servers combines **voice profiling**, **retrieval (RAG)**, and **inference** in the account workspace. It is written to be indexed, retrieved, and improved like any other resource — so the corpus can describe its own pipeline.

## Mental model

- **Voice profile** is the conductor — tone, terminology, and structure derived from published resources and starters (including BIGPONS / Brisbane default).
- **RAG** is the librarian — embeddings search the semantic index and inject relevant chunks into the prompt before generation or improve.
- **Inference** is the writer — NVIDIA NIM (Developer Program) or Cloudflare Workers AI produces the body; template generators remain the fallback.
- **VoiceMatcher** is the editor — output must meet a minimum voice score or the system falls back to template expansion.
- **The corpus** is the memory — each published or starter resource is chunked, embedded, and available for the next retrieval cycle.

When this document (and related ops notes) live in the corpus, future generates can cite how the platform works — a self-describing loop.

## Generate flow

1. Editor calls **POST /api/resources/generate** with industry, topic, and optional profile selection.
2. **resolveResourceVoiceProfile** picks the active profile (requested → default → library-derived → bundled).
3. **buildRagContext** embeds the task query and retrieves top chunks from the semantic index.
4. **buildInferenceSystemPrompt** and **buildInferenceUserPrompt** combine profile + RAG seed + task.
5. **completeInference** calls NVIDIA or Workers AI; on cap, error, or low voice score → template path.
6. **generateResourceCatalogDescription** writes the hub card blurb in profile voice.
7. **runIndexPipeline** re-embeds the new resource so RAG stays current.

## Improve flow

1. Editor calls **POST /api/resources/:id/improve** on an existing resource.
2. RAG retrieves related chunks (preferring the same resource when indexed).
3. **improveResourceBody** uses the same inference stack with an improve-specific user prompt.
4. Voice validation and usage caps mirror Generate; response includes inference.mode and modelId in the JSON payload.

## Voice profiles in the dashboard

Saved profiles store characteristics (formality, technicality, precision, vocabulary, markers). Profile cards summarise tone and corpus linkage so editors can pick a reference voice for Generate without memorising schema fields.

## Purpose vs voice

**Project purpose** (2032 network implementation, evidence on Resources) governs *what* we document. **Voice framework** governs *how* we write. Inference connects both: grounded retrieval plus profile-conditioned generation.

## Getting started as an editor

1. Open **Workspace → Resources** and choose a voice profile (or Auto).
2. Generate from industry/topic or start from this starter block.
3. Use **Improve** to refine drafts; check voice score in the response.
4. Publish when ready — public resources strengthen BIGPONS and RAG for everyone.

## Evidence and limits

- Daily inference caps apply per role (see **GET /api/usage/me**).
- NVIDIA hosted NIM is for development and prototyping under the Developer Program; Workers AI and template paths provide fallback.
- Embeddings may use OpenAI or a hash fallback — retrieval quality improves when real embeddings are configured.

This starter is idempotent: safe to sync repeatedly; content updates when the seed definition changes.`;

export function buildInferenceMetaStarterResource(): Resource {
  return {
    id: INFERENCE_META_STARTER_ID,
    industry: 'platform',
    topic: 'inference-on-resources',
    title: 'Inference on Resources — voice, RAG, and generation',
    description:
      'How voice profiling, semantic retrieval, and inference (NVIDIA / Workers AI) work together in the Brisbane Servers resource workspace.',
    content: META_STARTER_CONTENT,
    generatedAt: '2026-06-26T00:00:00.000Z',
    generatedBy: SEED_ACTOR,
    version: 1,
    status: 'published',
    isStarterBlock: true,
    visibility: 'starter',
    metadata: {
      wordCount: META_STARTER_CONTENT.split(/\s+/).filter(Boolean).length,
      semanticLevel: 'high',
      voiceScore: 0.85,
    },
    processingStatus: 'queued',
  };
}

export function isInferenceMetaStarterResource(resource: Resource): boolean {
  return resource.id === INFERENCE_META_STARTER_ID && resource.generatedBy === SEED_ACTOR;
}

export interface SyncInferenceMetaStarterResult {
  resources: Resource[];
  added: boolean;
  updated: boolean;
}

/**
 * Upsert the inference meta starter into the corpus. Safe to call on bootstrap and API cold start.
 */
export async function syncInferenceMetaStarterToResources(
  resources?: Resource[]
): Promise<SyncInferenceMetaStarterResult> {
  const list = resources ?? (await loadResources());
  const seed = buildInferenceMetaStarterResource();
  const idx = list.findIndex((r) => r.id === INFERENCE_META_STARTER_ID);
  let added = false;
  let updated = false;

  if (idx < 0) {
    list.push(seed);
    added = true;
  } else {
    const existing = list[idx];
    const contentChanged = existing.content !== seed.content || existing.title !== seed.title;
    list[idx] = {
      ...existing,
      ...seed,
      version: contentChanged ? (existing.version ?? 1) + 1 : existing.version,
      generatedAt: contentChanged ? new Date().toISOString() : existing.generatedAt,
      metadata: {
        ...existing.metadata,
        ...seed.metadata,
        wordCount: seed.metadata?.wordCount,
      },
      processingStatus: contentChanged ? 'queued' : existing.processingStatus,
    };
    updated = contentChanged;
  }

  if (added || updated) {
    await saveResources(list);
  }

  return { resources: list, added, updated };
}
