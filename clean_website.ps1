# Albayan School - Clean Website Files
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Set-Location "c:\now"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   Albayan Website Cleanup - Apps Portal Only" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

$keepFiles = @(
    "index.html",
    "logo.png"
)

$staticPath = "c:\now\static"
$files = Get-ChildItem -Path $staticPath -File

$removedCount = 0
foreach ($file in $files) {
    if ($keepFiles -notcontains $file.Name) {
        Remove-Item -Path $file.FullName -Force -ErrorAction SilentlyContinue
        $removedCount++
    }
}

Write-Host ""
Write-Host " [OK] Removed $removedCount legacy files successfully!" -ForegroundColor Green
Write-Host " [OK] static folder now contains only:" -ForegroundColor Cyan
Write-Host "     1. index.html (Apps installation landing page)" -ForegroundColor White
Write-Host "     2. logo.png" -ForegroundColor White
Write-Host "     3. downloads\AlbayanApp.apk" -ForegroundColor White
Write-Host "     4. downloads\AlbayanStudent.apk" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan
