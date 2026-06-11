# Full edge API setup: sync Render secrets, Hyperdrive, worker deploy, proxy api DNS.
# Run: .\website-brisbaneservers.com\scripts\setup-edge-production.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent

function Import-UserEnv([string[]]$Names) {
  foreach ($name in $Names) {
    $val = [Environment]::GetEnvironmentVariable($name, 'User')
    if ($val) {
      Set-Item -Path "env:$name" -Value $val
    }
  }
}

Import-UserEnv @(
  'DATABASE_URL', 'NEON_DATABASE_URL', 'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN',
  'RESEND_API_KEY', 'ADMIN_EMAIL', 'ADMIN_PASSWORD', 'AUTH_EMAIL_FROM', 'RENDER_API_KEY'
)

Write-Host 'Step 1/4: Sync Render secrets...' -ForegroundColor Cyan
& (Join-Path $PSScriptRoot 'sync-render-secrets-for-edge.ps1')

Write-Host ''
Write-Host 'Step 2/4: Hyperdrive...' -ForegroundColor Cyan
& (Join-Path $PSScriptRoot 'configure-hyperdrive.ps1')

Write-Host ''
Write-Host 'Step 3/4: Deploy edge worker...' -ForegroundColor Cyan
& (Join-Path $PSScriptRoot 'deploy-edge-worker.ps1')

Write-Host ''
Write-Host 'Step 4/4: Proxy api.brisbaneservers.com (required for Workers)...' -ForegroundColor Cyan

$cfToken = $env:CLOUDFLARE_API_TOKEN
$zoneName = 'brisbaneservers.com'
$recordName = 'api.brisbaneservers.com'

$headers = @{
  Authorization = "Bearer $cfToken"
  'Content-Type' = 'application/json'
}

$zones = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones?name=$zoneName" -Headers $headers
$zoneId = $zones.result[0].id
$records = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records?name=$recordName" -Headers $headers
$record = $records.result[0]
if (-not $record) {
  Write-Warning "DNS record $recordName not found - set orange-cloud proxy manually."
} elseif (-not $record.proxied) {
  $body = @{
    type    = $record.type
    name    = $record.name
    content = $record.content
    proxied = $true
    ttl     = 1
  } | ConvertTo-Json
  Invoke-RestMethod -Method Patch -Uri "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records/$($record.id)" -Headers $headers -Body $body | Out-Null
  Write-Host "Enabled Cloudflare proxy on $recordName" -ForegroundColor Green
} else {
  Write-Host "$recordName already proxied" -ForegroundColor Green
}

Write-Host ''
Write-Host 'Verify:' -ForegroundColor Cyan
Write-Host '  curl https://api.brisbaneservers.com/api/health'
Write-Host '  curl https://api.brisbaneservers.com/api/auth/wake'
Write-Host '  npm run verify:production-auth'
