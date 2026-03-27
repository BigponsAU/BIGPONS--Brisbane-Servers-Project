# Test script for website-to-profile converter
# Run this from the voice-framework directory

$url = "https://127.0.0.1:3000"
$profileName = "brisbaneservers-nauT"

Write-Host "Testing website-to-profile converter..." -ForegroundColor Cyan
Write-Host "URL: $url" -ForegroundColor Yellow
Write-Host "Profile Name: $profileName" -ForegroundColor Yellow
Write-Host ""

npm run website-to-profile $url $profileName

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✓ Success!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "✗ Failed with exit code: $LASTEXITCODE" -ForegroundColor Red
}

