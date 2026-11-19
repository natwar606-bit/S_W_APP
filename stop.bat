@echo off
title Stop Billing Server
color 0E

cd /d "%~dp0"

if exist "%~dp0local-server\stop.bat" (
    call "%~dp0local-server\stop.bat"
    exit /b %ERRORLEVEL%
)

for /f "tokens=5" %%a in ('netstat -aon ^| findstr /R /C:":8080 "') do (
    taskkill /F /PID %%a >nul 2>&1
)
