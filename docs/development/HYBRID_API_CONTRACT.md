# Hybrid API Contract

The static frontend and standalone API share a single contract surface rooted at:

`<api-base>/api`

Frontend resolution is centralized in `website-brisbaneservers.com/src/lib/api-config.ts`.

## Core endpoints

### Public

- `GET /api/health`
- `GET /api/resources/public`
- `GET /api/resources/public?id=<resourceId>`
- `GET /api/community/by-topic?industry=<slug>&topic=<slug>`

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Portal and editor flows

- `GET /api/resources`
- `POST /api/resources/generate`
- `POST /api/resources/upload`
- `POST /api/resources/community-upload`
- `PUT /api/resources/:id`
- `DELETE /api/resources/:id`
- `GET /api/profiles`
- `PUT /api/profiles/:id`
- `GET /api/tokens/me`
- `GET /api/community/contributions`
- `GET /api/community/my-contributions`
- `POST /api/community/approve`
- `POST /api/community/reject`

## Auth model

- Browser clients should prefer the bearer token returned from `register` and `login`
- The token is stored in `localStorage` by the frontend and sent as `Authorization: Bearer <token>`
- The API also emits `Set-Cookie`, but cross-origin GitHub Pages clients should not rely on the cookie path

## Response shape

Most endpoints return one of the following shapes:

```json
{ "success": true, "...": "payload" }
```

or

```json
{ "success": false, "error": "message", "code": "ERROR_CODE" }
```

## Build-time expectations

- Static resource pages may fetch from `INTERNAL_API_BASE_URL` during Astro prerender
- Browser-side runtime calls use `PUBLIC_API_BASE_URL`
- If the standalone API is not reachable during build, public resource pages fall back gracefully and still render
