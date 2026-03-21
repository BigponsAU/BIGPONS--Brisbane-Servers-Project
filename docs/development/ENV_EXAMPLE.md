# Environment Variables Example

This document provides an example `.env` file configuration for the Voice Framework.

## Creating Your .env File

Create a `.env` file in the `voice-framework` directory with the following variables:

```bash
# Voice Framework Environment Variables
# Copy this content to voice-framework/.env and update with your actual values
# Never commit .env to version control

# Server Configuration
# Port on which the voice framework dashboard API server will run
PORT=3001

# CORS Configuration
# Comma-separated list of allowed origins for CORS (Cross-Origin Resource Sharing)
# The website runs on port 3000 by default, so http://localhost:3000 is automatically allowed in development
ALLOWED_ORIGINS=http://localhost:3000

# Environment Mode
# Options: development, production, test
# - development: More verbose error messages, detailed logging, relaxed security
# - production: Minimal error messages, optimized logging, strict security
# - test: Testing environment configuration
NODE_ENV=development

# Admin Portal Credentials (Production Only)
# ⚠️ WARNING: Default credentials are for development only!
# ⚠️ CRITICAL: Change these before deploying to production!
# Default development credentials:
#   Email: admin@brisbaneservers.com
#   Password: admin123
# 
# For production, set these environment variables:
# ADMIN_EMAIL=your-production-email@example.com
# ADMIN_PASSWORD=your-strong-secure-password
# 
# Never deploy with default credentials! This is a security risk.
```

## Quick Setup

1. Navigate to the `voice-framework` directory
2. Create a new file named `.env`
3. Copy the content above into the file
4. Update the values as needed for your environment

## Production Deployment

For production deployment, ensure:

1. **Set `NODE_ENV=production`** for optimized performance and security
2. **Configure `ALLOWED_ORIGINS`** with your actual production domains
3. **Set `PORT`** if you need a different port than 3001
4. **Change admin credentials** from defaults (set `ADMIN_EMAIL` and `ADMIN_PASSWORD`)
5. **Never commit `.env` files** to version control

> ⚠️ **SECURITY WARNING**: Default admin credentials (`admin@brisbaneservers.com` / `admin123`) are for **development only**!
> 
> **CRITICAL**: You MUST change these credentials before deploying to production!
> 
> Set the following environment variables in production:
> - `ADMIN_EMAIL` - Your production admin email
> - `ADMIN_PASSWORD` - A strong, secure password
> 
> **Never deploy with default credentials!** This is a security risk.

See `ENV_VARIABLES.md` for detailed documentation on each variable.
