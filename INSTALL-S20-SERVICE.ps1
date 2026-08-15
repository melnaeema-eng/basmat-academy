$ErrorActionPreference="Stop"
$service="C:\projects\basmat-academy\src\services\schoolService.js"
$patch="C:\projects\basmat-academy\src\services\S20FinanceServicePatch.txt"
if (!(Test-Path $service)) { throw "schoolService.js not found" }
if (!(Select-String -Path $service -Pattern "getSchoolS20Health" -Quiet)) {
  Add-Content -Path $service -Value "`r`n"
  Get-Content $patch | Add-Content -Path $service
}
Write-Host "S20 service functions installed."
