# Free inference — Cloudflare Workers AI (no Grok)

**Recommended for this project:** [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/) instead of Grok/xAI.

| Option | Cost | Notes |
|--------|------|--------|
| **Workers AI** | **~10,000 neurons/day free** | Llama 3.1 8B at edge; no xAI subscription |
| **Template (voice-framework)** | **$0 always** | Default fallback when cap hit or AI unavailable |
| Grok via AI Gateway | Paid (xAI API) | Optional later; not required |

## Enable Workers AI on Render API

1. Cloudflare dashboard → **Workers AI** → note **Account ID**
2. Create API token with **Workers AI Read** (or Account → Cloudflare Workers AI → Edit)
3. Set on `brisbane-servers-api` (Render):

```text
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_token
INFERENCE_PROVIDER=workers-ai
```

Optional:

```text
WORKERS_AI_MODEL=@cf/meta/llama-3.1-8b-instruct
```

4. Redeploy API. Resource **Generate** in `/account` uses Workers AI when configured; otherwise template mode.

## Daily caps (abuse protection)

Per-user caps in `usage-ledger` (before each AI call):

| Role | Units/day |
|------|-----------|
| client | 2 |
| editor | 8 |
| admin | 25 |
| super-admin | 100 |

When exceeded → automatic **template fallback** (still works, no extra cost).

Check usage: `GET /api/usage/me`

## Edge worker (Phase 2)

When `workers/api` is deployed with `[ai]` binding, inference can run entirely at edge without Render cold start. Render REST path works today.

## SuperGrok app subscription

Not used for portal inference. Workers AI free tier covers prototyping and low-volume production.
