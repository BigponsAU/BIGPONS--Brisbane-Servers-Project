# Run the App & Troubleshooting

> **Canonical guide:** [MASTER.md](../MASTER.md) — §9 run locally & troubleshoot.

## Quick start

From project root:

```bash
npm run start:hybrid
```

- Frontend: `http://localhost:3000`
- API: `http://localhost:3002/api`
- Health: `http://localhost:3002/api/health`

Credentials: [CREDENTIALS.md](../portal/CREDENTIALS.md)

## Verify

1. `http://localhost:3002/api/health`
2. `http://localhost:3002/api/resources/public`
3. `http://localhost:3000/resources`
4. `http://localhost:3000/account`

## Common issues

| Issue | Fix |
|-------|-----|
| API not running | `npm run start:api` or `npm run start:hybrid` |
| Port in use | `netstat -ano \| findstr :3000` (Windows) |

Full troubleshooting table: [MASTER §9](MASTER.md#9-run-locally--troubleshoot)

## Production deploy model

[MASTER §5–6](MASTER.md#5-deployment--cloudflare-pages-primary) — Cloudflare Pages + standalone API (primary).
