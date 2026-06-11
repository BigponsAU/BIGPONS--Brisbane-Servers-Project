# Set Cloudflare Workers AI inference env on Render API + save tokens locally (user env).
# Run from repo: .\website-brisbaneservers.com\scripts\configure-inference-workers-ai.ps1
#
# Create token: Cloudflare dashboard -> My Profile -> API Tokens -> Workers AI Read/Edit
# Account ID: Cloudflare dashboard -> Workers & Pages -> right sidebar

param(
  [string]$ServiceId = 'srv-d8ae7qbbc2fs73fv227g',
  [switch]$SkipDeploy
)

$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "Workers AI inference -> Render API (brisbane-servers-api)" -ForegroundColor Cyan
Write-Host "Free tier: ~10k neurons/day. See docs/operations/INFERENCE_WORKERS_AI.md" -ForegroundColor DarkGray
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

$renderKey = $env:RENDER_API_KEY
if (-not $renderKey) {
  $renderKey = [Environment]::GetEnvironmentVariable('RENDER_API_KEY', 'User')
}
if (-not $renderKey) {
  Write-Error "RENDER_API_KEY not set. Run npm run configure:render-mcp first."
}

$headers = @{
  Authorization = "Bearer $renderKey"
  Accept        = 'application/json'
  'Content-Type' = 'application/json'
}

$envVars = @(
  @{ key = 'INFERENCE_PROVIDER'; value = 'workers-ai' },
  @{ key = 'WORKERS_AI_MODEL'; value = '@cf/meta/llama-3.1-8b-instruct' },
  @{ key = 'CLOUDFLARE_ACCOUNT_ID'; value = $accountId },
  @{ key = 'CLOUDFLARE_API_TOKEN'; value = $apiToken }
)

foreach ($ev in $envVars) {
  $uri = "https://api.render.com/v1/services/$ServiceId/env-vars/$($ev.key)"
  $body = @{ envVar = @{ key = $ev.key; value = $ev.value } } | ConvertTo-Json -Depth 4
  try {
    Invoke-RestMethod -Uri $uri -Method Put -Headers $headers -Body $body | Out-Null
    Write-Host "Updated Render $($ev.key)" -ForegroundColor Green
  } catch {
    $createUri = "https://api.render.com/v1/services/$ServiceId/env-vars"
    Invoke-RestMethod -Uri $createUri -Method Post -Headers $headers -Body $body | Out-Null
    Write-Host "Created Render $($ev.key)" -ForegroundColor Green
  }
}

if (-not $SkipDeploy) {
  Write-Host "Triggering Render redeploy..." -ForegroundColor Cyan
  $deployUri = "https://api.render.com/v1/services/$ServiceId/deploys"
  Invoke-RestMethod -Uri $deployUri -Method Post -Headers $headers -Body '{}' | Out-Null
  Write-Host "Deploy triggered." -ForegroundColor Green
}

Write-Host ""
Write-Host "Next: test Generate in /account Resources panel; check GET /api/usage/me" -ForegroundColor Cyan
