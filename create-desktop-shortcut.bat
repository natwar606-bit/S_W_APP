@echo off
title Create Desktop Shortcut
color 0A

cd /d "%~dp0"

echo ================================================================
echo    CREATING DESKTOP SHORTCUT FOR BILLING SOFTWARE
echo ================================================================
echo.

powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\Shree Sawariya Traders Billing.lnk'); $s.TargetPath = '%~dp0start.bat'; $s.WorkingDirectory = '%~dp0'; $s.Description = 'Shree Sawariya Traders Billing Software'; $s.IconLocation = 'shell32.dll,264'; $s.Save()"

if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Desktop Shortcut ban gaya hai!
    echo.
    echo Aapke Desktop par "Shree Sawariya Traders Billing" ka icon aa gaya hai.
    echo Ab aap roz subah Desktop se direct double-click karke billing shuru kar sakte hain.
) else (
    echo [NOTE] Desktop shortcut banane me koi dikkat aayi.
    echo Aap 'start.bat' par right click karke "Send to -> Desktop (create shortcut)" kar sakte hain.
)

echo ================================================================
echo.
pause
