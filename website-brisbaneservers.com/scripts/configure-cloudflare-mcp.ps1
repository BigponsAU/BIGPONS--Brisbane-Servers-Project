# Configure CLOUDFLARE_API_TOKEN (user env) and run Email Routing setup.
# Run from repo: .\website-brisbaneservers.com\scripts\configure-cloudflare-mcp.ps1
#
# Token needs (custom token at dash.cloudflare.com):
#   Account: Cloudflare Pages Edit, Email Routing Addresses Edit, Account Resources Read
#   Zone brisbaneservers.com: Email Routing Rules Edit, DNS Edit, Zone Read

$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "Cloudflare MCP + Email Routing setup" -ForegroundColor Cyan
Write-Host "Create token: https://dash.cloudflare.com/profile/api-tokens" -ForegroundColor DarkGray
Write-Host ""

$token = $env:CLOUDFLARE_API_TOKEN
if (-not $token) {
  $secure = Read-Host "Paste Cloudflare API token (input hidden)" -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    $token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  }
}

if ([string]::IsNullOrWhiteSpace($token)) {
  Write-Error "No token provided."
}

$token = $token.Trim()
$bearer = "Bearer $token"

[Environment]::SetEnvironmentVariable('CLOUDFLARE_API_TOKEN', $token, 'User')
[Environment]::SetEnvironmentVariable('CLOUDFLARE_AUTH_HEADER', $bearer, 'User')

$env:CLOUDFLARE_API_TOKEN = $token
$env:CLOUDFLARE_AUTH_HEADER = $bearer

Write-Host "Saved CLOUDFLARE_API_TOKEN and CLOUDFLARE_AUTH_HEADER to your Windows user environment." -ForegroundColor Green
Write-Host "Reload Cursor (Developer: Reload Window) so cloudflare-api MCP reconnects." -ForegroundColor Yellow
Write-Host ""

$site = Split-Path $PSScriptRoot -Parent
Push-Location $site
try {
  Write-Host "Running Email Routing setup for brisbaneservers.com ..." -ForegroundColor Cyan
  npm run setup:cloudflare-email
} finally {
  Pop-Location
}
