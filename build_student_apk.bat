@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ==========================================================
echo    Building Albayan Student App (AlbayanStudent.apk)
echo    Application ID: org.albayan.student
echo ==========================================================
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0build_student_apk.ps1"
echo.
pause

