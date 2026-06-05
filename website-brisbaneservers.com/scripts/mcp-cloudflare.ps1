# NOT USED for Cursor MCP - Cloudflare MCP requires OAuth, not API tokens (insufficient_scope).
# API tokens work for npm scripts only: configure-cloudflare-pages-env, setup:cloudflare-email.
# Cursor uses npx mcp-remote + OAuth per .cursor/mcp.json. Run: npm run complete:cloudflare-oauth

$ErrorActionPreference = 'Stop'
[Console]::Error.WriteLine(@'
Cloudflare MCP in Cursor requires OAuth, not CLOUDFLARE_API_TOKEN.
API tokens return insufficient_scope on https://mcp.cloudflare.com/mcp

Fix:
  1. npm run complete:cloudflare-oauth
  2. Complete browser sign-in (keep the helper window open)
  3. Quit and reopen Cursor

Your API token is still used by: npm run configure:cloudflare-mcp (Pages env scripts).
'@)
exit 1
