# Free inference — Cloudflare Workers AI (no Grok)

**Recommended for this project:** [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/) instead of Grok/xAI.

| Option | Cost | Notes |
|--------|------|--------|
| **Workers AI (edge binding)** | **~10k neurons/day free** | Production — `brisbane-servers-api-edge` Worker `[ai]` binding |
| **Template (voice-framework)** | **$0 always** | Fallback when cap hit or AI unavailable |
| Grok via AI Gateway | Paid (xAI API) | Optional later; not required |

## Production (edge Worker)

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
