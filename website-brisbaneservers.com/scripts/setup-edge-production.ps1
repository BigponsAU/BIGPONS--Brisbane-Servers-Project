# One-shot: sync secrets from Render (legacy) -> user env -> Cloudflare Worker, then deploy.
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path $PSScriptRoot -Parent
Push-Location $repoRoot
try {
  Write-Host "Step 1: Pull legacy Render secrets into user env..." -ForegroundColor Cyan
  & (Join-Path $PSScriptRoot 'sync-render-secrets-for-edge.ps1')

  Write-Host ""
  Write-Host "Step 2: Push secrets to Cloudflare Worker..." -ForegroundColor Cyan
  & (Join-Path $PSScriptRoot 'sync-secrets-to-edge-worker.ps1')

  Write-Host ""
  Write-Host "Step 3: Deploy edge worker (CI only — push to main)..." -ForegroundColor Cyan
  & (Join-Path $PSScriptRoot 'deploy-via-ci.ps1')

  Write-Host ""
  Write-Host "Step 4: Verify Pages API URL..." -ForegroundColor Cyan
  & (Join-Path $PSScriptRoot 'verify-cloudflare-pages-env.ps1')

  Write-Host ""
  Write-Host "Step 5: Auth smoke test..." -ForegroundColor Cyan
  npm run verify:production-auth:edge
} finally {
  Pop-Location
}
