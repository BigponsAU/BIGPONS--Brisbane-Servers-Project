# Admin Portal & Voice Framework

**Production:** [GitHub Pages hybrid](../operations/GITHUB_PAGES_HYBRID.md) — static site + [standalone API](../../website-brisbaneservers.com/standalone-api/server.ts). See [Deployment pathways](../operations/DEPLOYMENT_PATHWAYS.md).

**Local (unified):** website and API on **http://localhost:3000**. See [Run & troubleshoot](../operations/RUN_AND_TROUBLESHOOT.md); [Credentials](CREDENTIALS.md) for login.

## Quick start (unified dev)

1. From project root: `npm start`
2. Open **http://localhost:3000/account** (legacy **`/portal`** may redirect)
3. Log in (see [CREDENTIALS.md](CREDENTIALS.md))

## Quick start (GitHub Pages hybrid local)

Use `npm run start:hybrid` from the monorepo root and follow [Run & troubleshoot](../operations/RUN_AND_TROUBLESHOOT.md). Set `PUBLIC_API_BASE_URL` so the static site can reach the standalone API.

## Features

- **Resource generation** — Industry/topic, voice-matched content, optional length/options
- **Resource management** — List, search, filter (draft/published/archived), view, edit, improve, delete
- **Starter blocks** — Templates users can copy; see [Starter blocks implementation](../archive/implementation/STARTER_BLOCKS_IMPLEMENTATION.md)
- **Voice profiles** — Base profile from starter resources; see [Base profile implementation](../archive/implementation/BASE_PROFILE_IMPLEMENTATION.md)
- **Auth** — Login/logout, session token (e.g. localStorage), protected API
- **UI** — Portal layout, gradients, cards, responsive, accessibility support

## API (all under same origin, auth required except login)

**Auth:** `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`

**Resources:**  
`GET /api/resources`, `GET /api/resources/starter-blocks`, `POST /api/resources/from-starter-block`,  
`POST /api/resources/generate`, `GET /api/resources/:id`, `PUT /api/resources/:id`, `DELETE /api/resources/:id`,  
`POST /api/resources/:id/improve`, `POST /api/resources/upload`

**Health:** `GET /api/health`

## Security

- Change default credentials before production ([Credentials](CREDENTIALS.md), [Production checklist](../project/PRODUCTION_CHECKLIST.md))
- Auth required for resource endpoints; input validation on APIs
- For production: strong passwords, consider Redis/DB for sessions, rate limiting

## Troubleshooting

See [Run & troubleshoot](../operations/RUN_AND_TROUBLESHOOT.md) for connection errors, port conflicts, CORS, and login issues.

## Portal voice framework

Additive semantics is treated as an internal delivery rule in the portal, not a standalone public content block. The signed-in **resource** workspace at **`/account`** uses this sequence in UI and copy: **context first, evidence before claims, action last**. See `website-brisbaneservers.com/src/lib/portal-voice-framework.ts` for canonical rules (`portalVoiceRules`, `portalVoiceFrameworkSummary`, `resourceVoiceInterconnection`, `portalAndPublicInterconnectionSummary`).

### System workflow (what is complete vs extended)

**In place today:** auth and session flows for the workspace; resource CRUD, generation, and improvement APIs; voice profile and starter-block flows; public `/resources` prerender uses **`getPublishedResourcesForPage`** (HTTP when the API is up, else reads `voice-framework/storage/resources.json` via the same rules as `GET /api/resources/public`); published **`starter`** visibility is included in the anonymous catalog alongside `public`; voice-aligned copy on resources and portal; **public home** interconnection visuals (page-margin constellations, continuous rim rails, band-level satellites—no centre spine) documented in the wire card.

**Not a single automated pipeline:** adding a Markdown or CMS article does not yet auto-publish through voice analysis without running the existing generate/review flows. Manual articles and API-backed resources both remain valid inputs; “forward compatible” means the storage and API shapes can grow without breaking the site shell.

### Public site UI (interconnection layer)

The marketing home page wraps bands in `HomeInterconnectionRig` with `PageMarginSatelliteColumn` (viewport-side margins) and `SectionSatelliteConstellation` (per-section graphs). That layer is **UX only**; it does not replace portal rules or resource storage. It reinforces the same story as `resourceVoiceInterconnection` on `/resources`.

## Related docs

- [Voice portal scope map](VOICE_PORTAL_SCOPE_MAP.md) — Visual monorepo map, `/account` ↔ `/api` wiring, `route-manifest` reminder
- [Starter blocks](../archive/implementation/STARTER_BLOCKS_IMPLEMENTATION.md) — Templates and “Use This Block”
- [Base profile](../archive/implementation/BASE_PROFILE_IMPLEMENTATION.md) — Voice profile from starter resources
- [Documentation hub](../README.md) — Full doc list
