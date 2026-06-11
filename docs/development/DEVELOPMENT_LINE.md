# Development line — brisbaneservers.com portal & API

**You are here:** Line **6** — billing backlog; **v1 feature set complete**

**End product:** [END_PRODUCT.md](END_PRODUCT.md)

**Last updated:** 2026-06-11

---

## Line map

```
0 ─── Foundation (site + API live)                    ✅
1 ─── Auth & account portal                         ✅
2 ─── Content & marketing                           ✅
3 ─── Voice corpus & Neon persistence               ✅
4 ─── Portal voice + edge API                       ✅
5 ─── Cloudflare-only API (Render retired)          ✅
6 ─── Billing (PayID / Stripe)                      ⏳
7 ─── Optional 3D topology / deep Markov            ⏳
```

---

## Line 5 deliverables (done)

| Item | Production |
|------|------------|
| Full API on Worker | ✅ `api.brisbaneservers.com` |
| Hyperdrive auth | ✅ |
| Workers AI binding | ✅ |
| OAuth on edge | ✅ |
| Library growth edge cron | ✅ every 6h |
| Auto-generate resources | ✅ admin toggle |
| voice-map/semantic API | ✅ |
| Markov flow (Voice lab) | ✅ client tracker |

---

## Commands

| Goal | Command |
|------|---------|
| Sync secrets → worker | `npm run sync:edge-worker-secrets` |
| Deploy worker | `npm run deploy:edge-worker` |
| Full edge setup | `npm run setup:edge-production` |
| Auth smoke | `npm run verify:production-auth:edge` |
| API smoke | `npm run verify:production -- --api https://api.brisbaneservers.com` |
| Bootstrap corpus | `npm run bootstrap:voice-corpus` |

---

## Line 6 (next)

PayID manual grant + Stripe subscription for over-cap AI usage.
