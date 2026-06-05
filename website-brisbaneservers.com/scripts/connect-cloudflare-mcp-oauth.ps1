# Pre-authenticate Cloudflare MCP OAuth outside Cursor (fixes localhost callback refused).
# Run: npm run connect:cloudflare-mcp-oauth
#
# Opens a dedicated window that keeps the OAuth callback listener alive while you sign in.
# After "Authorization successful", close that window and Reload Window in Cursor.

$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "Cloudflare MCP OAuth (standalone listener)" -ForegroundColor Cyan
Write-Host ""

$mcpAuth = Join-Path $env:USERPROFILE '.mcp-auth'
if (Test-Path $mcpAuth) {
  Remove-Item -Recurse -Force $mcpAuth
  Write-Host "Cleared stale OAuth cache." -ForegroundColor DarkGray
}

$cmd = @(
  'Write-Host "Cloudflare OAuth listener running - complete sign-in in the browser within 3 minutes." -ForegroundColor Cyan'
  'Write-Host "Leave this window open until you see Authorization successful." -ForegroundColor Yellow'
  'Write-Host ""'
  'npx -y mcp-remote@latest https://mcp.cloudflare.com/mcp 3334 --auth-timeout 300 --debug'
  'Write-Host ""'
  'Write-Host "Done. Close this window, then in Cursor: Developer Reload Window." -ForegroundColor Green'
  'Read-Host "Press Enter to close"'
) -join '; '

Start-Process powershell -ArgumentList '-NoExit', '-Command', $cmd
Write-Host "Opened OAuth helper window." -ForegroundColor Green
Write-Host ""
Write-Host "Steps:" -ForegroundColor Yellow
Write-Host "  1. In the new window, wait for browser OAuth (or open the URL it prints)" -ForegroundColor DarkGray
Write-Host "  2. Grant Pages Edit, DNS Edit, Email Routing Edit on Cloudflare" -ForegroundColor DarkGray
Write-Host "  3. Wait for Authorization successful in the browser" -ForegroundColor DarkGray
Write-Host "  4. Cursor -> Developer: Reload Window" -ForegroundColor DarkGray
Write-Host "  5. Settings -> Tools and MCP -> cloudflare-api should be green" -ForegroundColor DarkGray
Write-Host ""
Write-Host "If browser still shows connection refused, use API token instead:" -ForegroundColor DarkGray
Write-Host "  npm run configure:cloudflare-mcp" -ForegroundColor DarkGray
Write-Host ""
