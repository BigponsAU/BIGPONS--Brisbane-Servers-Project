# Set Cloudflare Workers AI credentials locally (for scripts / local API dev).
# Production inference runs on the edge Worker via the [ai] binding — NOT Render.
#
# Run: npm run configure:inference-workers-ai
# See: docs/operations/INFERENCE_WORKERS_AI.md

$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "Workers AI — save Cloudflare credentials to user env" -ForegroundColor Cyan
Write-Host "Production: edge Worker AI binding (deploy:edge-worker). Render is retired." -ForegroundColor DarkGray
Write-Host ""

$accountId = $env:CLOUDFLARE_ACCOUNT_ID
if (-not $accountId) {
  $accountId = [Environment]::GetEnvironmentVariable('CLOUDFLARE_ACCOUNT_ID', 'User')
}
if (-not $accountId) {
  $accountId = Read-Host "Paste Cloudflare Account ID"
}

$apiToken = $env:CLOUDFLARE_API_TOKEN
if (-not $apiToken) {
  $apiToken = [Environment]::GetEnvironmentVariable('CLOUDFLARE_API_TOKEN', 'User')
}
if (-not $apiToken) {
  $secure = Read-Host "Paste Cloudflare API token (Workers AI permission, input hidden)" -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    $apiToken = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  }
}

if ([string]::IsNullOrWhiteSpace($accountId) -or [string]::IsNullOrWhiteSpace($apiToken)) {
  Write-Error "Account ID and API token are required."
}

$accountId = $accountId.Trim()
$apiToken = $apiToken.Trim()

[Environment]::SetEnvironmentVariable('CLOUDFLARE_ACCOUNT_ID', $accountId, 'User')
[Environment]::SetEnvironmentVariable('CLOUDFLARE_API_TOKEN', $apiToken, 'User')
$env:CLOUDFLARE_ACCOUNT_ID = $accountId
$env:CLOUDFLARE_API_TOKEN = $apiToken

Write-Host "Saved CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN to Windows user environment." -ForegroundColor Green
Write-Host ""
Write-Host "Next:" -ForegroundColor Cyan
Write-Host "  npm run deploy:edge-worker   # production inference uses Worker [ai] binding"
Write-Host "  npm run verify:production -- --api https://api.brisbaneservers.com"
