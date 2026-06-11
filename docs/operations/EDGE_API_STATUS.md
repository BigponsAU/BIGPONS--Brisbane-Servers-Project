# Edge API & voice corpus — implementation status

**Updated:** 2026-06-06

## Completed in repo

| Phase | Item | Status |
|-------|------|--------|
| Portal | Workspace ↔ Admin switcher | **Done** |
| Portal | Voice map + Brisbane profile + corpus bootstrap | **Done** |
| Portal | Voice lab | **Done** |
| **Inference** | Workers AI client + daily caps + template fallback | **Done** |
| **Inference** | Wired into `POST /api/resources/generate` | **Done** |
| **Inference** | `GET /api/usage/me` daily meter | **Done** |
| Edge | Workers contact queue + Render proxy | **Live** on `api.brisbaneservers.com` |
| Edge | `/api/auth/wake` + `/api/health/render` | **Done** in repo |
| Edge | `npm run configure:edge-worker` | **Done** — run to deploy |

## Free inference (no Grok)

Use **Cloudflare Workers AI** — see [INFERENCE_WORKERS_AI.md](INFERENCE_WORKERS_AI.md).

Set `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN` on Render. Default model: `@cf/meta/llama-3.1-8b-instruct`.

## Deploy steps

1. **Push** line 4.2–4.4 code → Pages + Render deploy
2. `npm run bootstrap:voice-corpus` (once per env)
3. `npm run configure:inference-workers-ai` (CF token on Render)
4. `npm run configure:edge-worker` → route `api.brisbaneservers.com`
5. Prod Voice map → **Reindex corpus**

**Development line:** [DEVELOPMENT_LINE.md](../development/DEVELOPMENT_LINE.md)

## Not yet done

| Phase | Item |
|-------|------|
| 1b | Auth on Worker — **live** (`login`, `register`, `me`, `logout` + Hyperdrive) — see [EDGE_AUTH_PHASE_1B.md](EDGE_AUTH_PHASE_1B.md) |
| Edge | Workers AI binding on edge worker (optional; REST works from Render now) |
| 3 | Stripe subscription past daily cap |
| 3 | PayID manual top-up grant flow |
