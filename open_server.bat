@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Albayan Serverless Portal (Port 5000)

echo ==========================================================
echo    Albayan Quran School - Zero Python Serverless Engine
echo    Port: 5000  ^|  http://localhost:5000/
echo ==========================================================
echo.
echo  [1] Starting lightweight port server...
echo  [2] To stop: Press Ctrl + C
echo.

where npx >nul 2>&1
if %ERRORLEVEL% equ 0 (
    start "" http://localhost:5000/
    call npx -y serve static -p 5000
) else (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0open_server.ps1"
)

pause
