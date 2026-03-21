# Build and Verify Script for Voice Framework
# Run this script to build and verify all components are compiled

Write-Host "🔨 Building Voice Framework..." -ForegroundColor Cyan
Write-Host ""

# Change to voice-framework directory
Set-Location $PSScriptRoot

# Standard build
Write-Host "Running: npm run build" -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Build completed!" -ForegroundColor Green
Write-Host ""

# Verify build
Write-Host "🔍 Verifying build..." -ForegroundColor Cyan
Write-Host ""

$requiredFiles = @(
    "dist\analyzers\tone-analyzer.js",
    "dist\analyzers\pattern-extractor.js",
    "dist\analyzers\shredder.js",
    "dist\generators\text-generator.js",
    "dist\generators\extrapolator.js",
    "dist\generators\voice-matcher.js",
    "dist\storage\text-storage.js",
    "dist\storage\profile-manager.js",
    "dist\builders\profile-builder.js",
    "dist\parsers\document-parser.js",
    "dist\processors\document-processor.js",
    "dist\index.js",
    "dist\models\voice-profile.js",
    "dist\models\text-patterns.js"
)

$allPresent = $true
$present = 0
$missing = 0

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "✅ $file" -ForegroundColor Green
        $present++
    } else {
        Write-Host "❌ $file - MISSING" -ForegroundColor Red
        $missing++
        $allPresent = $false
    }
}

Write-Host ""
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "   Present: $present/$($requiredFiles.Count)" -ForegroundColor $(if ($allPresent) { "Green" } else { "Yellow" })
Write-Host "   Missing: $missing/$($requiredFiles.Count)" -ForegroundColor $(if ($missing -eq 0) { "Green" } else { "Red" })
Write-Host ""

if ($allPresent) {
    Write-Host "✅ All files compiled successfully!" -ForegroundColor Green
    Write-Host ""
    exit 0
} else {
    Write-Host "❌ Some files are missing. Try: npm run build:force" -ForegroundColor Red
    Write-Host ""
    exit 1
}




