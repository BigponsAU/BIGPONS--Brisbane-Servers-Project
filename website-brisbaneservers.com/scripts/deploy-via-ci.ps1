# Edge worker deploys through GitHub Actions — not local wrangler.
$ErrorActionPreference = 'Stop'
Write-Host 'Production API deploy: push to main (GitHub Actions deploy-edge-worker.yml).' -ForegroundColor Cyan
Write-Host '  git push origin main' -ForegroundColor Yellow
Write-Host 'Manual trigger: gh workflow run "Deploy edge worker"' -ForegroundColor DarkGray
Write-Host 'Pages (account dashboard UI): Cloudflare Pages build on the same push.' -ForegroundColor DarkGray
