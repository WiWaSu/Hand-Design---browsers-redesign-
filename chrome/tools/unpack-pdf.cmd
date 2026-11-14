@echo off
rem Для разработки: распаковать pdf.js рядом (files\extension\pdf\lib), чтобы загрузить files\extension без установщика.
powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Force -LiteralPath '%~dp0..\files\extension\pdf\lib.zip' -DestinationPath '%~dp0..\files\extension\pdf\lib'"
echo Готово: files\extension\pdf\lib
pause
