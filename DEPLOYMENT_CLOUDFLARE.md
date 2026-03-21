# Cloudflare Pages Deployment Guide

Complete guide for deploying the Brisbane Servers website to Cloudflare Pages with SSR support.

## Prerequisites

- Cloudflare account (free tier is sufficient)
- Domain name (optional - can use Cloudflare Pages subdomain)
- GitHub repository (for automated deployment)
- Node.js 18+ installed locally (for testing)

## Quick Start

### Method 1: Cloudflare Dashboard (Recommended for First Deployment)

1. **Create Cloudflare Account**
   - Go to [cloudflare.com](https://www.cloudflare.com)
   - Sign up for a free account
   - No credit card required

2. **Add Your Domain (Optional)**
   - Go to Cloudflare Dashboard → Add a Site
   - Enter your domain name
   - Follow DNS setup instructions
   - Update nameservers at your domain registrar

3. **Create Pages Project**
   - Go to Cloudflare Dashboard → Pages
   - Click "Create a project"
   - Select "Connect to Git"
   - Authorize Cloudflare to access your GitHub repository
   - Select your repository

4. **Configure Build Settings**
   - **Project name**: `brisbane-servers-website`
   - **Production branch**: `main` (or your default branch)
   - **Build command**: `cd website-brisbaneservers.com && npm install && npm run build`
   - **Build output directory**: `website-brisbaneservers.com/dist`
   - **Root directory**: `website-brisbaneservers.com`

5. **Set Environment Variables**
   - Go to Settings → Environment Variables
   - Add the following variables for Production:

   ```
   ADMIN_EMAIL=your-production-email@example.com
   ADMIN_PASSWORD=your-strong-secure-password
   JWT_SECRET=your-secure-jwt-secret-generate-with-openssl-rand-base64-32
   NODE_ENV=production
   VOICE_API_URL=/api
   PUBLIC_VOICE_API_URL=/api
   ```

   **⚠️ CRITICAL**: Change default credentials before deploying!

6. **Deploy**
   - Click "Save and Deploy"
   - Wait for build to complete (usually 2-5 minutes)
   - Your site will be available at `https://your-project.pages.dev`

7. **Configure Custom Domain**
   - Go to Custom domains → Set up a custom domain
   - Enter your domain name
   - Cloudflare will automatically configure SSL/TLS
   - DNS records are automatically created

---

### Method 2: Wrangler CLI

1. **Install Wrangler**
   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare**
   ```bash
   wrangler login
   ```

3. **Build Your Site**
   ```bash
   cd website-brisbaneservers.com
   npm install
   npm run build
   ```

4. **Deploy**
   ```bash
   wrangler pages deploy dist --project-name=brisbane-servers-website
   ```

5. **Set Environment Variables**
   ```bash
   wrangler pages secret put ADMIN_EMAIL --project-name=brisbane-servers-website
   wrangler pages secret put ADMIN_PASSWORD --project-name=brisbane-servers-website
   wrangler pages secret put JWT_SECRET --project-name=brisbane-servers-website
   ```

---

### Method 3: GitHub Actions (Automated)

If you've set up the GitHub Actions workflow (`.github/workflows/deploy-cloudflare.yml`):

1. **Set GitHub Secrets**
   - Go to your GitHub repository → Settings → Secrets and variables → Actions
   - Add the following secrets:
     - `CLOUDFLARE_API_TOKEN` - Get from Cloudflare Dashboard → My Profile → API Tokens
     - `CLOUDFLARE_ACCOUNT_ID` - Get from Cloudflare Dashboard → Right sidebar

2. **Push to Main Branch**
   - Any push to `main` branch will trigger automatic deployment
   - Check Actions tab to see deployment status

---

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `ADMIN_EMAIL` | Admin portal email (change from default) | `admin@yourdomain.com` |
| `ADMIN_PASSWORD` | Admin portal password (change from default) | `StrongPassword123!` |
| `JWT_SECRET` | Secret key for JWT tokens | Generate with `openssl rand -base64 32` |
| `NODE_ENV` | Environment mode | `production` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VOICE_API_URL` | API endpoint URL | `/api` |
| `PUBLIC_VOICE_API_URL` | Public API URL for client-side | `/api` |

### Generating Secure Secrets

**Generate JWT_SECRET**:
```bash
openssl rand -base64 32
```

**Generate Strong Password**:
- Use a password manager
- Minimum 16 characters
- Mix of uppercase, lowercase, numbers, and symbols

---

## Email Routing Setup

Cloudflare Email Routing allows you to receive emails at your domain without hosting an email server.

1. **Enable Email Routing**
   - Go to Cloudflare Dashboard → Email → Email Routing
   - Click "Get Started"
   - Add your domain

2. **Create Routing Rules**
   - **Catch-all**: `*@yourdomain.com` → Forward to your personal email
   - **Specific addresses**: `info@yourdomain.com` → Forward to specific email
   - **Contact**: `contact@yourdomain.com` → Forward to support email

3. **Verify Email**
   - Cloudflare will send verification emails
   - Click verification links to activate routing

4. **Test Email Delivery**
   - Send a test email to `test@yourdomain.com`
   - Check your forwarding email inbox

---

## Post-Deployment Verification

### 1. Verify Website is Live

- Visit your Cloudflare Pages URL: `https://your-project.pages.dev`
- Or visit your custom domain: `https://yourdomain.com`
- Check that the homepage loads correctly

### 2. Test API Endpoints

- **Health Check**: `https://yourdomain.com/api/health`
  - Should return: `{"status":"ok","timestamp":"..."}`

- **Public Resources**: `https://yourdomain.com/api/resources/public`
  - Should return resource list (may be empty initially)

### 3. Test Admin Portal

- Visit: `https://yourdomain.com/portal`
- Login with your production credentials
- Verify you can access the dashboard

### 4. Verify SSL/TLS

- Check browser shows padlock icon
- Visit: `https://www.ssllabs.com/ssltest/analyze.html?d=yourdomain.com`
- Should show A or A+ rating

### 5. Test Email Routing

- Send test email to `test@yourdomain.com`
- Verify it forwards to your configured email

---

## Troubleshooting

### Build Fails

**Issue**: Build fails with errors

**Solutions**:
- Check Node.js version (requires 18+)
- Verify all dependencies are in `package.json`
- Check build logs in Cloudflare Dashboard
- Test build locally: `cd website-brisbaneservers.com && npm run build`

### API Routes Not Working

**Issue**: API endpoints return 404 or errors

**Solutions**:
- Verify `output: 'server'` is set in `astro.config.mjs`
- Check `adapter: cloudflare()` is configured
- Ensure API routes are in `src/pages/api/` directory
- Check Cloudflare Pages Functions logs

### Environment Variables Not Available

**Issue**: Environment variables are undefined

**Solutions**:
- Verify variables are set in Cloudflare Dashboard → Pages → Settings → Environment Variables
- Check variable names match exactly (case-sensitive)
- Redeploy after adding variables
- Use `PUBLIC_` prefix for client-side variables

### Storage Not Persisting

**Issue**: Data is lost after deployment

**Solutions**:
- Cloudflare Pages doesn't support file system storage
- Migrate to Cloudflare KV or D1 for persistent storage
- Use external database (PostgreSQL, MongoDB) for production data

### CORS Errors

**Issue**: CORS errors in browser console

**Solutions**:
- Verify `ALLOWED_ORIGINS` includes your production domain
- Check API routes allow CORS headers
- Verify domain matches exactly (including protocol)

### Default Credentials Still Work

**Issue**: Default credentials (`admin@brisbaneservers.com` / `admin123`) still work

**Solutions**:
- Verify `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set in environment variables
- Check variable names are correct
- Redeploy after setting variables
- Clear browser cache and cookies

---

## Pre-Deployment Checklist

Before deploying to production, ensure:

- [ ] Cloudflare account created
- [ ] Domain added to Cloudflare (optional)
- [ ] Environment variables configured
- [ ] Build tested locally: `npm run build`
- [ ] Default credentials changed (`ADMIN_EMAIL`, `ADMIN_PASSWORD`)
- [ ] `JWT_SECRET` set to secure random string
- [ ] `NODE_ENV` set to `production`
- [ ] Email routing configured (if needed)
- [ ] Custom domain configured (if needed)
- [ ] SSL/TLS verified (automatic with Cloudflare)
- [ ] Health endpoint tested: `/api/health`
- [ ] Admin portal login tested
- [ ] API endpoints tested

---

## Architecture Overview

```
User Browser
    ↓ HTTPS
Cloudflare Edge (CDN + SSL)
    ↓ SSR Request
Cloudflare Pages
    ↓ API Routes
Pages Functions (Astro SSR)
    ↓ Storage
Cloudflare KV/D1 (or external database)
```

**Key Components**:
- **Cloudflare Edge**: Global CDN, DDoS protection, SSL/TLS
- **Cloudflare Pages**: Hosting platform with SSR support
- **Pages Functions**: Serverless functions for API routes
- **Cloudflare KV/D1**: Persistent storage (optional)

---

## Cost Estimate

### Free Tier (Sufficient for Small Sites)

- **Pages**: Unlimited requests
- **Functions**: 100,000 requests/day
- **Bandwidth**: Unlimited
- **SSL/TLS**: Free
- **Email Routing**: Free (up to 5 addresses)

### Paid Tier ($5/month)

- **Functions**: 10 million requests/month included
- **Additional**: $0.30 per million requests
- **CPU Time**: 30 million CPU milliseconds/month included

**Estimated Monthly Cost**: $0-5 for most small to medium sites

---

## Next Steps After Deployment

1. **Monitor Analytics**
   - Set up Cloudflare Analytics dashboard
   - Monitor traffic and performance

2. **Set Up Monitoring**
   - Configure error tracking (Sentry, etc.)
   - Set up uptime monitoring
   - Configure alerts for critical errors

3. **Optimize Performance**
   - Enable Cloudflare caching
   - Configure cache rules
   - Optimize images and assets

4. **Set Up Backups**
   - Configure backup for storage data
   - Set up automated backups
   - Document recovery procedures

5. **Security Hardening**
   - Review security settings
   - Enable Cloudflare security features
   - Set up rate limiting
   - Configure firewall rules

---

## Support & Resources

- **Cloudflare Pages Docs**: https://developers.cloudflare.com/pages/
- **Astro Cloudflare Adapter**: https://docs.astro.build/en/guides/integrations-guide/cloudflare/
- **Cloudflare Community**: https://community.cloudflare.com/
- **Wrangler CLI Docs**: https://developers.cloudflare.com/workers/wrangler/

---

## Quick Reference Commands

```bash
# Local build test
cd website-brisbaneservers.com
npm install
npm run build

# Local preview with Wrangler
wrangler pages dev dist

# Deploy with Wrangler
wrangler pages deploy dist --project-name=brisbane-servers-website

# Set environment variable
wrangler pages secret put VARIABLE_NAME --project-name=brisbane-servers-website

# View deployment logs
wrangler pages deployment tail --project-name=brisbane-servers-website
```

---

**Last Updated**: 2025-01-25  
**Status**: Ready for Production Deployment
