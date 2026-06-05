# Reset Cloudflare MCP OAuth for a fresh Connect flow in Cursor.
# Run: npm run reset:cloudflare-mcp-oauth
#
# OAuth cannot be completed from this script - after running, use Cursor UI:
#   Settings -> Tools & MCP -> cloudflare-api -> Connect
# Grant: Pages Edit, DNS Edit, Email Routing Edit, Zone Read

$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "Cloudflare MCP OAuth reset" -ForegroundColor Cyan
Write-Host ""

$mcpAuth = Join-Path $env:USERPROFILE '.mcp-auth'
if (Test-Path $mcpAuth) {
  Remove-Item -Recurse -Force $mcpAuth
  Write-Host "Removed $mcpAuth" -ForegroundColor Green
} else {
  Write-Host "No stale OAuth cache at $mcpAuth" -ForegroundColor DarkGray
}

$mcpJson = Join-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) '.cursor\mcp.json'
if (Test-Path $mcpJson) {
  $raw = Get-Content $mcpJson -Raw
  if ($raw -match 'Authorization:\$\{CLOUDFLARE_AUTH_HEADER\}') {
    Write-Warning ".cursor/mcp.json uses API token header - OAuth Connect may conflict. Use mcp-remote without --header for OAuth."
  } else {
    Write-Host ".cursor/mcp.json is OAuth-ready (mcp-remote, no auth header)." -ForegroundColor Green
  }
}

Write-Host ""
Write-Host "Complete OAuth in Cursor:" -ForegroundColor Yellow
Write-Host "  1. Developer: Reload Window" -ForegroundColor DarkGray
Write-Host "  2. Settings -> Tools & MCP -> cloudflare-api -> Connect" -ForegroundColor DarkGray
Write-Host "  3. Browser: grant Pages Edit, DNS Edit, Email Routing Edit" -ForegroundColor DarkGray
Write-Host "  4. Reload Window again if server stays red" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Verify in chat: list Cloudflare Pages projects for brisbaneservers" -ForegroundColor DarkGray
Write-Host ""
