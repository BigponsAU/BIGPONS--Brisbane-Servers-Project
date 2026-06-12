# Cloudflare setup: API token (npm/wrangler scripts) + OAuth (cloudflare-api MCP in Cursor only).
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
Write-Host "Cloudflare auth (two channels, not duplicates)" -ForegroundColor Cyan
Write-Host "  API token -> npm scripts + wrangler only (Windows user env)" -ForegroundColor DarkGray
Write-Host "  OAuth     -> cloudflare-api MCP in Cursor (ignore cloudflare-api-token)" -ForegroundColor DarkGray
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
Write-Host "       cloudflare-api = green (OAuth). Disable/remove cloudflare-api-token if present." -ForegroundColor DarkGray
Write-Host "  3. npm run verify:cloudflare-pages-env" -ForegroundColor DarkGray
Write-Host ""
