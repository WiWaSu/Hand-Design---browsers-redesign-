@echo off
chcp 65001 >nul
rem Запуск установщика с видимой консолью: если окно не появляется, здесь будет текст ошибки.
powershell -NoProfile -ExecutionPolicy Bypass -STA -NoExit -File "%~dp0files\installer.ps1" -Gui
