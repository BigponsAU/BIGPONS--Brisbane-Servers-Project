# Wire Google OAuth for Brisbane Servers API (Render) + optional Cursor Google Cloud MCP.
# Run from repo: .\website-brisbaneservers.com\scripts\configure-google-oauth.ps1
#
# Prerequisite: Web OAuth client in Google Cloud Console with redirect URI:
#   https://brisbane-servers-api.onrender.com/api/auth/oauth/google/callback
# Optional (Cursor MCP): cursor://anysphere.cursor-mcp/oauth/callback

$ErrorActionPreference = 'Stop'

$DefaultClientId = '1040878189962-o0que80vsplu0vghos3ogdgjdakpvdda.apps.googleusercontent.com'
$RedirectUri = 'https://brisbane-servers-api.onrender.com/api/auth/oauth/google/callback'
$RenderServiceId = 'srv-d8ae7qbbc2fs73fv227g'

Write-Host ""
Write-Host "Google OAuth — Brisbane Servers API" -ForegroundColor Cyan
Write-Host "Console: https://console.cloud.google.com/apis/credentials" -ForegroundColor DarkGray
Write-Host "Redirect URI (add in Google Console if missing):" -ForegroundColor DarkGray
Write-Host "  $RedirectUri" -ForegroundColor Yellow
Write-Host ""

$clientId = $env:GOOGLE_OAUTH_CLIENT_ID
if (-not $clientId) { $clientId = $DefaultClientId }
$entered = Read-Host "Client ID [$clientId]"
if ($entered.Trim()) { $clientId = $entered.Trim() }

$secret = $env:GOOGLE_OAUTH_CLIENT_SECRET
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

$renderKey = [Environment]::GetEnvironmentVariable('RENDER_API_KEY', 'User')
if (-not $renderKey) {
  Write-Error "RENDER_API_KEY not set. Run configure-render-mcp.ps1 first."
}

[Environment]::SetEnvironmentVariable('GOOGLE_OAUTH_CLIENT_ID', $clientId, 'User')
[Environment]::SetEnvironmentVariable('GOOGLE_OAUTH_CLIENT_SECRET', $secret.Trim(), 'User')
$env:GOOGLE_OAUTH_CLIENT_ID = $clientId
$env:GOOGLE_OAUTH_CLIENT_SECRET = $secret.Trim()

Write-Host "Saved GOOGLE_OAUTH_* to Windows user environment." -ForegroundColor Green

$headers = @{
  Authorization = "Bearer $renderKey"
  Accept        = 'application/json'
  'Content-Type' = 'application/json'
}

function Set-RenderEnv($key, $value) {
  $body = @{ value = $value } | ConvertTo-Json
  Invoke-RestMethod -Uri "https://api.render.com/v1/services/$RenderServiceId/env-vars/$key" -Headers $headers -Method Put -Body $body | Out-Null
  Write-Host "  Render: $key" -ForegroundColor DarkGray
}

Write-Host "Updating Render env vars..." -ForegroundColor Cyan
Set-RenderEnv 'GOOGLE_OAUTH_CLIENT_ID' $clientId
Set-RenderEnv 'GOOGLE_OAUTH_CLIENT_SECRET' $secret.Trim()
Set-RenderEnv 'GOOGLE_OAUTH_REDIRECT_URI' $RedirectUri

Write-Host "Triggering Render deploy..." -ForegroundColor Cyan
Invoke-RestMethod -Uri "https://api.render.com/v1/services/$RenderServiceId/deploys" -Headers $headers -Method Post -Body '{}' | Out-Null

Write-Host ""
Write-Host "Done. Reload Cursor, then verify:" -ForegroundColor Green
Write-Host "  curl https://brisbane-servers-api.onrender.com/api/auth/oauth/status" -ForegroundColor DarkGray
Write-Host "  (expect google: true after deploy finishes)" -ForegroundColor DarkGray
Write-Host "  Sign in with Google at https://brisbaneservers.com/account" -ForegroundColor DarkGray
Write-Host ""
