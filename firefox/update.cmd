@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0files\installer.ps1" -Action update -UserAppData "%APPDATA%"
echo.
pause
