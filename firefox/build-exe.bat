@echo off
setlocal EnableExtensions
chcp 65001 >nul
rem ------------------------------------------------------------------
rem  Hand Design: собрать установщик в один файл .exe
rem  Только встроенные средства Windows (PowerShell + IExpress), ничего не скачивает.
rem  Запускать из папки версии (рядом с Setup.cmd). В архивы релизов этот файл не входит.
rem ------------------------------------------------------------------
cd /d "%~dp0"

if not exist "files\installer.ps1" (
  echo Не найден files\installer.ps1 — запустите этот файл из папки версии Hand Design.
  pause
  exit /b 1
)

rem версия: из файла VERSION, иначе из имени папки
set "VER="
if exist VERSION set /p VER=<VERSION
if not defined VER for %%I in ("%~dp0.") do set "VER=%%~nxI"
set "VER=%VER: =%"
set "VER=%VER:v=%"

set "OUT=%~dp0Hand-Design-Setup-v%VER%.exe"
set "WORK=%TEMP%\Hand-Design-exe-%RANDOM%%RANDOM%"
mkdir "%WORK%" || (echo Не получилось создать временную папку & pause & exit /b 1)

echo Hand Design v%VER%: упаковываю файлы...
rem всё, что нужно установщику, кроме самого батника, готовых .exe и архивов
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$src = '%~dp0'; $items = Get-ChildItem -LiteralPath $src -Force | Where-Object { $_.Name -notmatch '\.(exe|zip)$' -and $_.Name -ne 'build-exe.bat' };" ^
  "Compress-Archive -Path ($items.FullName) -DestinationPath '%WORK%\payload.zip' -Force"
if errorlevel 1 (echo Не получилось упаковать файлы & pause & exit /b 1)
if not exist "%WORK%\payload.zip" (echo Не получилось упаковать файлы ^(нет payload.zip^) & pause & exit /b 1)

rem IExpress не умеет пути с пробелами (D:\my code\...) — собираем во временной папке, потом копируем
set "TMPEXE=%WORK%\HandDesignSetup.exe"

rem запускалка внутри .exe: распаковывает в %%LOCALAPPDATA%% и открывает обычный установщик
> "%WORK%\launch.cmd" (
  echo @echo off
  echo set "DEST=%%LOCALAPPDATA%%\HandDesign\Setup-v%VER%"
  echo powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Force -LiteralPath '%%~dp0payload.zip' -DestinationPath '%%DEST%%'"
  echo start "" powershell -NoProfile -ExecutionPolicy Bypass -STA -WindowStyle Hidden -File "%%DEST%%\files\installer.ps1" -Gui -UserAppData "%%APPDATA%%"
)

rem описание пакета для IExpress (входит в Windows)
> "%WORK%\setup.sed" (
  echo [Version]
  echo Class=IEXPRESS
  echo SEDVersion=3
  echo [Options]
  echo PackagePurpose=InstallApp
  echo ShowInstallProgramWindow=1
  echo HideExtractAnimation=1
  echo UseLongFileName=1
  echo InsideCompressed=0
  echo CAB_FixedSize=0
  echo CAB_ResvCodeSigning=0
  echo RebootMode=N
  echo InstallPrompt=%%InstallPrompt%%
  echo DisplayLicense=%%DisplayLicense%%
  echo FinishMessage=%%FinishMessage%%
  echo TargetName=%%TargetName%%
  echo FriendlyName=%%FriendlyName%%
  echo AppLaunched=%%AppLaunched%%
  echo PostInstallCmd=%%PostInstallCmd%%
  echo AdminQuietInstCmd=%%AdminQuietInstCmd%%
  echo UserQuietInstCmd=%%UserQuietInstCmd%%
  echo SourceFiles=SourceFiles
  echo [Strings]
  echo InstallPrompt=
  echo DisplayLicense=
  echo FinishMessage=
  echo TargetName=%TMPEXE%
  echo FriendlyName=Hand Design %VER%
  echo AppLaunched=cmd /c launch.cmd
  echo PostInstallCmd=^<None^>
  echo AdminQuietInstCmd=
  echo UserQuietInstCmd=
  echo FILE0="launch.cmd"
  echo FILE1="payload.zip"
  echo [SourceFiles]
  echo SourceFiles0=%WORK%\
  echo [SourceFiles0]
  echo %%FILE0%%=
  echo %%FILE1%%=
)

echo Собираю %OUT% ...
if exist "%OUT%" del /q "%OUT%"
"%SystemRoot%\System32\iexpress.exe" /N /Q "%WORK%\setup.sed"
if exist "%TMPEXE%" copy /y "%TMPEXE%" "%OUT%" >nul

if exist "%OUT%" rmdir /s /q "%WORK%" 2>nul
if exist "%OUT%" (
  echo.
  echo Готово: %OUT%
  echo Его можно отправлять как один файл — при запуске откроется обычный установщик.
) else (
  echo.
  echo Не получилось собрать .exe ^(IExpress не создал файл^).
  echo Временные файлы оставлены для проверки: %WORK%
)
echo.
pause
