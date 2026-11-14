param(
  [ValidateSet("install", "uninstall")]
  [string]$Action = "install",
  # ask — выбрать в окне; или ключ темы: oneui, ios, material, fluent, macos, nothing, nightdrive, aero, retro, terminal, paper, cyber,
  # arctic, sakura, mint, latte, midnight, fjord, ember, forest, ocean, rose, synthwave, contrast
  [string]$Theme = "ask",
  # вариант для тем со светлым и тёмным видом: auto — как в Windows
  [ValidateSet("auto", "light", "dark")]
  [string]$Mode = "auto",
  # акцент: theme — как в теме, windows — цвет Windows, или #RRGGBB
  [string]$Accent = "theme",
  # обои новой вкладки: theme | aurora | iris | sunset | ocean | forest | night | rose | graphite | bloom | dune | путь к картинке
  [string]$Wall = "theme",
  # функции через запятую: nowbar, callbar, pdf, switcher, tiles, live, square
  [string]$Features = "nowbar,callbar,pdf,switcher,tiles,live",
  # браузеры: ask — выбрать в окне; all — все найденные; или список: chrome,edge,brave,vivaldi,opera,operagx,yandex,chromium,thorium
  [string]$Browsers = "ask",
  # язык: ask — спросить при запуске
  [ValidateSet("ask", "ru", "en")]
  [string]$Lang = "ask",
  [switch]$Gui,
  # куда ставить (по умолчанию %LOCALAPPDATA%\HandDesign\Chrome)
  [string]$Dest = ""
)

$ErrorActionPreference = "Stop"
try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch {}

# версия (меняется вместе с файлом VERSION, manifest.json и CHANGELOG.md)
$Version = "0.1.2"
$Here = $PSScriptRoot
# файл VERSION рядом с Setup.cmd главнее — номер не разойдётся с релизом
try { $vf = Join-Path (Split-Path -Parent $Here) "VERSION"; if (Test-Path -LiteralPath $vf) { $v = ([IO.File]::ReadAllText($vf)).Trim(); if ($v -match '^\d+\.\d+\.\d+$') { $Version = $v } } } catch {}
$Utf8 = New-Object System.Text.UTF8Encoding($false)
if (-not $Dest) { $Dest = Join-Path $env:LOCALAPPDATA "HandDesign\Chrome" }
$Ru = $true
try { $Ru = (Get-UICulture).Name -like "ru*" } catch {}
if ($Lang -eq "ru") { $Ru = $true } elseif ($Lang -eq "en") { $Ru = $false }
# $script:Ru, а не $Ru: имена в PowerShell без учёта регистра, и параметр $ru перекрывал флаг —
# установщик всегда говорил по-русски
function T($ru, $en) { if ($script:Ru) { $ru } else { $en } }
function Say($text, $color = "Gray") { Write-Host $text -ForegroundColor $color; Write-Log $text }

# журнал: %TEMP%\HandDesign-Chromium-setup.log — если что-то пошло не так, там видно, где
$LogFile = Join-Path $env:TEMP "HandDesign-Chromium-setup.log"
function Write-Log($text) {
  try { Add-Content -LiteralPath $LogFile -Value ("[{0:HH:mm:ss}] {1}" -f (Get-Date), $text) -Encoding UTF8 } catch {}
}
function Show-Fatal($err) {
  $msg = ""
  if ($err -is [System.Management.Automation.ErrorRecord]) {
    $msg = $err.Exception.Message + "`n`n" + $err.InvocationInfo.PositionMessage
  } elseif ($err -is [Exception]) {
    $e = $err
    while ($e.InnerException) { $e = $e.InnerException }
    $msg = $e.Message
    if ($e -is [System.Management.Automation.IContainsErrorRecord]) { $msg += "`n`n" + $e.ErrorRecord.InvocationInfo.PositionMessage }
  } else { $msg = [string]$err }
  Write-Log ("ОШИБКА: " + $msg)
  Write-Host $msg -ForegroundColor Red
  try {
    Add-Type -AssemblyName PresentationFramework
    [void][Windows.MessageBox]::Show(((T "Установщик споткнулся:" "The installer failed:") + "`n`n" + $msg + "`n`n" + (T "Журнал: " "Log: ") + $LogFile), "Hand Design for Chromium", "OK", "Error")
  } catch {}
}
# любая ошибка — окно с текстом и строкой, а не молчаливое закрытие
trap { Show-Fatal $_; exit 1 }
Write-Log ("---- Hand Design for Chromium $Version, PowerShell " + $PSVersionTable.PSVersion + ", " + [Environment]::OSVersion.VersionString)

# ---------------------------------------------------------------- темы, обои, браузеры
$ThemeList = Get-Content -LiteralPath (Join-Path $Here "themes\themes.json") -Raw -Encoding UTF8 | ConvertFrom-Json
$ThemeIds = @($ThemeList | ForEach-Object { $_.id })

# обои: те же ключи, что в расширении (shared/walls.js); цвета — для превью
$WallPresets = [ordered]@{
  aurora   = @{ Name = (T "Аврора" "Aurora");   Colors = @("#6B4DFF", "#00B4FF", "#05060C") }
  iris     = @{ Name = (T "Ирис" "Iris");       Colors = @("#409CFF", "#7A3CC8", "#FF5C8C") }
  sunset   = @{ Name = (T "Закат" "Sunset");    Colors = @("#2B1055", "#7A2A7A", "#FF7E5F", "#FEB47B") }
  ocean    = @{ Name = (T "Океан" "Ocean");     Colors = @("#00C6FF", "#0072FF", "#021B3A") }
  forest   = @{ Name = (T "Лес" "Forest");      Colors = @("#A8E063", "#2F8F5B", "#0B2E22") }
  night    = @{ Name = (T "Ночь" "Night");      Colors = @("#0F2027", "#203A43", "#2C5364") }
  rose     = @{ Name = (T "Пудра" "Rose");      Colors = @("#F9C5D1", "#C7B5F0", "#9795EF") }
  graphite = @{ Name = (T "Графит" "Graphite"); Colors = @("#4A4D55", "#2A2C31", "#141518") }
  bloom    = @{ Name = "Bloom";                 Colors = @("#78AAFF", "#2864E6", "#0B1A3A") }
  dune     = @{ Name = (T "Дюна" "Dune");       Colors = @("#F2C98A", "#C07A3A", "#2A1810") }
}
$WallTypes = @{ ".jpg" = 1; ".jpeg" = 1; ".png" = 1; ".webp" = 1; ".gif" = 1; ".bmp" = 1; ".avif" = 1 }

$PF = $env:ProgramFiles
$PF86 = ${env:ProgramFiles(x86)}
$LA = $env:LOCALAPPDATA
$RA = $env:APPDATA
$BrowserDefs = @(
  @{ Key = "chrome";   Name = "Google Chrome"; Page = "chrome://extensions";  Data = "$LA\Google\Chrome\User Data"
     Exe = @("$PF\Google\Chrome\Application\chrome.exe", "$PF86\Google\Chrome\Application\chrome.exe", "$LA\Google\Chrome\Application\chrome.exe") }
  @{ Key = "edge";     Name = "Microsoft Edge"; Page = "edge://extensions";   Data = "$LA\Microsoft\Edge\User Data"
     Exe = @("$PF86\Microsoft\Edge\Application\msedge.exe", "$PF\Microsoft\Edge\Application\msedge.exe") }
  @{ Key = "brave";    Name = "Brave";          Page = "brave://extensions";  Data = "$LA\BraveSoftware\Brave-Browser\User Data"
     Exe = @("$PF\BraveSoftware\Brave-Browser\Application\brave.exe", "$LA\BraveSoftware\Brave-Browser\Application\brave.exe") }
  @{ Key = "vivaldi";  Name = "Vivaldi";        Page = "vivaldi://extensions"; Data = "$LA\Vivaldi\User Data"
     Exe = @("$LA\Vivaldi\Application\vivaldi.exe", "$PF\Vivaldi\Application\vivaldi.exe") }
  @{ Key = "opera";    Name = "Opera";          Page = "opera://extensions";  Data = "$RA\Opera Software\Opera Stable"
     Exe = @("$LA\Programs\Opera\opera.exe", "$LA\Programs\Opera\launcher.exe", "$PF\Opera\opera.exe") }
  @{ Key = "operagx";  Name = "Opera GX";       Page = "opera://extensions";  Data = "$RA\Opera Software\Opera GX Stable"
     Exe = @("$LA\Programs\Opera GX\opera.exe", "$LA\Programs\Opera GX\launcher.exe") }
  @{ Key = "yandex";   Name = (T "Яндекс Браузер" "Yandex Browser"); Page = "browser://extensions"; Data = "$LA\Yandex\YandexBrowser\User Data"
     Exe = @("$LA\Yandex\YandexBrowser\Application\browser.exe", "$PF\Yandex\YandexBrowser\Application\browser.exe") }
  @{ Key = "chromium"; Name = "Chromium";       Page = "chrome://extensions";  Data = "$LA\Chromium\User Data"
     Exe = @("$LA\Chromium\Application\chrome.exe", "$PF\Chromium\Application\chrome.exe") }
  @{ Key = "thorium";  Name = "Thorium";        Page = "chrome://extensions";  Data = "$LA\Thorium\User Data"
     Exe = @("$LA\Thorium\Application\thorium.exe", "$PF\Thorium\Application\thorium.exe") }
)

function Find-Browsers {
  $out = @()
  foreach ($b in $BrowserDefs) {
    $exe = $null
    foreach ($p in $b.Exe) { if ($p -and (Test-Path -LiteralPath $p)) { $exe = $p; break } }
    $out += [pscustomobject]@{ Key = $b.Key; Name = $b.Name; Page = $b.Page; Data = $b.Data; Exe = $exe; Found = [bool]$exe; Connected = $false }
  }
  foreach ($b in $out) { if ($b.Found) { $b.Connected = Test-Connected $b } }
  return $out
}

# подключено ли уже расширение: путь к нему записан в настройках профиля браузера
function Test-Connected($b) {
  if (-not (Test-Path -LiteralPath $b.Data)) { return $false }
  $needle = (Join-Path $Dest "extension").ToLower().Replace("\", "\\")
  $dirs = @($b.Data) + @(Get-ChildItem -LiteralPath $b.Data -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -eq "Default" -or $_.Name -like "Profile *" } | ForEach-Object { $_.FullName })
  foreach ($d in $dirs) {
    foreach ($f in @("Secure Preferences", "Preferences")) {
      $p = Join-Path $d $f
      if (Test-Path -LiteralPath $p) {
        try {
          if ([IO.File]::ReadAllText($p).ToLower().Contains($needle)) { return $true }
        } catch {}
      }
    }
  }
  return $false
}

# ---------------------------------------------------------------- цвета Windows
function Get-WindowsAccent {
  try {
    $v = (Get-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\DWM" -Name AccentColor -ErrorAction Stop).AccentColor
    # DWORD 0xAABBGGRR; PowerShell читает его как Int32 (может быть отрицательным)
    $n = [uint32]([int64]$v -band [int64]4294967295)
    $r = $n -band 0xFF; $g = ($n -shr 8) -band 0xFF; $b = ($n -shr 16) -band 0xFF
    return ("#{0:X2}{1:X2}{2:X2}" -f $r, $g, $b)
  } catch { return "#4C9AFF" }
}
function Test-WindowsLight {
  try { return ((Get-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize" -Name AppsUseLightTheme -ErrorAction Stop).AppsUseLightTheme -eq 1) } catch { return $false }
}
function Get-OnColor($hex) {
  $n = [Convert]::ToInt32($hex.TrimStart('#'), 16)
  $r = ($n -shr 16) -band 255; $g = ($n -shr 8) -band 255; $b = $n -band 255
  if ((0.299 * $r + 0.587 * $g + 0.114 * $b) -gt 160) { return "#000000" } else { return "#FFFFFF" }
}

# ---------------------------------------------------------------- выбор пользователя
function New-Options {
  $f = $Features.ToLower().Split(",") | ForEach-Object { $_.Trim() }
  return @{
    Theme = $(if ($ThemeIds -contains $Theme) { $Theme } else { "oneui" })
    Mode = $Mode; Accent = $Accent; Wall = "theme"; WallFile = ""
    NowBar = $f -contains "nowbar"; CallBar = $f -contains "callbar"; Pdf = $f -contains "pdf"; Switcher = $f -contains "switcher"
    Tiles = $f -contains "tiles"; Live = $f -contains "live"; Square = $f -contains "square"
    Browsers = @()
  }
}
function Set-WallOption($o, $value) {
  if (-not $value -or $value -eq "theme") { $o.Wall = "theme"; $o.WallFile = ""; return }
  if ($WallPresets.Contains($value)) { $o.Wall = $value; $o.WallFile = ""; return }
  if ((Test-Path -LiteralPath $value) -and $WallTypes.Contains([IO.Path]::GetExtension($value).ToLower())) { $o.Wall = "custom"; $o.WallFile = $value; return }
  Say ((T "  ! обои не найдены: " "  ! wallpaper not found: ") + $value) Yellow
}

# какой тема-пакет рамки нужен: тёмный или светлый вариант
function Get-PackId($o) {
  $t = $ThemeList | Where-Object { $_.id -eq $o.Theme } | Select-Object -First 1
  if ($t.scheme -ne "both") { return $o.Theme }
  $light = ($o.Mode -eq "light") -or ($o.Mode -eq "auto" -and (Test-WindowsLight))
  if ($light) { return $o.Theme + "-light" } else { return $o.Theme }
}

# ---------------------------------------------------------------- установка
function Copy-Dir($from, $to) {
  if (Test-Path -LiteralPath $to) { Remove-Item -LiteralPath $to -Recurse -Force }
  New-Item -ItemType Directory -Force -Path $to | Out-Null
  Copy-Item -Path (Join-Path $from "*") -Destination $to -Recurse -Force
}

# ---------------------------------------------------------------- верх браузера в цвет темы
# Помощник (native messaging) ставит политику BrowserThemeColor в HKCU — Chrome, Brave и Chromium
# красят вкладки и адресную строку сами при каждой смене темы. Без прав администратора.
$HostName = "com.handdesign.host"
$HostKeys = @(
  "HKCU:\Software\Google\Chrome\NativeMessagingHosts", "HKCU:\Software\BraveSoftware\Brave-Browser\NativeMessagingHosts",
  "HKCU:\Software\Chromium\NativeMessagingHosts", "HKCU:\Software\Microsoft\Edge\NativeMessagingHosts",
  "HKCU:\Software\Vivaldi\NativeMessagingHosts", "HKCU:\Software\Yandex\YandexBrowser\NativeMessagingHosts"
)
$PolicyKeys = @("HKCU:\Software\Policies\Google\Chrome", "HKCU:\Software\Policies\BraveSoftware\Brave", "HKCU:\Software\Policies\Chromium")

# ID распакованного расширения = SHA-256 пути (UTF-16, буква диска заглавная), первые 32 цифры → a…p
function Get-UnpackedId([string]$path) {
  $p = $path.TrimEnd("\")
  if ($p -match '^[a-z]:') { $p = $p.Substring(0, 1).ToUpper() + $p.Substring(1) }
  $h = [Security.Cryptography.SHA256]::Create().ComputeHash([Text.Encoding]::Unicode.GetBytes($p))
  return -join ($h[0..15] | ForEach-Object { [char](97 + ($_ -shr 4)); [char](97 + ($_ -band 15)) })
}

function Register-Host($extDir) {
  $dir = Join-Path $Dest "host"
  Copy-Dir (Join-Path $Here "host") $dir
  $ids = @(Get-UnpackedId $extDir)
  $mf = [ordered]@{
    name = $HostName; description = "Hand Design helper: browser frame color"
    path = (Join-Path $dir "hd-host.cmd"); type = "stdio"
    allowed_origins = @($ids | ForEach-Object { "chrome-extension://$_/" })
  }
  $mfPath = Join-Path $dir "$HostName.json"
  [IO.File]::WriteAllText($mfPath, ($mf | ConvertTo-Json -Depth 4), $Utf8)
  foreach ($k in $HostKeys) {
    try { New-Item -Path "$k\$HostName" -Value $mfPath -Force | Out-Null } catch { Write-Log ("host key: " + $_.Exception.Message) }
  }
  Say ((T "  ✓ верх браузера в цвет темы (Chrome, Brave, Chromium), ID " "  ✓ browser frame in theme color (Chrome, Brave, Chromium), ID ") + ($ids -join ", ")) Green
}

function Unregister-Host {
  foreach ($k in $HostKeys) { Remove-Item -Path "$k\$HostName" -Force -ErrorAction SilentlyContinue }
  foreach ($k in $PolicyKeys) {
    if (Test-Path -LiteralPath $k) {
      Remove-ItemProperty -LiteralPath $k -Name "BrowserThemeColor" -ErrorAction SilentlyContinue
      $key = Get-Item -LiteralPath $k
      if ($key.ValueCount -eq 0 -and $key.SubKeyCount -eq 0) { Remove-Item -LiteralPath $k -Force -ErrorAction SilentlyContinue }
    }
  }
}

function Install-HandDesign($o) {
  Say ""
  Say ("Hand Design for Chromium " + $Version) White
  Say ((T "Папка: " "Folder: ") + $Dest)
  New-Item -ItemType Directory -Force -Path $Dest | Out-Null
  try {
    Copy-Dir (Join-Path $Here "extension") (Join-Path $Dest "extension")
  } catch {
    throw (T "Не получилось обновить файлы расширения — закройте браузер и запустите установщик ещё раз. " "Could not update the extension files — close the browser and run the installer again. ") + $_.Exception.Message
  }
  # pdf.js (286 файлов) лежит архивом — распаковываем на месте
  $pdfZip = Join-Path $Dest "extension\pdf\lib.zip"
  if (Test-Path -LiteralPath $pdfZip) {
    Expand-Archive -LiteralPath $pdfZip -DestinationPath (Join-Path $Dest "extension\pdf\lib") -Force
    Remove-Item -LiteralPath $pdfZip -Force
  }
  Copy-Dir (Join-Path $Here "themes") (Join-Path $Dest "themes")
  try { Register-Host (Join-Path $Dest "extension") } catch { Say ((T "  ! помощник для верха браузера не зарегистрирован: " "  ! frame helper not registered: ") + $_.Exception.Message) Yellow }
  Remove-Item -LiteralPath (Join-Path $Dest "themes\themes.json") -Force -ErrorAction SilentlyContinue

  # рамка браузера: выбранный тема-пакет в постоянной папке frame — после смены темы достаточно перезапустить браузер
  $pack = Get-PackId $o
  $frame = Join-Path $Dest "frame"
  Copy-Dir (Join-Path $Here "themes\$pack") $frame
  $mf = Join-Path $frame "manifest.json"
  $m = Get-Content -LiteralPath $mf -Raw -Encoding UTF8 | ConvertFrom-Json
  $tname = ($ThemeList | Where-Object { $_.id -eq $o.Theme } | Select-Object -First 1).name
  $m.name = (T "Hand Design — рамка браузера" "Hand Design — browser frame")
  $m.description = (T "Цвета вкладок и адресной строки. Тема: " "Tab and address bar colors. Theme: ") + $tname
  [IO.File]::WriteAllText($mf, ($m | ConvertTo-Json -Depth 8), $Utf8)

  # Vivaldi: CSS той же темы (опытная функция)
  $viv = Join-Path $Dest "vivaldi"
  if (Test-Path -LiteralPath $viv) { Remove-Item -LiteralPath $viv -Recurse -Force }
  New-Item -ItemType Directory -Force -Path $viv | Out-Null
  Copy-Item -LiteralPath (Join-Path $Here "vivaldi\$pack.css") -Destination (Join-Path $viv "hand-design.css") -Force

  # своя картинка для обоев — рядом с расширением, его фоновый скрипт заберёт её при запуске
  $wallFile = ""
  if ($o.Wall -eq "custom" -and $o.WallFile) {
    $wallFile = "wallpaper" + [IO.Path]::GetExtension($o.WallFile).ToLower()
    Copy-Item -LiteralPath $o.WallFile -Destination (Join-Path $Dest "extension\$wallFile") -Force
  }

  # settings.json: расширение применит эти настройки при следующем запуске браузера
  $win = Get-WindowsAccent
  $s = [ordered]@{
    theme = $o.Theme; mode = $o.Mode; sysAccent = $win; lang = $(if ($Ru) { "ru" } else { "en" })
    showNowBar = [bool]$o.NowBar; showCallBar = [bool]$o.CallBar; pdf = [bool]$o.Pdf; switcher = [bool]$o.Switcher
    tiles = [bool]$o.Tiles; wallLive = [bool]$o.Live; square = [bool]$o.Square
  }
  if ($o.Wall -ne "custom") { $s.wall = $o.Wall }
  if ($o.Accent -eq "windows") { $s.accent = $win }
  elseif ($o.Accent -match '^#[0-9a-fA-F]{6}$') { $s.accent = $o.Accent.ToUpper() }
  else { $s.accent = $null }
  $j = [ordered]@{ rev = [guid]::NewGuid().ToString(); version = $Version; installDir = $Dest; wallFile = $wallFile; settings = $s }
  [IO.File]::WriteAllText((Join-Path $Dest "extension\settings.json"), ($j | ConvertTo-Json -Depth 5), $Utf8)
  [IO.File]::WriteAllText((Join-Path $Dest "VERSION"), $Version, $Utf8)
  Copy-Item -LiteralPath (Join-Path $Here "installer.ps1") -Destination (Join-Path $Dest "installer.ps1") -Force

  Say ((T "  ✓ расширение: " "  ✓ extension: ") + (Join-Path $Dest "extension")) Green
  Say ((T "  ✓ рамка (тема " "  ✓ frame (theme ") + $tname + "): " + $frame) Green
  return @{ Ext = (Join-Path $Dest "extension"); Frame = $frame; Vivaldi = $viv; Pack = $pack }
}

function Uninstall-HandDesign {
  Unregister-Host
  if (Test-Path -LiteralPath $Dest) {
    Remove-Item -LiteralPath $Dest -Recurse -Force
    Say ((T "Папка удалена: " "Folder removed: ") + $Dest) Green
  } else {
    Say (T "Hand Design for Chromium не найден — удалять нечего." "Hand Design for Chromium is not installed.") Yellow
  }
}

function Open-ExtensionsPage($b) {
  try {
    if ($b.Exe) { Start-Process -FilePath $b.Exe -ArgumentList $b.Page; return $true }
  } catch {}
  return $false
}

# ---------------------------------------------------------------- режим без окна
if (-not $Gui) {
  $o = New-Options
  if ($Action -eq "uninstall") {
    Say (T "Сначала удалите «Hand Design» и «Hand Design — рамка браузера» на странице расширений браузера." "First remove “Hand Design” and “Hand Design — browser frame” on the browser's extensions page.") Yellow
    Uninstall-HandDesign
    exit 0
  }
  Set-WallOption $o $Wall
  $r = Install-HandDesign $o
  $found = Find-Browsers | Where-Object { $_.Found }
  if ($Browsers -ne "ask" -and $Browsers -ne "all") {
    $want = $Browsers.ToLower().Split(",") | ForEach-Object { $_.Trim() }
    $found = $found | Where-Object { $want -contains $_.Key }
  }
  Say ""
  Say (T "Подключите в браузере (один раз):" "Connect in the browser (once):") White
  Say (T "  1. Откройте страницу расширений и включите «Режим разработчика»." "  1. Open the extensions page and turn on “Developer mode”.")
  Say ((T "  2. «Загрузить распакованное» → папка " "  2. “Load unpacked” → folder ") + $r.Ext)
  Say ((T "  3. Только Edge, Opera, Яндекс: ещё раз «Загрузить распакованное» → папка " "  3. Edge, Opera, Yandex only: “Load unpacked” again → folder ") + $r.Frame + (T " (рамка; Chrome, Brave, Chromium красятся сами)" " (frame; Chrome, Brave, Chromium are painted automatically)"))
  foreach ($b in $found) {
    $state = $(if ($b.Connected) { T "уже подключён — перезапустите браузер" "already connected — restart the browser" } else { $b.Page })
    Say ("  • " + $b.Name + ": " + $state)
  }
  exit 0
}

# ================================================================ окно
Add-Type -AssemblyName PresentationFramework, PresentationCore, WindowsBase, System.Windows.Forms
Write-Log "окно: сборки загружены"
# ошибки внутри кнопок окна — тоже показываем
[Windows.Threading.Dispatcher]::CurrentDispatcher.Add_UnhandledException({ param($s, $e) $e.Handled = $true; Show-Fatal $e.Exception })

# ---------- язык ----------
if ($Lang -eq "ask") {
  [xml]$lx = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation" xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Hand Design" Width="420" SizeToContent="Height" WindowStartupLocation="CenterScreen" ResizeMode="NoResize"
        Background="#1C1D21" Topmost="True">
  <Border Padding="24">
    <StackPanel>
      <TextBlock Text="Hand Design for Chromium" Foreground="White" FontSize="22" FontWeight="SemiBold" FontFamily="Segoe UI Variable Display, Segoe UI"/>
      <TextBlock Text="Выберите язык  ·  Choose your language" Foreground="#99FFFFFF" FontSize="13" Margin="0,4,0,22" FontFamily="Segoe UI"/>
      <UniformGrid Columns="2">
        <Button x:Name="RuBtn" Height="64" Margin="0,0,6,0" Cursor="Hand">
          <Button.Template><ControlTemplate TargetType="Button">
            <Border x:Name="B" CornerRadius="8" Background="#1AFFFFFF">
              <StackPanel VerticalAlignment="Center" HorizontalAlignment="Center">
                <TextBlock Text="Русский" Foreground="White" FontSize="17" FontWeight="SemiBold" HorizontalAlignment="Center" FontFamily="Segoe UI"/>
                <TextBlock Text="RU" Foreground="#80FFFFFF" FontSize="11" HorizontalAlignment="Center" FontFamily="Segoe UI"/>
              </StackPanel>
            </Border>
            <ControlTemplate.Triggers><Trigger Property="IsMouseOver" Value="True"><Setter TargetName="B" Property="Background" Value="#33FFFFFF"/></Trigger></ControlTemplate.Triggers>
          </ControlTemplate></Button.Template>
        </Button>
        <Button x:Name="EnBtn" Height="64" Margin="6,0,0,0" Cursor="Hand">
          <Button.Template><ControlTemplate TargetType="Button">
            <Border x:Name="B" CornerRadius="8" Background="#1AFFFFFF">
              <StackPanel VerticalAlignment="Center" HorizontalAlignment="Center">
                <TextBlock Text="English" Foreground="White" FontSize="17" FontWeight="SemiBold" HorizontalAlignment="Center" FontFamily="Segoe UI"/>
                <TextBlock Text="EN" Foreground="#80FFFFFF" FontSize="11" HorizontalAlignment="Center" FontFamily="Segoe UI"/>
              </StackPanel>
            </Border>
            <ControlTemplate.Triggers><Trigger Property="IsMouseOver" Value="True"><Setter TargetName="B" Property="Background" Value="#33FFFFFF"/></Trigger></ControlTemplate.Triggers>
          </ControlTemplate></Button.Template>
        </Button>
      </UniformGrid>
    </StackPanel>
  </Border>
</Window>
"@
  $lw = [Windows.Markup.XamlReader]::Load((New-Object System.Xml.XmlNodeReader $lx))
  $script:picked = $null
  $lw.FindName("RuBtn").Add_Click({ $script:picked = "ru"; $lw.Close() })
  $lw.FindName("EnBtn").Add_Click({ $script:picked = "en"; $lw.Close() })
  [void]$lw.ShowDialog()
  if (-not $script:picked) { Write-Log "язык не выбран — выход"; exit 0 }
  Write-Log ("язык: " + $script:picked)
  $Ru = ($script:picked -eq "ru")
  # подписи с T(...) выше считались до выбора языка — пересчитываем
  $WallPresets.aurora.Name = T "Аврора" "Aurora"; $WallPresets.iris.Name = T "Ирис" "Iris"; $WallPresets.sunset.Name = T "Закат" "Sunset"
  $WallPresets.ocean.Name = T "Океан" "Ocean"; $WallPresets.forest.Name = T "Лес" "Forest"; $WallPresets.night.Name = T "Ночь" "Night"
  $WallPresets.rose.Name = T "Пудра" "Rose"; $WallPresets.graphite.Name = T "Графит" "Graphite"; $WallPresets.dune.Name = T "Дюна" "Dune"
  ($BrowserDefs | Where-Object { $_.Key -eq "yandex" }).Name = T "Яндекс Браузер" "Yandex Browser"
}

$o = New-Options
Set-WallOption $o $Wall
Write-Log "поиск браузеров…"
$Detected = Find-Browsers
Write-Log ("браузеры: " + (($Detected | Where-Object { $_.Found } | ForEach-Object { $_.Key }) -join ", "))

[xml]$xaml = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Hand Design for Chromium" Width="560" SizeToContent="Height" WindowStartupLocation="CenterScreen"
        ResizeMode="CanMinimize" Background="#1C1D21"
        FontFamily="Segoe UI Variable Display, Segoe UI" UseLayoutRounding="True" TextOptions.TextFormattingMode="Display">
  <Window.Resources>
    <SolidColorBrush x:Key="Accent" Color="#4C9AFF"/>
    <SolidColorBrush x:Key="Ink" Color="#FFFFFFFF"/>
    <SolidColorBrush x:Key="Muted" Color="#99EBEBF5"/>
    <SolidColorBrush x:Key="Rim" Color="#1FFFFFFF"/>
    <SolidColorBrush x:Key="Sheen" Color="#0AFFFFFF"/>
    <Style x:Key="Cell" TargetType="Border">
      <Setter Property="CornerRadius" Value="8"/><Setter Property="Background" Value="{StaticResource Sheen}"/>
      <Setter Property="BorderBrush" Value="{StaticResource Rim}"/><Setter Property="BorderThickness" Value="1"/>
    </Style>
    <Style x:Key="Caption" TargetType="TextBlock">
      <Setter Property="Foreground" Value="{StaticResource Muted}"/><Setter Property="FontSize" Value="12"/>
      <Setter Property="FontWeight" Value="SemiBold"/><Setter Property="Margin" Value="16,16,0,7"/>
    </Style>
    <Style x:Key="Switch" TargetType="CheckBox">
      <Setter Property="Cursor" Value="Hand"/><Setter Property="VerticalAlignment" Value="Center"/>
      <Setter Property="Template">
        <Setter.Value>
          <ControlTemplate TargetType="CheckBox">
            <Border x:Name="Track" Width="44" Height="24" CornerRadius="12" Background="#33FFFFFF">
              <Ellipse x:Name="Knob" Width="18" Height="18" Fill="White" Margin="3,0,0,0" HorizontalAlignment="Left" VerticalAlignment="Center">
                <Ellipse.RenderTransform><TranslateTransform x:Name="KnobMove" X="0"/></Ellipse.RenderTransform>
              </Ellipse>
            </Border>
            <ControlTemplate.Triggers>
              <Trigger Property="IsChecked" Value="True">
                <Setter TargetName="Track" Property="Background" Value="{DynamicResource Accent}"/>
                <Trigger.EnterActions><BeginStoryboard><Storyboard>
                  <DoubleAnimation Storyboard.TargetName="KnobMove" Storyboard.TargetProperty="X" To="20" Duration="0:0:0.12"/>
                </Storyboard></BeginStoryboard></Trigger.EnterActions>
                <Trigger.ExitActions><BeginStoryboard><Storyboard>
                  <DoubleAnimation Storyboard.TargetName="KnobMove" Storyboard.TargetProperty="X" To="0" Duration="0:0:0.12"/>
                </Storyboard></BeginStoryboard></Trigger.ExitActions>
              </Trigger>
              <Trigger Property="IsEnabled" Value="False"><Setter TargetName="Track" Property="Opacity" Value="0.35"/></Trigger>
            </ControlTemplate.Triggers>
          </ControlTemplate>
        </Setter.Value>
      </Setter>
    </Style>
    <Style x:Key="Seg" TargetType="RadioButton">
      <Setter Property="Foreground" Value="White"/><Setter Property="FontSize" Value="13"/><Setter Property="FontWeight" Value="SemiBold"/><Setter Property="Cursor" Value="Hand"/>
      <Setter Property="Template">
        <Setter.Value>
          <ControlTemplate TargetType="RadioButton">
            <Border x:Name="B" CornerRadius="6" Background="Transparent" Padding="4,8">
              <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/>
            </Border>
            <ControlTemplate.Triggers>
              <Trigger Property="IsChecked" Value="True"><Setter TargetName="B" Property="Background" Value="#33FFFFFF"/></Trigger>
            </ControlTemplate.Triggers>
          </ControlTemplate>
        </Setter.Value>
      </Setter>
    </Style>
    <Style x:Key="ThemeCard" TargetType="RadioButton">
      <Setter Property="Cursor" Value="Hand"/><Setter Property="Margin" Value="4"/>
      <Setter Property="Template">
        <Setter.Value>
          <ControlTemplate TargetType="RadioButton">
            <Border x:Name="B" CornerRadius="8" BorderThickness="2" BorderBrush="Transparent" Background="#0AFFFFFF" Padding="5">
              <ContentPresenter/>
            </Border>
            <ControlTemplate.Triggers>
              <Trigger Property="IsChecked" Value="True"><Setter TargetName="B" Property="BorderBrush" Value="{DynamicResource Accent}"/><Setter TargetName="B" Property="Background" Value="#24FFFFFF"/></Trigger>
              <Trigger Property="IsMouseOver" Value="True"><Setter TargetName="B" Property="Background" Value="#22FFFFFF"/></Trigger>
            </ControlTemplate.Triggers>
          </ControlTemplate>
        </Setter.Value>
      </Setter>
    </Style>
    <Style x:Key="Chip" TargetType="RadioButton">
      <Setter Property="Cursor" Value="Hand"/><Setter Property="Margin" Value="0,0,8,8"/>
      <Setter Property="Template">
        <Setter.Value>
          <ControlTemplate TargetType="RadioButton">
            <Grid Width="{TemplateBinding Width}" Height="{TemplateBinding Height}">
              <Border x:Name="Ring" CornerRadius="12" BorderBrush="Transparent" BorderThickness="2"/>
              <Border Margin="4" CornerRadius="9" Background="{TemplateBinding Background}">
                <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/>
              </Border>
            </Grid>
            <ControlTemplate.Triggers>
              <Trigger Property="IsChecked" Value="True"><Setter TargetName="Ring" Property="BorderBrush" Value="White"/></Trigger>
            </ControlTemplate.Triggers>
          </ControlTemplate>
        </Setter.Value>
      </Setter>
    </Style>
    <Style x:Key="Primary" TargetType="Button">
      <Setter Property="Foreground" Value="White"/><Setter Property="FontSize" Value="15"/><Setter Property="FontWeight" Value="SemiBold"/><Setter Property="Cursor" Value="Hand"/>
      <Setter Property="Template">
        <Setter.Value>
          <ControlTemplate TargetType="Button">
            <Grid Height="44">
              <Border x:Name="Bg" CornerRadius="8" Background="{DynamicResource Accent}"/>
              <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/>
            </Grid>
            <ControlTemplate.Triggers>
              <Trigger Property="IsMouseOver" Value="True"><Setter TargetName="Bg" Property="Opacity" Value="0.88"/></Trigger>
              <Trigger Property="IsEnabled" Value="False"><Setter Property="Opacity" Value="0.5"/></Trigger>
            </ControlTemplate.Triggers>
          </ControlTemplate>
        </Setter.Value>
      </Setter>
    </Style>
    <Style x:Key="Ghost" TargetType="Button">
      <Setter Property="Foreground" Value="White"/><Setter Property="FontSize" Value="13"/><Setter Property="FontWeight" Value="SemiBold"/><Setter Property="Cursor" Value="Hand"/>
      <Setter Property="Template">
        <Setter.Value>
          <ControlTemplate TargetType="Button">
            <Border x:Name="B" CornerRadius="6" Background="#1AFFFFFF" Padding="14,8">
              <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/>
            </Border>
            <ControlTemplate.Triggers>
              <Trigger Property="IsMouseOver" Value="True"><Setter TargetName="B" Property="Background" Value="#2EFFFFFF"/></Trigger>
              <Trigger Property="IsEnabled" Value="False"><Setter Property="Opacity" Value="0.4"/></Trigger>
            </ControlTemplate.Triggers>
          </ControlTemplate>
        </Setter.Value>
      </Setter>
    </Style>
    <Style x:Key="Step" TargetType="Button">
      <Setter Property="Foreground" Value="{StaticResource Muted}"/><Setter Property="FontSize" Value="13"/><Setter Property="FontWeight" Value="SemiBold"/><Setter Property="Cursor" Value="Hand"/>
      <Setter Property="Template">
        <Setter.Value>
          <ControlTemplate TargetType="Button">
            <Border x:Name="B" Background="Transparent" CornerRadius="6" Padding="10,7"><ContentPresenter HorizontalAlignment="Center"/></Border>
            <ControlTemplate.Triggers><Trigger Property="IsMouseOver" Value="True"><Setter TargetName="B" Property="Background" Value="#14FFFFFF"/></Trigger></ControlTemplate.Triggers>
          </ControlTemplate>
        </Setter.Value>
      </Setter>
    </Style>
  </Window.Resources>

  <Border>
    <Grid>
      <StackPanel Margin="24,18,24,22">
        <!-- шапка -->
        <Grid x:Name="DragArea" Background="Transparent">
          <Button x:Name="CloseBtn" HorizontalAlignment="Right" VerticalAlignment="Top" Width="32" Height="32" Cursor="Hand" Visibility="Collapsed">
            <Button.Template>
              <ControlTemplate TargetType="Button">
                <Border x:Name="B" CornerRadius="16" Background="#1AFFFFFF" BorderBrush="{StaticResource Rim}" BorderThickness="1">
                  <TextBlock Text="✕" Foreground="#CCFFFFFF" FontSize="12" HorizontalAlignment="Center" VerticalAlignment="Center"/>
                </Border>
                <ControlTemplate.Triggers><Trigger Property="IsMouseOver" Value="True"><Setter TargetName="B" Property="Background" Value="#E0FF453A"/></Trigger></ControlTemplate.Triggers>
              </ControlTemplate>
            </Button.Template>
          </Button>
          <StackPanel Orientation="Horizontal" Margin="0,6,0,0">
            <Border Width="44" Height="44" CornerRadius="8" Background="{DynamicResource Accent}">
              <TextBlock Text="H" Foreground="White" FontSize="22" FontWeight="Bold" HorizontalAlignment="Center" VerticalAlignment="Center"/>
            </Border>
            <StackPanel Margin="14,0,0,0" VerticalAlignment="Center">
              <StackPanel Orientation="Horizontal">
                <TextBlock Text="Hand Design" Foreground="{StaticResource Ink}" FontSize="22" FontWeight="SemiBold"/>
                <Border CornerRadius="4" Background="#1AFFFFFF" Padding="6,1" Margin="10,0,0,0" VerticalAlignment="Center">
                  <TextBlock x:Name="VersionLabel" Foreground="{StaticResource Muted}" FontSize="12" FontWeight="SemiBold"/>
                </Border>
              </StackPanel>
              <TextBlock x:Name="Subtitle" Foreground="{StaticResource Muted}" FontSize="13.5"/>
            </StackPanel>
          </StackPanel>
        </Grid>

        <Border x:Name="Steps" Style="{StaticResource Cell}" Padding="3" Margin="0,16,0,0">
          <UniformGrid Columns="3">
            <Button x:Name="Step1" Style="{StaticResource Step}"/>
            <Button x:Name="Step2" Style="{StaticResource Step}"/>
            <Button x:Name="Step3" Style="{StaticResource Step}"/>
          </UniformGrid>
        </Border>

        <Grid>
          <!-- 1. тема и обои -->
          <StackPanel x:Name="Page1">
            <TextBlock x:Name="ThemeCaption" Style="{StaticResource Caption}"/>
            <UniformGrid x:Name="ThemeGrid" Columns="6" Margin="-4,0,-4,0"/>
            <TextBlock x:Name="ThemeHint" Foreground="{StaticResource Muted}" FontSize="13" Margin="16,6,16,0" TextWrapping="Wrap"/>
            <TextBlock x:Name="WallCaption" Style="{StaticResource Caption}"/>
            <Border Style="{StaticResource Cell}" Padding="12,12,4,4">
              <WrapPanel x:Name="WallChips"/>
            </Border>
          </StackPanel>

          <!-- 2. вид и функции -->
          <StackPanel x:Name="Page2" Visibility="Collapsed">
            <TextBlock x:Name="ModeCaption" Style="{StaticResource Caption}"/>
            <Border Style="{StaticResource Cell}" Padding="3">
              <UniformGrid Columns="3">
                <RadioButton x:Name="ModeAuto" GroupName="Mode" Style="{StaticResource Seg}"/>
                <RadioButton x:Name="ModeLight" GroupName="Mode" Style="{StaticResource Seg}"/>
                <RadioButton x:Name="ModeDark" GroupName="Mode" Style="{StaticResource Seg}"/>
              </UniformGrid>
            </Border>
            <TextBlock x:Name="AccentCaption" Style="{StaticResource Caption}"/>
            <Border Style="{StaticResource Cell}" Padding="12,12,4,4">
              <WrapPanel x:Name="AccentChips"/>
            </Border>
            <TextBlock x:Name="FeatCaption" Style="{StaticResource Caption}"/>
            <Border Style="{StaticResource Cell}" Padding="16,4,14,4">
              <StackPanel x:Name="FeatList"/>
            </Border>
          </StackPanel>

          <!-- 3. браузеры -->
          <StackPanel x:Name="Page3" Visibility="Collapsed">
            <TextBlock x:Name="BrCaption" Style="{StaticResource Caption}"/>
            <Border Style="{StaticResource Cell}" Padding="16,4,14,4">
              <StackPanel x:Name="BrList"/>
            </Border>
            <TextBlock x:Name="BrHint" Foreground="{StaticResource Muted}" FontSize="12.5" Margin="16,10,16,0" TextWrapping="Wrap"/>
          </StackPanel>

          <!-- 4. подключение -->
          <StackPanel x:Name="Page4" Visibility="Collapsed">
            <TextBlock x:Name="DoneTitle" Foreground="{StaticResource Ink}" FontSize="19" FontWeight="Bold" Margin="4,18,0,4"/>
            <TextBlock x:Name="DoneText" Foreground="{StaticResource Muted}" FontSize="13" Margin="4,0,4,8" TextWrapping="Wrap"/>
            <Border Style="{StaticResource Cell}" Padding="16,12">
              <StackPanel>
                <TextBlock x:Name="HowTitle" Foreground="{StaticResource Ink}" FontSize="14" FontWeight="SemiBold" Margin="0,0,0,6"/>
                <TextBlock x:Name="HowSteps" Foreground="#DDFFFFFF" FontSize="13" TextWrapping="Wrap" LineHeight="21"/>
                <WrapPanel Margin="0,10,0,0">
                  <Button x:Name="CopyExt" Style="{StaticResource Ghost}" Margin="0,0,8,8"/>
                  <Button x:Name="CopyFrame" Style="{StaticResource Ghost}" Margin="0,0,8,8"/>
                  <Button x:Name="CopyPage" Style="{StaticResource Ghost}" Margin="0,0,8,8"/>
                  <Button x:Name="OpenFolder" Style="{StaticResource Ghost}" Margin="0,0,8,8"/>
                </WrapPanel>
              </StackPanel>
            </Border>
            <StackPanel x:Name="ConnList" Margin="0,10,0,0"/>
          </StackPanel>
        </Grid>

        <Grid Margin="0,18,0,0">
          <Grid.ColumnDefinitions><ColumnDefinition Width="Auto"/><ColumnDefinition Width="*"/></Grid.ColumnDefinitions>
          <Button x:Name="BackBtn" Style="{StaticResource Ghost}" Height="50" Padding="0" MinWidth="110" Margin="0,0,10,0"/>
          <Button x:Name="NextBtn" Grid.Column="1" Style="{StaticResource Primary}"/>
        </Grid>
        <TextBlock x:Name="Status" Foreground="#FF9F0A" FontSize="12.5" Margin="6,10,6,0" TextWrapping="Wrap" Visibility="Collapsed"/>
      </StackPanel>
    </Grid>
  </Border>
</Window>
"@

Write-Log "окно: разметка…"
$w = [Windows.Markup.XamlReader]::Load((New-Object System.Xml.XmlNodeReader $xaml))
# тёмный заголовок окна (Windows 10 20H1+ и 11); на старых остаётся светлый
try {
  if (-not ("HandDesign.Dwm" -as [type])) {
    Add-Type -Namespace HandDesign -Name Dwm -MemberDefinition '[System.Runtime.InteropServices.DllImport("dwmapi.dll")] public static extern int DwmSetWindowAttribute(System.IntPtr hwnd, int attr, ref int value, int size);'
  }
  $hwnd = (New-Object System.Windows.Interop.WindowInteropHelper($w)).EnsureHandle()
  $v = 1; [void][HandDesign.Dwm]::DwmSetWindowAttribute($hwnd, 20, [ref]$v, 4)
} catch {}
Write-Log "окно: разметка загружена"
function G($name) { return $w.FindName($name) }
$bc = [Windows.Media.BrushConverter]::new()
function Brush($hex) { return $bc.ConvertFromString($hex) }
function Grad([string[]]$colors) {
  $g = [Windows.Media.LinearGradientBrush]::new()
  $g.StartPoint = [Windows.Point]::new(0, 0)
  $g.EndPoint = [Windows.Point]::new(1, 1)
  $i = 0
  foreach ($c in $colors) {
    $off = $(if ($colors.Count -gt 1) { $i / ($colors.Count - 1) } else { 0 })
    $g.GradientStops.Add([Windows.Media.GradientStop]::new([Windows.Media.Color][Windows.Media.ColorConverter]::ConvertFromString($c), [double]$off))
    $i++
  }
  return $g
}
function Set-Accent($hex) {
  try {
    $c = [Windows.Media.Color][Windows.Media.ColorConverter]::ConvertFromString($hex)
    # ::new, а не New-Object: New-Object заворачивает кисть в PSObject, и словарь ресурсов
    # хранит обёртку — WPF потом не может привести её к Brush (окно падало при показе)
    $w.Resources["Accent"] = [Windows.Media.SolidColorBrush]::new($c)
  } catch {}
}

(G "VersionLabel").Text = "Chromium · " + $Version
(G "Subtitle").Text = T "Редизайн Chrome, Edge, Brave, Vivaldi, Opera, Яндекс" "A redesign for Chrome, Edge, Brave, Vivaldi, Opera, Yandex"
(G "Step1").Content = T "1  Тема" "1  Theme"
(G "Step2").Content = T "2  Вид" "2  Look"
(G "Step3").Content = T "3  Браузеры" "3  Browsers"
(G "ThemeCaption").Text = T "ТЕМА" "THEME"
(G "WallCaption").Text = T "ОБОИ НОВОЙ ВКЛАДКИ" "NEW TAB WALLPAPER"
(G "ModeCaption").Text = T "СВЕТЛАЯ ИЛИ ТЁМНАЯ" "LIGHT OR DARK"
(G "ModeAuto").Content = T "Как в Windows" "Like Windows"
(G "ModeLight").Content = T "Светлая" "Light"
(G "ModeDark").Content = T "Тёмная" "Dark"
(G "AccentCaption").Text = T "АКЦЕНТ" "ACCENT"
(G "FeatCaption").Text = T "ФУНКЦИИ" "FEATURES"
(G "BrCaption").Text = T "КУДА ПОСТАВИТЬ" "WHERE TO INSTALL"
(G "BrHint").Text = T "Chrome не даёт сторонним программам ставить расширения сами, поэтому после установки браузер попросит два щелчка: «Загрузить распакованное» и папка (путь будет скопирован). Это один раз — дальше обновления подхватываются при перезапуске браузера." "Chrome doesn't let other programs install extensions silently, so after setup the browser needs two clicks: “Load unpacked” and the folder (the path is copied for you). Only once — later updates are picked up when the browser restarts."
(G "BackBtn").Content = T "Назад" "Back"
(G "CloseBtn").Add_Click({ $w.Close() })

# ---------- 1. темы ----------
$script:themeRadios = @{}
function Update-ThemeHint {
  $t = $ThemeList | Where-Object { $_.id -eq $o.Theme } | Select-Object -First 1
  $kind = switch ($t.scheme) { "both" { T "светлая и тёмная" "light and dark" } "light" { T "светлая" "light" } default { T "тёмная" "dark" } }
  (G "ThemeHint").Text = $t.name + "  ·  " + $kind
  if ($o.Accent -eq "theme") { Set-Accent $t.swatch[2] }
}
foreach ($t in $ThemeList) {
  $rb = [Windows.Controls.RadioButton]::new()
  $rb.GroupName = "Theme"
  $rb.Style = $w.Resources["ThemeCard"]
  $rb.ToolTip = $t.name
  $sp = [Windows.Controls.StackPanel]::new()
  $card = [Windows.Controls.Border]::new()
  $card.Height = 40; $card.CornerRadius = [Windows.CornerRadius]::new(10); $card.Background = Brush $t.swatch[0]
  $inner = [Windows.Controls.Grid]::new()
  $bar = [Windows.Controls.Border]::new()
  $bar.Height = 10; $bar.VerticalAlignment = "Top"; $bar.Margin = [Windows.Thickness]::new(6, 6, 6, 0); $bar.CornerRadius = [Windows.CornerRadius]::new(5); $bar.Background = Brush $t.swatch[1]
  $dot = [Windows.Shapes.Ellipse]::new()
  $dot.Width = 12; $dot.Height = 12; $dot.Fill = Brush $t.swatch[2]; $dot.HorizontalAlignment = "Left"; $dot.VerticalAlignment = "Bottom"; $dot.Margin = [Windows.Thickness]::new(7, 0, 0, 6)
  $line = [Windows.Controls.Border]::new()
  $line.Height = 4; $line.Width = 22; $line.CornerRadius = [Windows.CornerRadius]::new(2); $line.Background = Brush $t.swatch[3]; $line.Opacity = 0.7
  $line.HorizontalAlignment = "Left"; $line.VerticalAlignment = "Bottom"; $line.Margin = [Windows.Thickness]::new(24, 0, 0, 10)
  [void]$inner.Children.Add($bar); [void]$inner.Children.Add($dot); [void]$inner.Children.Add($line)
  $card.Child = $inner
  $name = [Windows.Controls.TextBlock]::new()
  $name.Text = $t.name; $name.Foreground = Brush "#DDFFFFFF"; $name.FontSize = 11; $name.Margin = [Windows.Thickness]::new(2, 5, 2, 1)
  $name.TextTrimming = "CharacterEllipsis"; $name.HorizontalAlignment = "Center"
  [void]$sp.Children.Add($card); [void]$sp.Children.Add($name)
  $rb.Content = $sp
  $rb.Tag = $t.id
  $rb.IsChecked = ($t.id -eq $o.Theme)
  $rb.Add_Checked({ param($s) $o.Theme = $s.Tag; Update-ThemeHint })
  [void](G "ThemeGrid").Children.Add($rb)
  $script:themeRadios[$t.id] = $rb
}
Update-ThemeHint

function New-Chip($group, $tag, $bg, $tip, $w0 = 54, $h0 = 38, $text = "") {
  $c = [Windows.Controls.RadioButton]::new()
  $c.GroupName = $group; $c.Style = $w.Resources["Chip"]; $c.Width = $w0; $c.Height = $h0; $c.Background = $bg; $c.ToolTip = $tip; $c.Tag = $tag
  if ($text) {
    $tb = [Windows.Controls.TextBlock]::new()
    $tb.Text = $text; $tb.Foreground = Brush "#FFFFFFFF"; $tb.FontSize = 11; $tb.FontWeight = "SemiBold"
    $c.Content = $tb
  }
  return $c
}
# обои
$wallTheme = New-Chip "Wall" "theme" (Grad @("#3A3D46", "#1C1D22")) (T "Обои выбранной темы" "The theme's wallpaper") 54 38 (T "Тема" "Theme")
$wallTheme.IsChecked = ($o.Wall -eq "theme")
$wallTheme.Add_Checked({ $o.Wall = "theme"; $o.WallFile = "" })
[void](G "WallChips").Children.Add($wallTheme)
foreach ($k in $WallPresets.Keys) {
  $c = New-Chip "Wall" $k (Grad $WallPresets[$k].Colors) $WallPresets[$k].Name
  $c.IsChecked = ($o.Wall -eq $k)
  $c.Add_Checked({ param($s) $o.Wall = $s.Tag; $o.WallFile = "" })
  [void](G "WallChips").Children.Add($c)
}
$wallOwn = New-Chip "Wall" "custom" (Brush "#26FFFFFF") (T "Своя картинка (jpg, png, webp)" "Your own picture (jpg, png, webp)") 54 38 "+"
$wallOwn.IsChecked = ($o.Wall -eq "custom")
$wallOwn.Add_Click({
  $dlg = New-Object Microsoft.Win32.OpenFileDialog
  $dlg.Title = T "Картинка для обоев" "Wallpaper picture"
  $dlg.Filter = (T "Картинки" "Images") + "|*.jpg;*.jpeg;*.png;*.webp;*.gif;*.bmp;*.avif"
  if ($dlg.ShowDialog()) {
    $o.Wall = "custom"; $o.WallFile = $dlg.FileName
    try {
      $img = [Windows.Media.Imaging.BitmapImage]::new()
      $img.BeginInit(); $img.UriSource = New-Object Uri($dlg.FileName); $img.DecodePixelWidth = 120; $img.EndInit()
      $ib = [Windows.Media.ImageBrush]::new($img); $ib.Stretch = "UniformToFill"
      $wallOwn.Background = $ib; $wallOwn.Content = $null
    } catch {}
  } elseif ($o.Wall -ne "custom") { $wallTheme.IsChecked = $true }
})
[void](G "WallChips").Children.Add($wallOwn)

# ---------- 2. вид ----------
switch ($o.Mode) { "light" { (G "ModeLight").IsChecked = $true } "dark" { (G "ModeDark").IsChecked = $true } default { (G "ModeAuto").IsChecked = $true } }
(G "ModeAuto").Add_Checked({ $o.Mode = "auto" })
(G "ModeLight").Add_Checked({ $o.Mode = "light" })
(G "ModeDark").Add_Checked({ $o.Mode = "dark" })

$winAccent = Get-WindowsAccent
$accTheme = New-Chip "Accent" "theme" (Grad @("#FF453A", "#FFD60A", "#30D158", "#0A84FF", "#BF5AF2")) (T "Как в теме" "Theme accent") 40 40
$accTheme.IsChecked = ($o.Accent -eq "theme")
$accTheme.Add_Checked({ $o.Accent = "theme"; Update-ThemeHint })
[void](G "AccentChips").Children.Add($accTheme)
$accWin = New-Chip "Accent" "windows" (Brush $winAccent) ((T "Цвет Windows " "Windows color ") + $winAccent) 40 40 "W"
$accWin.IsChecked = ($o.Accent -eq "windows")
$accWin.Add_Checked({ $o.Accent = "windows"; Set-Accent $winAccent })
[void](G "AccentChips").Children.Add($accWin)
foreach ($c in @("#0A84FF", "#5E5CE6", "#BF5AF2", "#FF4FD8", "#FF453A", "#FF9F0A", "#FFD60A", "#30D158", "#22C3E6")) {
  $ch = New-Chip "Accent" $c (Brush $c) $c 40 40
  $ch.IsChecked = ($o.Accent -eq $c)
  $ch.Add_Checked({ param($s) $o.Accent = $s.Tag; Set-Accent $s.Tag })
  [void](G "AccentChips").Children.Add($ch)
}
$accOwn = New-Chip "Accent" "own" (Brush "#26FFFFFF") (T "Свой цвет" "Custom color") 40 40 "+"
$accOwn.Add_Click({
  $cd = New-Object System.Windows.Forms.ColorDialog
  $cd.FullOpen = $true
  if ($cd.ShowDialog() -eq "OK") {
    $hex = "#{0:X2}{1:X2}{2:X2}" -f $cd.Color.R, $cd.Color.G, $cd.Color.B
    $o.Accent = $hex; $accOwn.Background = Brush $hex; $accOwn.Content = $null; Set-Accent $hex
  } else { $accTheme.IsChecked = $true }
})
[void](G "AccentChips").Children.Add($accOwn)

function Add-Row($panel, $title, $hint, $control, $last = $false) {
  $g = [Windows.Controls.Grid]::new()
  $g.Margin = [Windows.Thickness]::new(0, 10, 0, 10)
  [void]$g.ColumnDefinitions.Add(([Windows.Controls.ColumnDefinition]::new()))
  $cd2 = [Windows.Controls.ColumnDefinition]::new(); $cd2.Width = [Windows.GridLength]::Auto; [void]$g.ColumnDefinitions.Add($cd2)
  $sp = [Windows.Controls.StackPanel]::new()
  $t1 = [Windows.Controls.TextBlock]::new()
  $t1.Text = $title; $t1.Foreground = Brush "#FFFFFFFF"; $t1.FontSize = 14.5; $t1.FontWeight = "SemiBold"
  [void]$sp.Children.Add($t1)
  if ($hint) {
    $t2 = [Windows.Controls.TextBlock]::new()
    $t2.Text = $hint; $t2.Foreground = Brush "#99EBEBF5"; $t2.FontSize = 12; $t2.TextWrapping = "Wrap"; $t2.Margin = [Windows.Thickness]::new(0, 1, 14, 0)
    [void]$sp.Children.Add($t2)
  }
  [void]$g.Children.Add($sp)
  [Windows.Controls.Grid]::SetColumn($control, 1)
  [void]$g.Children.Add($control)
  [void]$panel.Children.Add($g)
  if (-not $last) {
    $ln = [Windows.Controls.Border]::new()
    $ln.Height = 1; $ln.Background = Brush "#14FFFFFF"
    [void]$panel.Children.Add($ln)
  }
}
function New-Switch($checked, $onChange) {
  $cb = [Windows.Controls.CheckBox]::new()
  $cb.Style = $w.Resources["Switch"]; $cb.IsChecked = $checked
  if ($onChange) { $cb.Add_Checked($onChange); $cb.Add_Unchecked($onChange) }
  return $cb
}
$feats = @(
  @("NowBar", "Now Bar", (T "Музыка из другой вкладки: обложка, пауза, следующий трек" "Media from another tab: cover, pause, next")),
  @("CallBar", (T "Плашка звонка" "Call bar"), (T "Звонок в другой вкладке: таймер, микрофон и камера, Alt+Shift+M" "Call in another tab: timer, mic and camera, Alt+Shift+M")),
  @("Pdf", (T "Просмотрщик PDF" "PDF viewer"), (T "Темы, рисование, надписи, маркер, сохранение" "Themes, drawing, text, highlighter, saving")),
  @("Switcher", (T "Вкладки с превью (Alt+Q)" "Tab previews (Alt+Q)"), (T "Переключение по недавним вкладкам с миниатюрами" "Switch recent tabs with thumbnails")),
  @("Tiles", (T "Ярлыки сайтов" "Site shortcuts"), (T "Самые посещаемые сайты на новой вкладке" "Most visited sites on the new tab")),
  @("Live", (T "Живые обои" "Animated wallpaper"), (T "Медленное движение фона новой вкладки" "Slow motion of the new tab background")),
  @("Square", (T "Без скруглений" "No rounded corners"), (T "Совсем ноль: новая вкладка, панель, плашки, PDF" "Zero rounding: new tab, panel, islands, PDF"))
)
$i = 0
foreach ($f in $feats) {
  $key = $f[0]
  $sw = New-Switch ([bool]$o[$key]) ([scriptblock]::Create("param(`$s) `$o['$key'] = [bool]`$s.IsChecked"))
  Add-Row (G "FeatList") $f[1] $f[2] $sw ($i -eq $feats.Count - 1)
  $i++
}

# ---------- 3. браузеры ----------
$script:brSwitches = @{}
$found = @($Detected | Where-Object { $_.Found })
$i = 0
foreach ($b in $Detected) {
  if (-not $b.Found -and $b.Key -in @("operagx", "thorium", "chromium")) { continue }
  $hint = $(if (-not $b.Found) { T "не найден" "not found" } elseif ($b.Connected) { T "уже подключён — обновится после перезапуска браузера" "already connected — updates after a browser restart" } else { T "найден" "found" })
  if ($b.Key -eq "vivaldi" -and $b.Found) { $hint += T " · плюс CSS для всего интерфейса (опытная функция)" " · plus CSS for the whole UI (experimental)" }
  if ($b.Key -like "opera*" -and $b.Found) { $hint += T " · рамку в цвет темы Opera не поддерживает" " · Opera doesn't support frame themes" }
  $sw = New-Switch ([bool]$b.Found) $null
  $sw.IsEnabled = [bool]$b.Found
  $script:brSwitches[$b.Key] = $sw
  Add-Row (G "BrList") $b.Name $hint $sw $false
  $i++
}
$uninst = [Windows.Controls.Button]::new()
$uninst.Style = $w.Resources["Ghost"]; $uninst.Content = T "Удалить Hand Design" "Uninstall Hand Design"; $uninst.Foreground = Brush "#FF6B6B"
Add-Row (G "BrList") (T "Удаление" "Uninstall") (T "Сначала удалите «Hand Design» и «рамку» на странице расширений браузера" "First remove “Hand Design” and the “frame” on the browser's extensions page") $uninst $true

# ---------- страницы ----------
$script:page = 1
function Show-Page($n) {
  $script:page = $n
  foreach ($k in 1..4) { (G "Page$k").Visibility = $(if ($k -eq $n) { "Visible" } else { "Collapsed" }) }
  foreach ($k in 1..3) { (G "Step$k").Foreground = $(if ($k -eq $n) { Brush "#FFFFFFFF" } else { Brush "#80EBEBF5" }) }
  (G "Steps").Visibility = $(if ($n -eq 4) { "Collapsed" } else { "Visible" })
  (G "BackBtn").Visibility = $(if ($n -eq 1 -or $n -eq 4) { "Collapsed" } else { "Visible" })
  (G "NextBtn").Content = switch ($n) { 3 { T "Установить" "Install" } 4 { T "Готово" "Done" } default { T "Дальше" "Next" } }
}
(G "Step1").Add_Click({ if ($script:page -lt 4) { Show-Page 1 } })
(G "Step2").Add_Click({ if ($script:page -lt 4) { Show-Page 2 } })
(G "Step3").Add_Click({ if ($script:page -lt 4) { Show-Page 3 } })
(G "BackBtn").Add_Click({ if ($script:page -gt 1) { Show-Page ($script:page - 1) } })
function Show-Status($text) {
  (G "Status").Text = $text
  (G "Status").Visibility = $(if ($text) { "Visible" } else { "Collapsed" })
}

$script:result = $null
# «✓ Скопировано» на кнопке на полторы секунды
$script:copyBtn = $null
$script:copyLabel = ""
$script:copyTimer = New-Object Windows.Threading.DispatcherTimer
$script:copyTimer.Interval = [TimeSpan]::FromSeconds(1.6)
$script:copyTimer.Add_Tick({ if ($script:copyBtn) { $script:copyBtn.Content = $script:copyLabel }; $script:copyTimer.Stop() })
function Copy-Text($text, $btn, $label) {
  try { [Windows.Clipboard]::SetText($text) } catch {}
  if ($script:copyBtn -and $script:copyBtn -ne $btn) { $script:copyBtn.Content = $script:copyLabel }
  $script:copyBtn = $btn
  $script:copyLabel = $label
  $btn.Content = T "✓ Скопировано" "✓ Copied"
  $script:copyTimer.Stop()
  $script:copyTimer.Start()
}

function Show-Done($r) {
  (G "DoneTitle").Text = T "Готово — осталось подключить в браузере" "Done — now connect it in the browser"
  (G "DoneText").Text = (T "Файлы лежат в " "Files are in ") + $Dest + (T ". Их нельзя удалять — браузер читает расширение оттуда." ". Don't delete them — the browser loads the extension from there.")
  (G "HowTitle").Text = T "Один раз в каждом браузере:" "Once in each browser:"
  (G "HowSteps").Text = (T "1. Нажмите «Открыть страницу расширений» у браузера ниже (или наберите в адресной строке chrome://extensions — кнопка «Скопировать адрес страницы»).`n2. Справа вверху включите переключатель «Режим разработчика».`n3. Слева вверху нажмите «Загрузить распакованное расширение».`n4. В окне выбора папки вставьте путь в строку адреса вверху (Ctrl+V — путь расширения уже скопирован) и нажмите «Выбор папки». В списке появится Hand Design.`n5. Chrome, Brave и Chromium красят вкладки и адресную строку сами (в меню браузера появится «Управляется вашей организацией» — выключается в Studio). Для Edge, Opera и Яндекса: ещё раз «Загрузить распакованное» → «Скопировать путь рамки» → Ctrl+V → «Выбор папки».`n6. Откройте новую вкладку (Ctrl+T) — на вопрос браузера нажмите «Оставить».`n7. Значок пазла справа от адресной строки → булавка у Hand Design: это быстрая панель «Дизайн»." "1. Click “Open extensions page” for a browser below (or type chrome://extensions in the address bar — “Copy page address” button).`n2. Turn on “Developer mode” at the top right.`n3. Click “Load unpacked” at the top left.`n4. In the folder dialog paste the path into the address field at the top (Ctrl+V — the extension path is already copied) and click “Select folder”. Hand Design appears in the list.`n5. Chrome, Brave and Chromium paint tabs and the address bar themselves (the browser menu will say “Managed by your organization” — turn off in Studio). For Edge, Opera and Yandex: “Load unpacked” again → “Copy frame path” → Ctrl+V → “Select folder”.`n6. Open a new tab (Ctrl+T) — when the browser asks, click “Keep it”.`n7. Puzzle icon next to the address bar → pin Hand Design: that's the quick design panel.")
  $script:lblExt = T "Скопировать путь расширения" "Copy extension path"
  $script:lblFrame = T "Скопировать путь рамки" "Copy frame path"
  (G "CopyExt").Content = $script:lblExt
  (G "CopyFrame").Content = $script:lblFrame
  $script:lblPage = T "Скопировать адрес страницы" "Copy page address"
  (G "CopyPage").Content = $script:lblPage
  (G "OpenFolder").Content = T "Открыть папку" "Open folder"
  try { [Windows.Clipboard]::SetText($r.Ext) } catch {}
  $list = G "ConnList"
  $list.Children.Clear()
  foreach ($b in $Detected) {
    if (-not $b.Found) { continue }
    $sw = $script:brSwitches[$b.Key]
    if (-not $sw -or -not $sw.IsChecked) { continue }
    $card = [Windows.Controls.Border]::new()
    $card.Style = $w.Resources["Cell"]; $card.Padding = [Windows.Thickness]::new(16, 10, 10, 10); $card.Margin = [Windows.Thickness]::new(0, 0, 0, 8)
    $g = [Windows.Controls.Grid]::new()
    [void]$g.ColumnDefinitions.Add(([Windows.Controls.ColumnDefinition]::new()))
    $c2 = [Windows.Controls.ColumnDefinition]::new(); $c2.Width = [Windows.GridLength]::Auto; [void]$g.ColumnDefinitions.Add($c2)
    $sp = [Windows.Controls.StackPanel]::new()
    $n1 = [Windows.Controls.TextBlock]::new()
    $n1.Text = $b.Name; $n1.Foreground = Brush "#FFFFFFFF"; $n1.FontSize = 14.5; $n1.FontWeight = "SemiBold"
    $n2 = [Windows.Controls.TextBlock]::new()
    $n2.Foreground = Brush "#99EBEBF5"; $n2.FontSize = 12; $n2.TextWrapping = "Wrap"
    if ($b.Connected) { $n2.Text = T "Уже подключён: перезапустите браузер — новая версия и настройки подхватятся сами." "Already connected: restart the browser — the new version and settings load automatically." }
    else { $n2.Text = (T "Если страница не открылась — вставьте в адресную строку: " "If the page didn't open, paste into the address bar: ") + $b.Page }
    if ($b.Key -eq "vivaldi") { $n2.Text += (T "`nВесь интерфейс (опытно): vivaldi://experiments → «CSS modifications», Настройки → Внешний вид → папка " "`nWhole UI (experimental): vivaldi://experiments → “CSS modifications”, Settings → Appearance → folder ") + $r.Vivaldi }
    [void]$sp.Children.Add($n1); [void]$sp.Children.Add($n2)
    [void]$g.Children.Add($sp)
    $btn = [Windows.Controls.Button]::new()
    $btn.Style = $w.Resources["Ghost"]; $btn.VerticalAlignment = "Center"; $btn.Margin = [Windows.Thickness]::new(10, 0, 0, 0)
    $btn.Content = $(if ($b.Connected) { T "Открыть" "Open" } else { T "Открыть страницу расширений" "Open extensions page" })
    $btn.Tag = $b
    $btn.Add_Click({ param($s) $bb = $s.Tag; try { [Windows.Clipboard]::SetText($script:result.Ext) } catch {}; [void](Open-ExtensionsPage $bb) })
    [Windows.Controls.Grid]::SetColumn($btn, 1)
    [void]$g.Children.Add($btn)
    $card.Child = $g
    [void]$list.Children.Add($card)
  }
  Show-Page 4
}

(G "CopyExt").Add_Click({ Copy-Text $script:result.Ext (G "CopyExt") $script:lblExt })
(G "CopyFrame").Add_Click({ Copy-Text $script:result.Frame (G "CopyFrame") $script:lblFrame })
(G "CopyPage").Add_Click({
  $first = $Detected | Where-Object { $_.Found -and $script:brSwitches[$_.Key] -and $script:brSwitches[$_.Key].IsChecked } | Select-Object -First 1
  $page = $(if ($first) { $first.Page } else { "chrome://extensions" })
  Copy-Text $page (G "CopyPage") $script:lblPage
})
(G "OpenFolder").Add_Click({ Start-Process explorer.exe $Dest })

(G "NextBtn").Add_Click({
  Show-Status ""
  if ($script:page -lt 3) { Show-Page ($script:page + 1); return }
  if ($script:page -eq 4) { $w.Close(); return }
  try {
    $w.Cursor = [Windows.Input.Cursors]::Wait
    $script:result = Install-HandDesign $o
    Show-Done $script:result
    # сразу открыть страницу расширений первого выбранного браузера, где Hand Design ещё не подключён
    $first = $Detected | Where-Object { $_.Found -and -not $_.Connected -and $script:brSwitches[$_.Key] -and $script:brSwitches[$_.Key].IsChecked } | Select-Object -First 1
    if ($first) { Write-Log ("открываю " + $first.Page + " в " + $first.Name); [void](Open-ExtensionsPage $first) }
  } catch {
    Show-Status ((T "Ошибка: " "Error: ") + $_.Exception.Message)
  } finally {
    $w.Cursor = $null
  }
})
$uninst.Add_Click({
  $q = [Windows.MessageBox]::Show((T "Удалите в браузере «Hand Design» и «Hand Design — рамка браузера» (страница расширений → Удалить), потом нажмите «Да». Папка $Dest будет удалена." "Remove “Hand Design” and “Hand Design — browser frame” in the browser (extensions page → Remove), then click “Yes”. The folder $Dest will be deleted."), "Hand Design", "YesNo", "Question")
  if ($q -eq "Yes") {
    try { Uninstall-HandDesign; Show-Status (T "Hand Design удалён." "Hand Design was removed.") } catch { Show-Status ((T "Не получилось удалить: " "Could not remove: ") + $_.Exception.Message) }
  }
})

Show-Page 1
if ($Action -eq "uninstall") { Show-Page 3 }
Write-Log "окно: показываю"
$w.Topmost = $true
$w.Add_ContentRendered({ $w.Topmost = $false; $w.Activate() | Out-Null })
[void]$w.ShowDialog()
Write-Log "окно закрыто"
