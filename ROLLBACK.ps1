$ErrorActionPreference = "Stop"
$project = "C:\projects\basmat-academy"
$rollback = Join-Path $project "rollback\src"

if (-not (Test-Path $rollback)) {
  Write-Host "Rollback folder was not found." -ForegroundColor Red
  exit 1
}

Copy-Item "$rollback\*" "$project\src" -Recurse -Force
Write-Host "Existing Sprint 6 source files restored." -ForegroundColor Green
Write-Host "New Sprint 7-only page files may remain unused; AppRouter is restored so they will not affect the app." -ForegroundColor Yellow
Write-Host "Run: npm run dev"
