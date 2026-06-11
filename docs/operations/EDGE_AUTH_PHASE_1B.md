# Edge auth — Phase 1b (Neon Hyperdrive)

**Status:** Implemented in repo (line 4.5) — run `configure:hyperdrive` + `configure:edge-worker` to go live.

Phase 1 edge worker handles **health**, **auth/wake**, **contact**, and **Render proxy**. Login/register still hit Render until Phase 1b ports auth to the edge with Postgres.

---

## Goal

| Route | Phase 1 (now) | Phase 1b (target) |
|-------|---------------|-------------------|
| `GET /api/health` | Edge instant | Edge instant |
| `GET /api/health/render` | Proxy ping Render | Optional retire |
| `GET /api/auth/wake` | Edge + background warm | Edge only (DB at edge) |
| `POST /api/auth/login` | Proxy → Render | **Edge + Hyperdrive** |
| `POST /api/auth/register` | Proxy → Render | **Edge + Hyperdrive** |
| `GET /api/auth/me` | Proxy → Render | **Edge + Hyperdrive** |
| `POST /api/auth/logout` | Proxy → Render | **Edge + Hyperdrive** |
| `GET /api/auth/verify-email` | Proxy → Render | **Edge + Hyperdrive** |
| `POST /api/auth/resend-verification` | Proxy → Render | **Edge + Hyperdrive** |
| OAuth / passkey | Proxy → Render | Render (later) |
| `POST /api/contact/inquiry` | Edge queue | Edge queue |

---

## Neon Hyperdrive setup

1. Cloudflare dashboard → **Hyperdrive** → Create configuration.
2. Connection string: Neon **pooled** `DATABASE_URL` (same as Render).
3. Note Hyperdrive config ID → add to `workers/api/wrangler.toml`:

```toml
[[hyperdrive]]
binding = "HYPERDRIVE"
id = "<hyperdrive-config-id>"
```

4. Worker uses `@neondatabase/serverless` or `postgres` with `env.HYPERDRIVE.connectionString`.

---

## Port checklist (implementation)

Reuse logic from Render routes (do not duplicate business rules):

| Render source | Worker module |
|---------------|---------------|
| `src/pages/_api/auth/login.ts` | `workers/api/src/auth/login.ts` |
| `src/pages/_api/auth/register.ts` | `workers/api/src/auth/register.ts` |
| `src/pages/_api/auth/me.ts` | `workers/api/src/auth/me.ts` |
| `src/utils/auth.ts` | Shared or copied JWT helpers (Web Crypto compatible) |
| `src/lib/db/users.ts` | SQL via Hyperdrive |

**Secrets on worker:** `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (bootstrap), Resend keys for register emails.

**Cookie domain:** `Domain=.brisbaneservers.com`, `SameSite=Lax`, `HttpOnly` — match Render behaviour.

---

## Rollout

1. Deploy worker with Hyperdrive; auth routes on worker, `index.ts` stops proxying `/api/auth/login|register|me|logout`.
2. `npm run verify:production-auth` against `api.brisbaneservers.com`.
3. Monitor Render logs — auth traffic should drop.
4. Document in [PRODUCTION_GO_LIVE_STATUS.md](PRODUCTION_GO_LIVE_STATUS.md).

---

## Why not all routes on edge?

OAuth callbacks, passkey WebAuthn, voice-framework disk, and cron jobs stay on Render until migrated. Edge-first for **latency-sensitive user paths** (auth, contact).
