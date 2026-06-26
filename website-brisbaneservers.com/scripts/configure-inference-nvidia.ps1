# Set NVIDIA NIM API key locally (Developer Program — dev/prototype inference).
# Production: wrangler secret put NVIDIA_API_KEY on brisbane-servers-api-edge.
#
# Run: npm run configure:inference-nvidia
# See: docs/operations/INFERENCE_WORKERS_AI.md

$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "NVIDIA NIM — save API key to user env" -ForegroundColor Cyan
Write-Host "Get key: https://build.nvidia.com/account/api-keys (prefix nvapi-)" -ForegroundColor DarkGray
Write-Host "Dev/prototype use only per NVIDIA Developer Program terms." -ForegroundColor DarkGray
Write-Host ""

$apiKey = $env:NVIDIA_API_KEY
if (-not $apiKey) {
  $apiKey = [Environment]::GetEnvironmentVariable('NVIDIA_API_KEY', 'User')
}
if (-not $apiKey) {
  $secure = Read-Host "Paste NVIDIA API key (input hidden)" -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    $apiKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  }
}

if ([string]::IsNullOrWhiteSpace($apiKey)) {
  Write-Error "NVIDIA API key is required."
}

$apiKey = $apiKey.Trim()
[Environment]::SetEnvironmentVariable('NVIDIA_API_KEY', $apiKey, 'User')
$env:NVIDIA_API_KEY = $apiKey

$model = $env:NVIDIA_MODEL
if (-not $model) {
  $model = [Environment]::GetEnvironmentVariable('NVIDIA_MODEL', 'User')
}
if (-not $model) {
  $model = 'stepfun-ai/step-3.7-flash'
}
[Environment]::SetEnvironmentVariable('NVIDIA_MODEL', $model.Trim(), 'User')
$env:NVIDIA_MODEL = $model.Trim()

[Environment]::SetEnvironmentVariable('INFERENCE_PROVIDER', 'nvidia', 'User')
$env:INFERENCE_PROVIDER = 'nvidia'

Write-Host "Saved NVIDIA_API_KEY, NVIDIA_MODEL=$model, INFERENCE_PROVIDER=nvidia to user env." -ForegroundColor Green
Write-Host ""
Write-Host "Next:" -ForegroundColor Cyan
Write-Host "  npm run sync:edge-worker-secrets   # push NVIDIA_API_KEY to edge worker"
Write-Host "  npm run deploy:edge-worker         # deploy INFERENCE_PROVIDER=nvidia vars"
Write-Host "  npm run verify:production -- --api https://api.brisbaneservers.com"
