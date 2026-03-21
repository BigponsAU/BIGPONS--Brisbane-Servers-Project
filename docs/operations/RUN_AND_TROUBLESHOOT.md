# Run the App & Troubleshooting

## Quick start (single server)

From **project root**:

```bash
npm start
```

This starts the unified stack:

- **Website + Portal + API:** `http://localhost:3000`
- Portal: `http://localhost:3000/portal`
- Health: `http://localhost:3000/api/health`

See [Credentials](../portal/CREDENTIALS.md) for login.

## Running the website only (e.g. after API moved into Astro)

From project root:

```bash
cd website-brisbaneservers.com
npm run dev
```

Everything (site + API) runs on port 3000.

## Verify

1. **Health:** Open `http://localhost:3000/api/health` → expect `{"status":"ok",...}` or similar.
2. **Portal:** Open `http://localhost:3000/portal` → login screen (no connection error).

## Common issues

### "Please check if the voice framework server is running"

The app is now unified: one server on port 3000. Ensure you started it from project root:

```bash
npm start
```

or from the website folder:

```bash
cd website-brisbaneservers.com && npm run dev
```

### Port already in use

**Find process (Windows PowerShell):**

```powershell
netstat -ano | findstr :3000
```

**Kill (replace `<PID>` with the number from the last column):**

```powershell
taskkill /PID <PID> /F
```

**Linux/macOS:**

```bash
lsof -i :3000
kill -9 <PID>
```

### CORS errors

- Ensure you’re using the same origin (e.g. `http://localhost:3000` for site and API).
- If you still run a separate API, set `ALLOWED_ORIGINS` to include the frontend URL (e.g. `http://localhost:3000`).

### API not responding

1. Check the terminal where you ran `npm start` or `npm run dev` for errors.
2. Run a local build: `cd website-brisbaneservers.com && npm run build`.
3. Confirm routes exist under `website-brisbaneservers.com/src/pages/api/`.

### Login / auth issues

1. Clear site data for `localhost:3000` or run in a private window.
2. In browser console: `localStorage.removeItem('authToken')` then reload.
3. Confirm credentials: [Credentials](../portal/CREDENTIALS.md).

### Dependencies

```bash
npm run install:all
# or
cd website-brisbaneservers.com && npm install
```

## Configuration

- **Custom API base (if applicable):** In `website-brisbaneservers.com/.env` set `PUBLIC_VOICE_API_URL` (e.g. `/api` when same origin).
- **Env vars:** See [Environment variables](../development/ENV_VARIABLES.md).
