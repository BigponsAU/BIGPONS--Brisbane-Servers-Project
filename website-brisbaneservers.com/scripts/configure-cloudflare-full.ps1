# Dual Cloudflare setup: API token (scripts + cloudflare-api-token MCP) + OAuth (cloudflare-api MCP).
# Run: npm run configure:cloudflare-full
#
# Create token: https://dash.cloudflare.com/profile/api-tokens
# Permissions: Pages Edit, Email Routing Edit, DNS Edit, Zone Read (zone brisbaneservers.com)

param(
  [switch]$SkipOAuth,
  [switch]$SkipToken,
  [switch]$SkipPagesEnv
)

$ErrorActionPreference = 'Stop'
$scriptDir = $PSScriptRoot

Write-Host ""
Write-Host "Cloudflare dual auth (API token + OAuth)" -ForegroundColor Cyan
Write-Host "  API token -> npm scripts + cloudflare-api-token MCP" -ForegroundColor DarkGray
Write-Host "  OAuth       -> cloudflare-api MCP in Cursor chat" -ForegroundColor DarkGray
Write-Host ""

if (-not $SkipToken) {
  & (Join-Path $scriptDir 'configure-cloudflare-mcp.ps1') -SkipOAuthLaunch
} else {
  Write-Host "Skipping API token step (-SkipToken)." -ForegroundColor DarkGray
}

if (-not $SkipPagesEnv) {
  $token = [Environment]::GetEnvironmentVariable('CLOUDFLARE_API_TOKEN', 'User')
  if ($token) {
    $env:CLOUDFLARE_API_TOKEN = $token
    & (Join-Path $scriptDir 'configure-cloudflare-pages-env.ps1')
  }
}

if (-not $SkipOAuth) {
  Write-Host ""
  Write-Host "Starting OAuth helper (keep window open until Authorization successful)..." -ForegroundColor Cyan
  & (Join-Path $scriptDir 'connect-cloudflare-mcp-oauth.ps1')
}

Write-Host ""
Write-Host "Finish in Cursor:" -ForegroundColor Yellow
Write-Host "  1. Developer: Reload Window" -ForegroundColor DarkGray
Write-Host "  2. Settings -> Tools and MCP:" -ForegroundColor DarkGray
Write-Host "       cloudflare-api-token = green (if token saved)" -ForegroundColor DarkGray
Write-Host "       cloudflare-api        = green (after OAuth completes)" -ForegroundColor DarkGray
Write-Host "  3. npm run verify:cloudflare-pages-env" -ForegroundColor DarkGray
Write-Host ""
