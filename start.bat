@echo off
title Shree Sawariya Traders - Billing Software
color 0F

cd /d "%~dp0"

echo ================================================================
echo    SHREE SAWARIYA TRADERS - BILLING SOFTWARE LAUNCHER
echo ================================================================
echo.

:: 1. Check if Port 8080 is already in use
netstat -ano | findstr /R /C:":8080 " >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [!] NOTE: Port 8080 is ALREADY running!
    echo     Aapka billing server pehle se chalu hai.
    echo     Opening http://localhost:8080 in your browser...
    echo.
    echo     Agar koi dikkat aaye toh 'stop.bat' chala kar dobara start karein.
    echo ================================================================
    start "" http://localhost:8080
    echo.
    pause
    exit /b 0
)

:: 2. Check for Node.js (Primary & fastest)
node -v >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    node server.js
    goto end
)

:: 3. Check for Python (Fallback)
python --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Node.js not detected. Using Python server...
    echo.
    echo ================================================================
    echo    SHREE SAWARIYA TRADERS - BILLING SOFTWARE IS RUNNING
    echo ================================================================
    echo    Address: http://localhost:8080
    echo    Status : Ready
    echo.
    echo    [!] DO NOT CLOSE THIS BLACK WINDOW WHILE USING THE APP.
    echo    [!] Is window ko band na karein jab tak bill bana rahe hain.
    echo    [!] Band karne ke liye 'stop.bat' chalayein ya window close karein.
    echo ================================================================
    start "" http://localhost:8080
    python -m http.server 8080 --bind 127.0.0.1
    goto end
)

:: 4. If neither Node nor Python is installed
color 0C
echo ================================================================
echo   [ERROR] SOFTWARE DEPENDENCY MISSING
echo ================================================================
echo   Aapke computer par Node.js ya Python install nahi mila.
echo.
echo   Kripya Node.js (LTS version) download aur install karein:
echo   Download Link: https://nodejs.org/
echo.
echo   Install karne ke baad dobara 'start.bat' par double click karein.
echo ================================================================
echo.
pause

:end
