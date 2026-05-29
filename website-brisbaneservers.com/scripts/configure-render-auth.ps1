# Configure Render API auth/email env vars (requires RENDER_API_KEY).
# Usage:
#   .\scripts\configure-render-auth.ps1
#   $env:RESEND_API_KEY='re_...'; .\scripts\configure-render-auth.ps1
#   $env:SMTP_HOST='smtp.example.com'; $env:SMTP_USER='...'; $env:SMTP_PASS='...'; .\scripts\configure-render-auth.ps1

param(
  [string]$ServiceId = 'srv-d8ae7qbbc2fs73fv227g',
  [string]$AdminEmail = 'bigpons@brisbaneservers.com'
)

$ErrorActionPreference = 'Stop'
$key = $env:RENDER_API_KEY
if (-not $key) {
  $key = [Environment]::GetEnvironmentVariable('RENDER_API_KEY', 'User')
}
if (-not $key) {
  Write-Error 'RENDER_API_KEY not set. Run: npm run configure:render-mcp'
}

function New-Secret([int]$Bytes = 32) {
  $b = New-Object byte[] $Bytes
  [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
  [Convert]::ToBase64String($b).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}

$headers = @{
  Authorization = "Bearer $key"
  Accept        = 'application/json'
  'Content-Type' = 'application/json'
}

$adminPassword = New-Secret 24
$cronSecret = New-Secret 32

$vars = @{
  CRON_SECRET    = $cronSecret
  ADMIN_EMAIL    = $AdminEmail.Trim().ToLower()
  ADMIN_PASSWORD = $adminPassword
}

if ($env:RESEND_API_KEY) { $vars['RESEND_API_KEY'] = $env:RESEND_API_KEY }
if ($env:SMTP_HOST) { $vars['SMTP_HOST'] = $env:SMTP_HOST }
if ($env:SMTP_USER) { $vars['SMTP_USER'] = $env:SMTP_USER }
if ($env:SMTP_PASS) { $vars['SMTP_PASS'] = $env:SMTP_PASS }
if ($env:SMTP_PORT) { $vars['SMTP_PORT'] = $env:SMTP_PORT }

foreach ($entry in $vars.GetEnumerator()) {
  $body = @{ value = $entry.Value } | ConvertTo-Json
  $uri = "https://api.render.com/v1/services/$ServiceId/env-vars/$($entry.Key)"
  try {
    Invoke-RestMethod -Uri $uri -Headers $headers -Method Put -Body $body | Out-Null
    Write-Host "Set $($entry.Key)"
  } catch {
    $uriPost = "https://api.render.com/v1/services/$ServiceId/env-vars"
    $createBody = @{ envVar = @{ key = $entry.Key; value = $entry.Value } } | ConvertTo-Json -Depth 4
    Invoke-RestMethod -Uri $uriPost -Headers $headers -Method Post -Body $createBody | Out-Null
    Write-Host "Created $($entry.Key)"
  }
}

Write-Host ''
Write-Host 'Bootstrap admin (works after next API deploy/restart):'
Write-Host "  Email:    $($vars.ADMIN_EMAIL)"
Write-Host "  Password: $adminPassword"
Write-Host ''
Write-Host 'CRON_SECRET saved on Render (use for provision-admin after deploy).'
Write-Host 'Add RESEND_API_KEY or SMTP_* for signup verification emails.'
Write-Host 'Triggering deploy...'

$deployBody = '{}' 
Invoke-RestMethod -Uri "https://api.render.com/v1/services/$ServiceId/deploys" -Headers $headers -Method Post -Body $deployBody | Out-Null
Write-Host 'Deploy started — check Render dashboard for status.'
