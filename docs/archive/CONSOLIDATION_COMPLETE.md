*Archived. Current behaviour is described in [Portal](../portal/PORTAL.md) and [Run & troubleshoot](../operations/RUN_AND_TROUBLESHOOT.md) (single server on port 3000).*

---

# ✅ Server Consolidation Complete

## What Changed

The voice framework API has been **fully integrated into the Astro website**, eliminating the need for a separate Express server. Everything now runs on **one server** (port 3000).

## Architecture Changes

### Before
- **Website**: Astro on port 3000 (static site)
- **API**: Express server on port 3001 (separate process)
- **Setup**: Required running two servers

### After
- **Everything**: Astro on port 3000 (hybrid mode with API routes)
- **Setup**: Single `npm run dev` command

## New API Routes

All API endpoints are now Astro API routes in `/src/pages/api/`:

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout  
- `GET /api/auth/me` - Get current user

### Resources
- `GET /api/resources` - List all resources (auth required)
- `GET /api/resources/public` - Get published resources (public)
- `POST /api/resources/generate` - Generate new resource (auth required)
- `POST /api/resources/upload` - Upload resource file (auth required)
- `GET /api/resources/:id` - Get specific resource (auth required)
- `PUT /api/resources/:id` - Update resource (auth required)
- `DELETE /api/resources/:id` - Delete resource (auth required)
- `POST /api/resources/:id/improve` - Improve resource content (auth required)

### Health
- `GET /api/health` - Health check

## Files Created

### API Routes
- `website-brisbaneservers.com/src/pages/api/health.ts`
- `website-brisbaneservers.com/src/pages/api/auth/login.ts`
- `website-brisbaneservers.com/src/pages/api/auth/logout.ts`
- `website-brisbaneservers.com/src/pages/api/auth/me.ts`
- `website-brisbaneservers.com/src/pages/api/resources/index.ts`
- `website-brisbaneservers.com/src/pages/api/resources/public.ts`
- `website-brisbaneservers.com/src/pages/api/resources/generate.ts`
- `website-brisbaneservers.com/src/pages/api/resources/upload.ts`
- `website-brisbaneservers.com/src/pages/api/resources/[id].ts`
- `website-brisbaneservers.com/src/pages/api/resources/[id]/improve.ts`

### Utilities
- `website-brisbaneservers.com/src/utils/auth.ts` - Shared auth utilities
- `website-brisbaneservers.com/src/utils/voice-framework.ts` - Voice framework initialization

## Configuration Changes

### `astro.config.mjs`
- Changed `output: 'static'` → `output: 'hybrid'` (enables API routes)
- Removed proxy configuration (no longer needed)

### `portal.astro`
- Updated API URL to use relative `/api` path
- Removed references to separate voice framework server

## How to Use

### Development
```bash
cd website-brisbaneservers.com
npm run dev
```

That's it! Everything runs on `http://localhost:3000`:
- Website: `http://localhost:3000`
- Portal: `http://localhost:3000/portal`
- API: `http://localhost:3000/api/*`

### Production
For production builds, you may need to add an Astro adapter (e.g., `@astrojs/node`). For now, development mode works perfectly.

## Benefits

1. **Simpler Setup**: One command instead of two
2. **No Port Conflicts**: Everything on one port
3. **Easier Deployment**: Single server to deploy
4. **Better DX**: No proxy configuration needed
5. **Same Origin**: No CORS issues

## Migration Notes

- The Express server (`voice-framework/dashboard/server.ts`) is still available but no longer needed
- All voice framework functionality is preserved
- Authentication, resources, and all features work exactly the same
- Storage files remain in `voice-framework/storage/`

## Testing

1. Start the dev server: `npm run dev` in `website-brisbaneservers.com`
2. Visit `http://localhost:3000/portal`
3. Login with: `admin@brisbaneservers.com` / `admin123`
4. Test resource generation, upload, and management

All features should work exactly as before, but now everything is on one server! 🎉
