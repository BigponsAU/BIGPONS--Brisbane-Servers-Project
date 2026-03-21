const fs = require('fs');
const path = require('path');

const content = `# Voice Framework Environment Variables
# Copy this file to .env and update with your actual values
# Never commit .env to version control

# Server Configuration
# Port on which the voice framework dashboard API server will run
PORT=3001

# Environment Mode
# Options: development, production, test
# - development: More verbose error messages, detailed logging, relaxed security
# - production: Minimal error messages, optimized logging, strict security
# - test: Testing environment configuration
NODE_ENV=development

# CORS Configuration
# Comma-separated list of allowed origins for CORS (Cross-Origin Resource Sharing)
# The website runs on port 3000 by default, so http://localhost:3000 is automatically allowed in development
ALLOWED_ORIGINS=http://localhost:3000

# Admin Portal Credentials
# WARNING: Default credentials are for development only!
# CRITICAL: Change these before deploying to production!
# Default development credentials:
#   Email: admin@brisbaneservers.com
#   Password: admin123
# 
# For production, set these environment variables:
# ADMIN_EMAIL=your-production-email@example.com
# ADMIN_PASSWORD=your-strong-secure-password
ADMIN_EMAIL=admin@brisbaneservers.com
ADMIN_PASSWORD=admin123

# JWT Secret Key
# WARNING: Default secret is for development only!
# CRITICAL: Change this to a strong random string in production!
# Generate a secure secret: openssl rand -base64 32
JWT_SECRET=brisbane-servers-secret-key-change-in-production
`;

const envExamplePath = path.join(__dirname, '.env.example');
fs.writeFileSync(envExamplePath, content, 'utf8');
console.log('✅ Created .env.example file');
