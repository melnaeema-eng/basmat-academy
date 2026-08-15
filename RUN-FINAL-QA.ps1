$ErrorActionPreference = "Stop"

Write-Host "=== SCHOOL FINAL QA ===" -ForegroundColor Cyan
Set-Location "C:\projects\basmat-academy"

Write-Host "`n1) npm install integrity..." -ForegroundColor Yellow
npm install

Write-Host "`n2) Production build..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
  throw "BUILD FAILED"
}

Write-Host "`n3) Searching for obvious school route/import mistakes..." -ForegroundColor Yellow

$patterns = @(
  "school_teacher_can_manage\(",
  "school_teacher_can_manage_class\(",
  "/school/admin",
  "/school/teacher",
  "/school/student",
  "/school/parent"
)

foreach ($p in $patterns) {
  Write-Host "`nPattern: $p"
  Get-ChildItem ".\src" -Recurse -Include *.js,*.jsx |
    Select-String -Pattern $p |
    Select-Object -First 20 Path,LineNumber,Line
}

Write-Host "`n4) Build completed successfully." -ForegroundColor Green
Write-Host "Now run supabase\SCHOOL-FINAL-QA.sql in Supabase SQL Editor." -ForegroundColor Green
