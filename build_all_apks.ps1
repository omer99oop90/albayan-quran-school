# ========================================================
# Albayan Quran School - Build All APKs (Admin & Student)
# ========================================================

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   Building Both Android Applications                     " -ForegroundColor Cyan
Write-Host "   1. Admin App   : AlbayanApp.apk                        " -ForegroundColor Yellow
Write-Host "   2. Student App : AlbayanStudent.apk                    " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

Set-Location "c:\now"

# Step 1: Build Admin App
Write-Host "`n>>> [1/2] Building Admin & Staff App..." -ForegroundColor Green
powershell.exe -ExecutionPolicy Bypass -File "c:\now\build_apk.ps1"

# Step 2: Build Student App
Write-Host "`n>>> [2/2] Building Student App..." -ForegroundColor Green
powershell.exe -ExecutionPolicy Bypass -File "c:\now\build_student_apk.ps1"

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host " [SUCCESS] Both APKs are ready for direct download!      " -ForegroundColor Green
Write-Host " 1. Admin App  : c:\now\static\downloads\AlbayanApp.apk    " -ForegroundColor White
Write-Host " 2. Student App: c:\now\static\downloads\AlbayanStudent.apk" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Green
