# Deploy edge worker — prefers API token; falls back to wrangler OAuth (dynamic IP).
param(
  [string]$WorkerDir = (Join-Path $PSScriptRoot '..\workers\api'),
  [switch]$UseOAuth
)

$ErrorActionPreference = 'Stop'

function Import-UserEnv([string[]]$Names) {
  foreach ($name in $Names) {
    $val = [Environment]::GetEnvironmentVariable($name, 'User')
    if ($val) { Set-Item -Path "env:$name" -Value $val }
  }
}

function Invoke-WranglerDeploy {
  param([bool]$WithToken)

  if ($WithToken) {
    $token = [Environment]::GetEnvironmentVariable('CLOUDFLARE_API_TOKEN', 'User')
    if ($token) { $env:CLOUDFLARE_API_TOKEN = $token }
  } else {
    Remove-Item Env:CLOUDFLARE_API_TOKEN -ErrorAction SilentlyContinue
  }

  $deployLog = Join-Path $env:TEMP "wrangler-deploy-$(Get-Date -Format 'yyyyMMddHHmmss').log"
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  npx wrangler deploy 2>&1 | Tee-Object -FilePath $deployLog
  $deployExit = $LASTEXITCODE
  $ErrorActionPreference = $prevEap

  return @{
    ExitCode = $deployExit
    Log      = if (Test-Path $deployLog) { Get-Content $deployLog -Raw } else { '' }
  }
}

Import-UserEnv @(
  'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN', 'RESEND_API_KEY',
  'ADMIN_EMAIL', 'ADMIN_PASSWORD', 'JWT_SECRET'
)

Push-Location $WorkerDir
try {
  if (-not (Test-Path 'node_modules')) { npm install | Out-Null }

  Write-Host 'Deploying brisbane-servers-api-edge...' -ForegroundColor Cyan

  $token = [Environment]::GetEnvironmentVariable('CLOUDFLARE_API_TOKEN', 'User')
  $preferOAuth = $UseOAuth -or $env:WRANGLER_USE_OAUTH -eq '1'

  $result = $null
  if (-not $preferOAuth -and $token) {
    $result = Invoke-WranglerDeploy -WithToken $true
    if ($result.ExitCode -ne 0 -and $result.Log -match 'Authentication error|9109|10000') {
      Write-Host 'Token deploy failed (auth/IP). Retrying with wrangler OAuth...' -ForegroundColor Yellow
      $result = Invoke-WranglerDeploy -WithToken $false
    }
  } else {
    if (-not $token) {
      Write-Host 'No CLOUDFLARE_API_TOKEN — using wrangler OAuth (run: npx wrangler login).' -ForegroundColor Yellow
    }
    $result = Invoke-WranglerDeploy -WithToken $false
  }

  if ($result.ExitCode -ne 0) {
    if ($result.Log -match 'Uploaded brisbane-servers-api-edge') {
      Write-Host 'Worker script uploaded; route sync failed (add Zone Workers Routes Edit on brisbaneservers.com).' -ForegroundColor Yellow
    } else {
      throw 'wrangler deploy failed — run: cd workers/api && npx wrangler login'
    }
  }

  Write-Host 'Edge worker deployed.' -ForegroundColor Green
} finally {
  Pop-Location
}
