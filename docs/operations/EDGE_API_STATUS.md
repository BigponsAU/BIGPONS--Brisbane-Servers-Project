# Edge API & voice corpus — implementation status

**Updated:** 2026-06-18

## Production (live)

| Item | Status |
|------|--------|
| Full API on Worker | **Live** — `https://api.brisbaneservers.com/api` |
| Render API | **Retired** — suspended, not in traffic path |
| Neon via Hyperdrive | **Live** |
| Workers AI binding (`AI`) | **Live** on edge |
| `/api/auth/wake` | **Instant** — no cold start |
| Library growth cron | **Live** — `0 */6 * * *` on Worker |
| Auto-generate toggle | **Live** — Library growth panel |

**Deploy:** `npm run deploy:edge-worker` (API) · Pages via GitHub or `configure:cloudflare-pages-env`

**Verify:**

```bash
npm run verify:production -- --api https://api.brisbaneservers.com
npm run verify:production-auth:edge
```

---

## Completed in repo (may need deploy to reach production)

| Item | Notes |
|------|-------|
| Portal Voice Lab / Voice Map / Admin Ops panels | In page shell |
| `GET /api/usage/me` + Admin Ops meter | In route manifest |
| Voice map / analyze / bootstrap routes | In route manifest |
| `data-require-role` gating | Client-side |

Batch deploy when ready — see [HOSTING_MCP_WORKSPACE.md](HOSTING_MCP_WORKSPACE.md) step 4.

---

## Inference

Workers AI at edge via `[ai]` binding — see [INFERENCE_WORKERS_AI.md](INFERENCE_WORKERS_AI.md).

Daily caps: `usage-ledger.ts` · meter: `GET /api/usage/me`

---

## Intentionally not built

See [FEATURES_NOT_BUILT.md](FEATURES_NOT_BUILT.md) (Stripe, PayID grant flow, PDF OCR, 3D map, token redemption, etc.).

---

## Ops optional

| Item | Status |
|------|--------|
| Pages rebuild hook | Set `CLOUDFLARE_PAGES_DEPLOY_HOOK_URL` on worker |
| Voice corpus bootstrap | `npm run bootstrap:voice-corpus` per env |

**Development line:** [DEVELOPMENT_LINE.md](../development/DEVELOPMENT_LINE.md)
