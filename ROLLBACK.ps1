$ErrorActionPreference="Stop"
$project="C:\projects\basmat-academy"
$rollback=Join-Path $project "rollback\src"
if(-not(Test-Path $rollback)){Write-Host "Rollback folder not found" -ForegroundColor Red;exit 1}
Copy-Item "$rollback\*" "$project\src" -Recurse -Force
Write-Host "Existing Sprint 8 source restored. New Sprint 9-only files remain unused after AppRouter rollback." -ForegroundColor Green
Write-Host "Run: npm run dev"
