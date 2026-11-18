@echo off
setlocal EnableExtensions
chcp 65001 >nul
rem Hand Design: собрать установщик в один файл .exe встроенным компилятором C# (.NET Framework 4). Ничего не скачивает.
rem В архивы релизов этот файл не входит.
cd /d "%~dp0"

if not exist "files\installer.ps1" (
  echo Не найден files\installer.ps1 — запустите этот файл из папки firefox.
  pause
  exit /b 1
)

set "CSC=%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if not exist "%CSC%" set "CSC=%WINDIR%\Microsoft.NET\Framework\v4.0.30319\csc.exe"
if not exist "%CSC%" (echo Не найден csc.exe ^(.NET Framework 4^) & pause & exit /b 1)

set "VER="
if exist VERSION set /p VER=<VERSION
set "VER=%VER: =%"
set "VER=%VER:v=%"

set "OUT=%~dp0Hand-Design-Setup-v%VER%.exe"
set "WORK=%TEMP%\Hand-Design-exe-%RANDOM%%RANDOM%"
mkdir "%WORK%" || (echo Не получилось создать временную папку & pause & exit /b 1)

echo Hand Design v%VER%: упаковываю файлы...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$items = Get-ChildItem -LiteralPath '%~dp0.' -Force | Where-Object { $_.Name -notmatch '\.(exe|zip)$' -and $_.Name -notin 'build-exe.bat', 'tools' };" ^
  "Compress-Archive -Path ($items.FullName) -DestinationPath '%WORK%\payload.zip' -Force"
if not exist "%WORK%\payload.zip" (echo Не получилось упаковать файлы & pause & exit /b 1)

> "%WORK%\Version.cs" echo static partial class Setup { public const string Version = "%VER%"; }

echo Собираю %OUT% ...
if exist "%OUT%" del /q "%OUT%"
"%CSC%" /nologo /target:winexe /optimize+ /out:"%OUT%" /win32icon:"tools\hand-design.ico" ^
  /resource:"%WORK%\payload.zip",payload.zip ^
  /r:System.IO.Compression.dll /r:System.IO.Compression.FileSystem.dll /r:System.Windows.Forms.dll ^
  "tools\setup-exe.cs" "%WORK%\Version.cs"

rmdir /s /q "%WORK%" 2>nul
if exist "%OUT%" (
  echo.
  echo Готово: %OUT%
) else (
  echo.
  echo Не получилось собрать .exe
)
echo.
pause
