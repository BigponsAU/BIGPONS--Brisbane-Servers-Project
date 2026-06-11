# Push Workers AI env from local user env to Render when vars are present.
param([string]$ServiceId = 'srv-d8ae7qbbc2fs73fv227g')

$ErrorActionPreference = 'Stop'

$accountId = [Environment]::GetEnvironmentVariable('CLOUDFLARE_ACCOUNT_ID', 'User')
$apiToken = [Environment]::GetEnvironmentVariable('CLOUDFLARE_API_TOKEN', 'User')
$renderKey = [Environment]::GetEnvironmentVariable('RENDER_API_KEY', 'User')

if (-not $renderKey) { Write-Warning 'RENDER_API_KEY missing'; exit 0 }
if (-not $accountId -or -not $apiToken) {
  Write-Warning 'CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN not in user env — skip inference sync'
  exit 0
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
    Write-Host "Render $($ev.key) updated" -ForegroundColor Green
  } catch {
    Write-Warning "Render $($ev.key) update skipped: $($_.Exception.Message)"
  }
}

Invoke-RestMethod -Uri "https://api.render.com/v1/services/$ServiceId/deploys" -Method Post -Headers $headers -Body '{}' | Out-Null
Write-Host 'Render redeploy triggered for inference.' -ForegroundColor Cyan
