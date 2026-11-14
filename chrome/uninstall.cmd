@echo off
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -STA -File "%~dp0files\installer.ps1" -Gui -Action uninstall
