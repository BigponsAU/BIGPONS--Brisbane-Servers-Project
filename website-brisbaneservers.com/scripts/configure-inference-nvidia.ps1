# Set NVIDIA NIM API key locally (Developer Program — dev/prototype inference).
# Production secret: already on brisbane-servers-api-edge — use MCP or sync:nvidia-secret if rotating.
#
# Run from website-brisbaneservers.com (do not cd into it twice):
#   .\scripts\configure-inference-nvidia.ps1
#   .\scripts\configure-inference-nvidia.ps1 -ApiKey 'nvapi-...'   # may land in shell history
#
# See: docs/operations/INFERENCE_WORKERS_AI.md

param(
  [string]$ApiKey
)

$ErrorActionPreference = 'Stop'

function Test-NvidiaApiKey([string]$Key) {
  if ([string]::IsNullOrWhiteSpace($Key)) { return $false }
  $k = $Key.Trim()
  return $k -match '^nvapi-' -and $k.Length -ge 40
}

Write-Host ""
Write-Host "NVIDIA NIM — save API key to user env" -ForegroundColor Cyan
Write-Host "Get key: https://build.nvidia.com/account/api-keys (prefix nvapi-)" -ForegroundColor DarkGray
Write-Host "Dev/prototype use only per NVIDIA Developer Program terms." -ForegroundColor DarkGray
Write-Host ""

if (Test-NvidiaApiKey $ApiKey) {
  $apiKey = $ApiKey.Trim()
} else {
  $apiKey = $null
  foreach ($candidate in @($env:NVIDIA_API_KEY, [Environment]::GetEnvironmentVariable('NVIDIA_API_KEY', 'User'))) {
    if (Test-NvidiaApiKey $candidate) {
      $apiKey = $candidate.Trim()
      break
    }
    if ($candidate -and -not (Test-NvidiaApiKey $candidate)) {
      Write-Host "Ignoring invalid NVIDIA_API_KEY in env (length $($candidate.Trim().Length))." -ForegroundColor Yellow
    }
  }
}

if (-not (Test-NvidiaApiKey $apiKey)) {
  $secure = Read-Host "Paste NVIDIA API key (input hidden)" -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    $apiKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  }
}

if (-not (Test-NvidiaApiKey $apiKey)) {
  Write-Error "Invalid NVIDIA API key (expected nvapi- prefix, ~70+ characters). Get one at https://build.nvidia.com/account/api-keys"
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

Write-Host "Saved NVIDIA_API_KEY (length $($apiKey.Length)), NVIDIA_MODEL=$model, INFERENCE_PROVIDER=nvidia to user env." -ForegroundColor Green
Write-Host ""
Write-Host "Production worker already has NVIDIA_API_KEY (set via Cloudflare)." -ForegroundColor DarkGray
Write-Host "Local user env is for scripts/tests on this machine only." -ForegroundColor DarkGray
Write-Host ""
Write-Host "Optional — rotate key on worker (if local wrangler IP is allowed):" -ForegroundColor Cyan
Write-Host "  npm run sync:nvidia-secret"
Write-Host "  npm run verify:production -- --api https://api.brisbaneservers.com"
