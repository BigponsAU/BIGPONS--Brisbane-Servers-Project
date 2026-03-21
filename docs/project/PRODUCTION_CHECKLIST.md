# Production Deployment Checklist

This checklist ensures your deployment is secure and production-ready.

## 🔒 Security Checklist

### Authentication & Credentials

- [ ] **Change default admin credentials**
  - [ ] Set `ADMIN_EMAIL` environment variable to your production admin email
  - [ ] Set `ADMIN_PASSWORD` environment variable to a strong, secure password
  - [ ] Verify default credentials (`admin@brisbaneservers.com` / `admin123`) are NOT being used
  - [ ] **CRITICAL**: Default credentials are a security risk in production!

- [ ] **Change JWT secret**
  - [ ] Set `JWT_SECRET` environment variable to a strong random string
  - [ ] Verify default JWT secret is NOT being used
  - [ ] Use a cryptographically secure random generator (e.g., `openssl rand -hex 32`)

### Environment Configuration

- [ ] **Set production environment**
  - [ ] Set `NODE_ENV=production` for optimized performance and security
  - [ ] Verify error messages are minimal (no stack traces exposed)

- [ ] **Configure CORS**
  - [ ] Set `ALLOWED_ORIGINS` with your actual production domains
  - [ ] Remove `http://localhost:3000` from allowed origins
  - [ ] Use HTTPS URLs only in production

- [ ] **Server port**
  - [ ] Set `PORT` if different from default (3001)
  - [ ] Configure reverse proxy (nginx, Apache) if needed

### Code Security

- [ ] **Obfuscation**
  - [ ] Verify production builds have obfuscation enabled
  - [ ] Verify `debug-script.js` is excluded from production builds
  - [ ] Verify console.log statements are removed in production builds
  - [ ] Run build verification: `npm run build:dashboard`

- [ ] **Error handling**
  - [ ] Verify no stack traces are exposed in production error responses
  - [ ] Verify error messages don't leak sensitive information
  - [ ] Test error handling with various error types

## 🚀 Deployment Checklist

### Pre-Deployment

- [ ] **Dependencies**
  - [ ] Run `npm install` to ensure all dependencies are up to date
  - [ ] Review `package.json` for any development-only dependencies
  - [ ] Check for known security vulnerabilities: `npm audit`

- [ ] **Build verification**
  - [ ] Build dashboard: `npm run build:dashboard`
  - [ ] Verify build output exists and is valid
  - [ ] Test production build locally before deploying

- [ ] **Environment variables**
  - [ ] Create `.env` file with production values (never commit to git)
  - [ ] Verify all required environment variables are set
  - [ ] Document environment variables for deployment team

- [ ] **Database/Storage**
  - [ ] Backup existing data if upgrading
  - [ ] Verify storage directories are writable
  - [ ] Configure persistent storage if needed

### Deployment

- [ ] **Server setup**
  - [ ] Configure process manager (PM2, systemd, etc.)
  - [ ] Set up log rotation
  - [ ] Configure automatic restarts on failure
  - [ ] Set resource limits (memory, CPU)

- [ ] **Network**
  - [ ] Configure firewall rules
  - [ ] Set up SSL/TLS certificates (HTTPS)
  - [ ] Configure reverse proxy if needed
  - [ ] Test CORS configuration

- [ ] **Monitoring**
  - [ ] Set up error tracking (e.g., Sentry)
  - [ ] Configure logging service
  - [ ] Set up health check monitoring
  - [ ] Configure alerts for critical errors

### Post-Deployment

- [ ] **Verification**
  - [ ] Test health endpoint: `GET /api/health`
  - [ ] Verify admin login works with new credentials
  - [ ] Test critical API endpoints
  - [ ] Verify obfuscated code is served (check browser DevTools)
  - [ ] Verify debug script is NOT loaded in production

- [ ] **Security audit**
  - [ ] Check server logs for default credential warnings
  - [ ] Verify no default credentials are in use
  - [ ] Test rate limiting is working
  - [ ] Verify CORS is properly configured

- [ ] **Performance**
  - [ ] Monitor server response times
  - [ ] Check memory and CPU usage
  - [ ] Verify rate limiting is not too restrictive
  - [ ] Test under expected load

## 📋 Quick Verification Commands

### Check for default credentials
```bash
# The server will warn on startup if default credentials are detected
# Check server logs for warnings
```

### Verify production build
```bash
cd voice-framework
NODE_ENV=production npm run build:dashboard
# Check output for warnings about console statements or debug script
```

### Test health endpoint
```bash
curl https://your-domain.com/api/health
# Should return: {"status":"ok","timestamp":"..."}
```

### Verify obfuscation
```bash
# In browser DevTools, check Network tab
# Load app.js and verify it's obfuscated (not readable)
# Verify debug-script.js is NOT loaded
```

## ⚠️ Critical Warnings

### Default Credentials
**NEVER deploy with default credentials!**
- Default email: `admin@brisbaneservers.com`
- Default password: `admin123`
- Default JWT secret: `brisbane-servers-secret-key-change-in-production`

If you see warnings about default credentials in production logs, **STOP** and fix immediately!

### Debug Script
**NEVER include debug script in production!**
- The debug script contains development utilities
- It should only load in development (localhost)
- Production builds automatically exclude it

### Console Output
**NEVER expose console.log in production!**
- Console statements can leak sensitive information
- Production builds automatically remove them
- Verify with build verification step

## 📚 Related Documentation

- [Environment Variables](../development/ENV_VARIABLES.md)
- [Obfuscation Strategy](../../voice-framework/OBFUSCATION.md)
- [Build Instructions](../../voice-framework/BUILD_INSTRUCTIONS.md)
- [Security Middleware](../../voice-framework/dashboard/middleware/security.ts)

## 🆘 Troubleshooting

### Server won't start
- Check environment variables are set correctly
- Verify port is not already in use
- Check logs for error messages

### Default credentials warning
- Set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `JWT_SECRET` environment variables
- Restart server
- Verify warning is gone

### CORS errors
- Check `ALLOWED_ORIGINS` includes your frontend URL
- Verify URLs match exactly (including protocol and port)
- Check browser console for specific CORS error

### Build fails
- Check Node.js version compatibility
- Verify all dependencies are installed
- Check for syntax errors in source files

---

**Last Updated**: 2025-01-27  
**Status**: Production Ready ✅
