# Create Cloudflare Pages deploy hook and save URL to user env (for worker publish rebuild).
# Run: .\website-brisbaneservers.com\scripts\setup-pages-deploy-hook.ps1

$ErrorActionPreference = "Stop"

$accountId = "92d738484386c6b613628bbeafebe2f9"
$projectName = "brisbaneservers"

$token = $env:CLOUDFLARE_API_TOKEN
if (-not $token) {
  $token = [Environment]::GetEnvironmentVariable("CLOUDFLARE_API_TOKEN", "User")
}
if (-not $token) {
  Write-Error "CLOUDFLARE_API_TOKEN required. Run: npm run configure:cloudflare-mcp"
}

$headers = @{
  Authorization  = "Bearer $token"
  "Content-Type" = "application/json"
}

Write-Host "Creating Pages deploy hook (URL shown once)..." -ForegroundColor Cyan
$body = @{ name = "api-publish-rebuild"; branch = "main" } | ConvertTo-Json
$created = Invoke-RestMethod -Method Post `
  -Uri "https://api.cloudflare.com/client/v4/accounts/$accountId/pages/projects/$projectName/deploy_hooks" `
  -Headers $headers -Body $body

if (-not $created.success) {
  throw "Create hook failed: $($created.errors | ConvertTo-Json -Compress)"
}

$hookUrl = $created.result.url
if (-not $hookUrl) {
  Write-Error "Hook created but URL not returned. Copy from Cloudflare Pages deploy hooks settings."
}

[Environment]::SetEnvironmentVariable("CLOUDFLARE_PAGES_DEPLOY_HOOK_URL", $hookUrl, "User")
$env:CLOUDFLARE_PAGES_DEPLOY_HOOK_URL = $hookUrl

Write-Host "Saved CLOUDFLARE_PAGES_DEPLOY_HOOK_URL to user env." -ForegroundColor Green
Write-Host "Sync to worker: npm run sync:edge-worker-secrets" -ForegroundColor Yellow
Write-Host "Deploy worker: npm run deploy:edge-worker" -ForegroundColor Yellow
