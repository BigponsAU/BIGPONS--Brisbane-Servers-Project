# Admin Portal & Voice Framework

Single-server setup: website, portal, and API run on **http://localhost:3000**. See [Run & troubleshoot](../operations/RUN_AND_TROUBLESHOOT.md) to start; [Credentials](CREDENTIALS.md) for login.

## Quick start

1. From project root: `npm start`
2. Open **http://localhost:3000/portal**
3. Log in (see [CREDENTIALS.md](CREDENTIALS.md))

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

## Public design philosophy

The same brand voice and *additive semantics* principles described for the marketing site apply to portal content. Read the canonical write-up at **`/about#additive-semantics`** (e.g. http://localhost:3000/about#additive-semantics when running the site locally). The portal is the signed-in **resource** tool; the About page is the public articulation of how meaning layers in design and copy.

## Related docs

- [Starter blocks](../archive/implementation/STARTER_BLOCKS_IMPLEMENTATION.md) — Templates and “Use This Block”
- [Base profile](../archive/implementation/BASE_PROFILE_IMPLEMENTATION.md) — Voice profile from starter resources
- [Documentation hub](../README.md) — Full doc list
