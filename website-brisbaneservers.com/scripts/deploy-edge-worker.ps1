# Deploy edge worker using user env secrets. Prefers wrangler OAuth if API token lacks Workers perms.
param(
  [string]$WorkerDir = (Join-Path $PSScriptRoot '..\workers\api')
)

$ErrorActionPreference = 'Stop'

function Import-UserEnv([string[]]$Names) {
  foreach ($name in $Names) {
    $val = [Environment]::GetEnvironmentVariable($name, 'User')
    if ($val) { Set-Item -Path "env:$name" -Value $val }
  }
}

Import-UserEnv @(
  'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN', 'RESEND_API_KEY',
  'ADMIN_EMAIL', 'ADMIN_PASSWORD', 'RENDER_API_ORIGIN'
)

if (-not $env:RENDER_API_ORIGIN) {
  $env:RENDER_API_ORIGIN = 'https://brisbane-servers-api.onrender.com'
}

Push-Location $WorkerDir
try {
  if (-not (Test-Path 'node_modules')) { npm install | Out-Null }

  Write-Host 'Deploying brisbane-servers-api-edge (secrets unchanged unless first deploy)...' -ForegroundColor Cyan

  $env:CLOUDFLARE_API_TOKEN = [Environment]::GetEnvironmentVariable('CLOUDFLARE_API_TOKEN', 'User')
  if (-not $env:CLOUDFLARE_API_TOKEN) {
    throw 'CLOUDFLARE_API_TOKEN not in user env. Token needs Workers Scripts Edit + Hyperdrive Edit.'
  }
  npx wrangler deploy
  if ($LASTEXITCODE -ne 0) { throw 'wrangler deploy failed' }

  Write-Host 'Edge worker deployed.' -ForegroundColor Green
} finally {
  Pop-Location
}
