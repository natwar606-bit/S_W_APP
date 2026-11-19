@echo off
title Shree Sawariya Traders - Billing Software
color 0F

cd /d "%~dp0"

if exist "%~dp0local-server\start.bat" (
    call "%~dp0local-server\start.bat"
    exit /b %ERRORLEVEL%
)

:: Direct fallback
node -v >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    node local-server\server.js
    exit /b 0
)

python --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    start "" http://localhost:8080
    python -m http.server 8080 --bind 127.0.0.1
    exit /b 0
)

echo [ERROR] Neither Node.js nor Python was found.
pause
