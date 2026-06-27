# Push production secrets to Cloudflare Worker (replaces Render env for API).
param(
  [string]$WorkerDir = (Join-Path $PSScriptRoot '..\workers\api'),
  [string[]]$Only = @()
)

$ErrorActionPreference = 'Stop'

function Import-UserEnv([string[]]$Names) {
  foreach ($name in $Names) {
    $val = [Environment]::GetEnvironmentVariable($name, 'User')
    if ($val) { Set-Item -Path "env:$name" -Value $val }
  }
}

function Test-NvidiaApiKey([string]$Key) {
  return $Key -match '^nvapi-' -and $Key.Length -ge 40
}

$edgeRedirect = 'https://api.brisbaneservers.com/api/auth/oauth/google/callback'
[Environment]::SetEnvironmentVariable('GOOGLE_OAUTH_REDIRECT_URI', $edgeRedirect, 'User')

$allSecrets = @(
  'RESEND_API_KEY', 'JWT_SECRET', 'ADMIN_EMAIL', 'ADMIN_PASSWORD',
  'AUTH_EMAIL_FROM', 'GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET',
  'GOOGLE_OAUTH_REDIRECT_URI', 'CRON_SECRET', 'CLOUDFLARE_PAGES_DEPLOY_HOOK_URL',
  'CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ZONE_ID', 'NVIDIA_API_KEY'
)

Import-UserEnv $allSecrets

$secrets = if ($Only.Count -gt 0) { $Only } else { $allSecrets }

if (-not $env:CLOUDFLARE_API_TOKEN) {
  Write-Host 'CLOUDFLARE_API_TOKEN not in user env — wrangler may use OAuth (often IP-restricted).' -ForegroundColor DarkYellow
}

$failed = @()
$skipped = @()

Push-Location $WorkerDir
try {
  if (-not (Test-Path 'node_modules')) { npm install | Out-Null }

  foreach ($name in $secrets) {
    $val = [Environment]::GetEnvironmentVariable($name, 'User')
    if (-not $val) {
      Write-Host "Skip $name (not in user env)" -ForegroundColor DarkYellow
      $skipped += $name
      continue
    }
    if ($name -eq 'NVIDIA_API_KEY' -and -not (Test-NvidiaApiKey $val)) {
      Write-Host "Skip NVIDIA_API_KEY (invalid — must start with nvapi- and be ~70+ chars). Re-run configure-inference-nvidia.ps1" -ForegroundColor Red
      $skipped += $name
      continue
    }

    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $stderr = $val | npx wrangler secret put $name 2>&1
    $exit = $LASTEXITCODE
    $ErrorActionPreference = $prevEap

    if ($exit -ne 0) {
      $hint = ($stderr | Out-String).Trim()
      if ($hint -match '9109') {
        Write-Host "Failed $name — Cloudflare token blocked from this IP (9109). Add your IP to the token allowlist, or ask Cursor to push via cloudflare-api MCP." -ForegroundColor Red
      } else {
        Write-Host "Failed $name (exit $exit)" -ForegroundColor Red
        if ($hint) { Write-Host $hint -ForegroundColor DarkGray }
      }
      $failed += $name
      continue
    }
    Write-Host "Set worker secret: $name" -ForegroundColor Green
  }
} finally {
  Pop-Location
}

if ($failed.Count -gt 0) {
  Write-Host "`nFailed: $($failed -join ', ')" -ForegroundColor Red
  exit 1
}

Write-Host 'Worker secrets synced. Deploy: push to main (GitHub Actions deploy-edge-worker.yml).' -ForegroundColor Cyan
