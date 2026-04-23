# Project next steps report

**Date:** 2026-04-24  
**Audience:** Maintainers shipping the Brisbane Servers monorepo (Astro site + voice framework + optional standalone API).

This is a **working priority list**, not a spec. Canonical detail lives in the linked docs; update those when behaviour or env requirements change.

---

## Recently aligned (context)

- **Resource hub:** Voice profile resolution for resource writes (`resource-voice-profile.ts`), catalogue-style descriptions instead of a fixed body substring, and metadata fields for how the profile was chosen (`resource-types.ts` / ingestion).
- **APIs:** `POST` handlers under `api/resources/` (process, upload, generate) use the shared resolver where applicable.
- **Navigation:** Account link styled as a primary CTA in header (desktop + mobile) for clearer path to `/account`.

---

## Near-term — production and operations

| Priority | Item | Why | Where to look |
|----------|------|-----|----------------|
| High | **Hybrid deploy env** | Static Pages build must know API origin; API must allow CORS from Pages. | [DEPLOYMENT_PATHWAYS.md](../operations/DEPLOYMENT_PATHWAYS.md), [GITHUB_PAGES_HYBRID.md](../operations/GITHUB_PAGES_HYBRID.md), [ENV_VARIABLES.md](ENV_VARIABLES.md) |
| High | **Auth secrets and persistence** | Session security and multi-instance behaviour depend on env and DB choice (`DATABASE_URL`, cookie secrets). | [CREDENTIALS.md](../portal/CREDENTIALS.md), auth modules under `website-brisbaneservers.com/src/lib/db/` |
| Medium | **Transactional email** | Password reset and verification flows need a real provider in production, not only local/dev stubs. | `auth-email.ts`, `.env.example` |
| Medium | **Single source of truth for “workspace” URL** | Docs and redirects mention `/portal` vs `/account`; keep nav, static redirects, and copy consistent. | [RUNNING_NOTES_MAP.md](RUNNING_NOTES_MAP.md), `vercel.json`, `public/_redirects` |

---

## Product and data

| Priority | Item | Why | Where to look |
|----------|------|-----|----------------|
| Medium | **Processing pipeline UX** | `processingStatus` on resources supports queued/OCR/embedding paths; confirm any async worker or manual step is documented if you add it. | [RESOURCE_PIPELINE_AND_DRAWBACK.md](RESOURCE_PIPELINE_AND_DRAWBACK.md), [RESOURCE_CONTRACT.md](../project/RESOURCE_CONTRACT.md) |
| Low | **Ephemeral library-derived profiles** | `resolveResourceVoiceProfile` can build a short-lived profile from published content; decide if you want metrics, caching, or persistence policies. | `resource-voice-profile.ts` |

---

## Quality and hygiene

| Priority | Item | Why | Where to look |
|----------|------|-----|----------------|
| Medium | **Re-verify “production ready” claims** | [REPOSITORY_STATUS.md](../project/REPOSITORY_STATUS.md) is explicitly a historical snapshot; grades drift as code changes. | That file’s banner + recent commits |
| Medium | **CI / local gates** | Keep `npm run build` (and token/CSS checks you rely on) green before merge. | `website-brisbaneservers.com/BUILD_CHECKLIST.md` |
| Low | **Targeted tests** | Voice profile resolution and ingestion invariants are good candidates for unit tests. | `resource-voice-profile.ts`, `resource-ingestion.ts` |

---

## Security reminders

- Do **not** commit local auth stores: `voice-framework/storage/auth-tokens.json`, `auth.db`, or populated `sessions.json` / `users.json` with real hashes (see `.gitignore`).
- Rotate any credential that was ever exposed in a remote or shared branch.

---

## Related index entries

- Doc hub: [docs/README.md](../README.md)  
- Live run map: [RUNNING_NOTES_MAP.md](RUNNING_NOTES_MAP.md)  
- Zoom / breakpoint policy: [FEATURE_RECONCILIATION.md](FEATURE_RECONCILIATION.md)

When you complete a major row in the tables above, add a one-line note to the session table in [RUNNING_NOTES_MAP.md](RUNNING_NOTES_MAP.md) so the next session knows what was verified.
