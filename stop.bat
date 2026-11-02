@echo off
title Stop Billing Server
color 0E

cd /d "%~dp0"

echo ================================================================
echo    STOPPING SHREE SAWARIYA TRADERS BILLING SERVER
echo ================================================================
echo.

setlocal enabledelayedexpansion
set FOUND_PID=

for /f "tokens=5" %%a in ('netstat -aon ^| findstr /R /C:":8080 "') do (
    set FOUND_PID=%%a
)

if defined FOUND_PID (
    echo Port 8080 par chal raha process mila: PID !FOUND_PID!
    taskkill /F /PID !FOUND_PID! >nul 2>&1
    echo.
    echo ================================================================
    echo   [SUCCESS] Billing server has been STOPPED!
    echo   Aapka billing server band ho gaya hai.
    echo ================================================================
) else (
    echo ================================================================
    echo   Port 8080 par koi server chalu nahi tha.
    echo   (Billing server is not currently running)
    echo ================================================================
)

echo.
ping 127.0.0.1 -n 3 >nul 2>&1
exit /b 0
