# @deprecated Render API retired. Neon connects via Hyperdrive on the edge Worker.
# Save NEON_DATABASE_URL locally for migrations/scripts; production uses Hyperdrive binding.
#
# Run: npm run configure:hyperdrive
# Docs: docs/operations/NEON_DATABASE.md

Write-Host "configure:neon-database is deprecated (Render API retired)." -ForegroundColor Yellow
Write-Host ""
Write-Host "Production DB: Neon via Hyperdrive on Worker brisbane-servers-api-edge" -ForegroundColor Cyan
Write-Host "  npm run configure:hyperdrive" -ForegroundColor DarkGray
Write-Host "  npm run sync:edge-worker-secrets" -ForegroundColor DarkGray
Write-Host ""
Write-Host "To save NEON_DATABASE_URL locally for migration scripts, set it in Windows user env" -ForegroundColor DarkGray
Write-Host "or paste when running: npm run migrate:render-postgres-to-neon" -ForegroundColor DarkGray
exit 0
