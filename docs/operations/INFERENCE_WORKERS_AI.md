# Free inference — Cloudflare Workers AI + NVIDIA NIM (dev)

**Production default (2026-06):** [NVIDIA NIM](https://build.nvidia.com) for resource **Generate** (Developer Program — prototype/dev). Falls back to **Workers AI** then **template** when NVIDIA is unavailable.

| Option | Cost | Notes |
|--------|------|--------|
| **NVIDIA NIM (hosted)** | **Free dev tier** (rate-limited) | `INFERENCE_PROVIDER=nvidia` + `NVIDIA_API_KEY` secret |
| **Workers AI (edge binding)** | **~10k neurons/day free** | Fallback — `brisbane-servers-api-edge` Worker `[ai]` binding |
| **Template (voice-framework)** | **$0 always** | Fallback when cap hit or AI unavailable |
| Grok via AI Gateway | Paid (xAI API) | Optional later; not required |

## NVIDIA NIM (Developer Program)

1. API key at [build.nvidia.com/account/api-keys](https://build.nvidia.com/account/api-keys) (`nvapi-…`).
2. Local: `npm run configure:inference-nvidia`
3. Edge worker secret: `npm run sync:edge-worker-secrets` (includes `NVIDIA_API_KEY`)
4. Deploy: `npm run deploy:edge-worker`
5. Check: `GET /api/usage/me` → `provider: "nvidia"`, `nvidiaModel`

```text
INFERENCE_PROVIDER=nvidia
NVIDIA_API_KEY=nvapi-...          # worker secret only — never commit
NVIDIA_MODEL=stepfun-ai/step-3.7-flash
```

**Model overrides** (set `NVIDIA_MODEL` in wrangler `[vars]` or user env):

| Model | Use |
|-------|-----|
| `stepfun-ai/step-3.7-flash` | Default — fast, good for ~1800-token generates |
| `nvidia/nemotron-3-nano-30b-a3b` | NVIDIA-native, balanced |
| `qwen/qwen3.5-397b-a17b` | Highest quality; slower, tighter rate limits |

NVIDIA free hosted API is for **development and prototyping** per [NIM FAQ](https://forums.developer.nvidia.com/t/nvidia-nim-faq/300317). Production traffic at scale needs AI Enterprise or self-host.

## Meta starter (self-describing corpus)

Starter block `starter-inference-on-resources` documents voice + RAG + inference. Synced on bootstrap and when loading profiles:

```bash
npm run seed:inference-meta-starter
npm run bootstrap:voice-corpus
```

Appears in **GET /api/resources/starter-blocks** and RAG retrieval after indexing.

## Workers AI (fallback)

Inference runs on **`api.brisbaneservers.com`** via the Worker `AI` binding. No Render env vars.

1. Ensure `workers/api` wrangler config includes `[ai]` binding.
2. `npm run deploy:edge-worker`
3. Test **Generate** in `/account` Resources; check `GET /api/usage/me`.

Optional local credentials for `npm run start:api` (standalone dev):

```bash
npm run configure:inference-workers-ai
```

```text
INFERENCE_PROVIDER=workers-ai
WORKERS_AI_MODEL=@cf/meta/llama-3.1-8b-instruct
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_API_TOKEN=...
```

## Daily caps (abuse protection)

Per-user caps in `usage-ledger` (before each AI call):

| Role | Units/day |
|------|-----------|
| client | 2 |
| editor | 8 |
| admin | 25 |
| super-admin | 100 |

When exceeded → **template fallback** (still works, no extra cost).

Check usage: `GET /api/usage/me` (Admin Ops panel).

## Render (retired)

Do not configure Workers AI on Render. See [RENDER_MCP.md](RENDER_MCP.md).

## SuperGrok app subscription

Not required for this stack. Workers AI free tier covers portal generate/improve at current volume.
