# Run the App & Troubleshooting

**Production deploy model:** [Deployment pathways](DEPLOYMENT_PATHWAYS.md) (primary: GitHub Pages hybrid).

## Quick start (hybrid local split)

From **project root**:

```bash
npm run start:hybrid
```

This starts the hybrid stack:

- **Static frontend + account/workspace UI:** `http://localhost:3000`
- **Standalone API:** `http://localhost:3002/api`
- **Health:** `http://localhost:3002/api/health`

See [Credentials](../portal/CREDENTIALS.md) for login.

## Legacy unified mode

From project root:

```bash
npm start
```

This keeps the old single-process developer flow available while the hybrid migration is rolled out.

## Running each side separately

### Static frontend

```bash
cd website-brisbaneservers.com
npm run dev
```

### Standalone API

```bash
cd website-brisbaneservers.com
npm run start:api
```

## Verify

1. **Health:** Open `http://localhost:3002/api/health` → expect `{"status":"ok",...}` or similar.
2. **Public resources:** Open `http://localhost:3002/api/resources/public` → expect JSON payload.
3. **Frontend:** Open `http://localhost:3000/resources` → page should render without same-origin API errors.
4. **Portal:** Open `http://localhost:3000/portal` → login screen should load and actions should target the external API.

## Common issues

### "Please check if the voice framework server is running"

For the hybrid setup, ensure the standalone API is running on port 3002:

```bash
cd website-brisbaneservers.com
npm run start:api
```

or from project root:

```bash
npm run start:hybrid
```

### Port already in use

**Find process (Windows PowerShell):**

```powershell
netstat -ano | findstr :3000
netstat -ano | findstr :3002
```

**Kill (replace `<PID>` with the number from the last column):**

```powershell
taskkill /PID <PID> /F
```

**Linux/macOS:**

```bash
lsof -i :3000
lsof -i :3002
kill -9 <PID>
```

### CORS errors

- Ensure `ALLOWED_ORIGINS` includes the frontend URL (e.g. `http://localhost:3000`).
- Ensure `PUBLIC_API_BASE_URL` points at the standalone API origin, not the GitHub Pages site origin.

### API not responding

1. Check the terminal where you ran `npm run start:api` for errors.
2. Run a local build: `cd website-brisbaneservers.com && npm run build`.
3. Confirm routes exist under `website-brisbaneservers.com/src/pages/api/`.
4. Confirm the standalone API host can bind to `PORT` (default `3002`).

### Login / auth issues

1. Clear site data for `localhost:3000` or run in a private window.
2. In browser console: `localStorage.removeItem('authToken')` then reload.
3. Confirm credentials: [Credentials](../portal/CREDENTIALS.md).
4. Confirm `PUBLIC_API_BASE_URL` points to the same API host you used for login/register.

### Dependencies

```bash
npm run install:all
# or
cd website-brisbaneservers.com && npm install
```

## Configuration

- **Public API base:** In `website-brisbaneservers.com/.env` set `PUBLIC_API_BASE_URL` (e.g. `http://localhost:3002/api`).
- **Build-time API base:** Set `INTERNAL_API_BASE_URL` if Astro prerender should fetch from a different API URL.
- **GitHub Pages base path:** Set `PUBLIC_SITE_BASE` to `/<repo>/` for project-site hosting.
- **Env vars:** See [Environment variables](../development/ENV_VARIABLES.md).
