# Wire Google OAuth for Brisbane Servers API (Cloudflare Worker edge).
# Run from repo: .\website-brisbaneservers.com\scripts\configure-google-oauth.ps1
#
# Prerequisite: Web OAuth client in Google Cloud Console with redirect URI:
#   https://api.brisbaneservers.com/api/auth/oauth/google/callback

$ErrorActionPreference = 'Stop'

$DefaultClientId = '1040878189962-o0que80vsplu0vghos3ogdgjdakpvdda.apps.googleusercontent.com'
$RedirectUri = 'https://api.brisbaneservers.com/api/auth/oauth/google/callback'

Write-Host ""
Write-Host "Google OAuth — Brisbane Servers API (Cloudflare Worker)" -ForegroundColor Cyan
Write-Host "Console: https://console.cloud.google.com/apis/credentials" -ForegroundColor DarkGray
Write-Host "Redirect URI (add in Google Console if missing):" -ForegroundColor DarkGray
Write-Host "  $RedirectUri" -ForegroundColor Yellow
Write-Host ""

$clientId = $env:GOOGLE_OAUTH_CLIENT_ID
if (-not $clientId) { $clientId = [Environment]::GetEnvironmentVariable('GOOGLE_OAUTH_CLIENT_ID', 'User') }
if (-not $clientId) { $clientId = $DefaultClientId }
$entered = Read-Host "Client ID [$clientId]"
if ($entered.Trim()) { $clientId = $entered.Trim() }

$secret = $env:GOOGLE_OAUTH_CLIENT_SECRET
if (-not $secret) { $secret = [Environment]::GetEnvironmentVariable('GOOGLE_OAUTH_CLIENT_SECRET', 'User') }
if (-not $secret) {
  $secure = Read-Host "Client secret (input hidden)" -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    $secret = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  }
}
if ([string]::IsNullOrWhiteSpace($secret)) {
  Write-Error "Client secret is required. Copy it from Google Auth Platform > Clients > your client."
}

[Environment]::SetEnvironmentVariable('GOOGLE_OAUTH_CLIENT_ID', $clientId, 'User')
[Environment]::SetEnvironmentVariable('GOOGLE_OAUTH_CLIENT_SECRET', $secret.Trim(), 'User')
[Environment]::SetEnvironmentVariable('GOOGLE_OAUTH_REDIRECT_URI', $RedirectUri, 'User')
$env:GOOGLE_OAUTH_CLIENT_ID = $clientId
$env:GOOGLE_OAUTH_CLIENT_SECRET = $secret.Trim()
$env:GOOGLE_OAUTH_REDIRECT_URI = $RedirectUri

Write-Host "Saved GOOGLE_OAUTH_* to Windows user environment." -ForegroundColor Green

$syncScript = Join-Path $PSScriptRoot 'sync-secrets-to-edge-worker.ps1'
& $syncScript

Write-Host ""
Write-Host "Done. Verify:" -ForegroundColor Green
Write-Host "  curl https://api.brisbaneservers.com/api/auth/oauth/status" -ForegroundColor DarkGray
Write-Host "  (expect google: true)" -ForegroundColor DarkGray
Write-Host "  Sign in with Google at https://brisbaneservers.com/account" -ForegroundColor DarkGray
Write-Host ""
