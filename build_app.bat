@echo off
cd /d "%~dp0"
echo ===================================================
echo    Albayan Quran School - Android APK Builder
echo ===================================================
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0build_apk.ps1"
echo.
pause
