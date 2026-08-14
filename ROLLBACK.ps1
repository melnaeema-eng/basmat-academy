$ErrorActionPreference = "Stop"
$project = "C:\projects\basmat-academy"
$rollback = Join-Path $project "rollback\src"

if (-not (Test-Path $rollback)) {
    Write-Host "Rollback files not found." -ForegroundColor Red
    exit 1
}

Copy-Item "$rollback\*" "$project\src" -Recurse -Force
Write-Host "Sprint 5.4 files rolled back to the stable baseline." -ForegroundColor Green
Write-Host "Run: npm run dev"
