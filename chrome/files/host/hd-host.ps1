# Hand Design — помощник расширения (native messaging).
# Красит верх браузера (вкладки, адресную строку) в цвет темы через политику BrowserThemeColor
# в HKCU — без прав администратора. Расширение само не может: у Chrome нет API для рамки.
# Выключается в Studio → «Красить верх браузера» (команда clear убирает политику).
# Протокол Chrome: 4 байта длины + JSON на входе и на выходе. Ничего лишнего в stdout!
$ErrorActionPreference = "Stop"
$POL = @{
  chrome   = "HKCU:\Software\Policies\Google\Chrome"
  brave    = "HKCU:\Software\Policies\BraveSoftware\Brave"
  chromium = "HKCU:\Software\Policies\Chromium"
}

function Read-Msg {
  $in = [Console]::OpenStandardInput()
  $head = New-Object byte[] 4
  $n = 0
  while ($n -lt 4) { $r = $in.Read($head, $n, 4 - $n); if ($r -le 0) { return $null }; $n += $r }
  $size = [BitConverter]::ToInt32($head, 0)
  if ($size -le 0 -or $size -gt 65536) { return $null }
  $buf = New-Object byte[] $size
  $n = 0
  while ($n -lt $size) { $r = $in.Read($buf, $n, $size - $n); if ($r -le 0) { break }; $n += $r }
  return ([Text.Encoding]::UTF8.GetString($buf, 0, $n) | ConvertFrom-Json)
}

function Send-Msg($obj) {
  $b = [Text.Encoding]::UTF8.GetBytes(($obj | ConvertTo-Json -Compress))
  $out = [Console]::OpenStandardOutput()
  $out.Write([BitConverter]::GetBytes([int]$b.Length), 0, 4)
  $out.Write($b, 0, $b.Length)
  $out.Flush()
}

try {
  $m = Read-Msg
  if (-not $m) { exit 0 }
  if ($m.cmd -eq "ping") { Send-Msg @{ ok = $true; version = "1" }; exit 0 }
  $key = $POL[[string]$m.browser]
  if (-not $key) { Send-Msg @{ ok = $false; reason = "unsupported" }; exit 0 }
  if ($m.cmd -eq "color" -and [string]$m.color -match '^#[0-9a-fA-F]{6}$') {
    # New-Item -Force на существующем ключе стёр бы другие политики — создаём ключ, только если его нет
    if (-not (Test-Path -LiteralPath $key)) { New-Item -Path $key -Force | Out-Null }
    Set-ItemProperty -LiteralPath $key -Name "BrowserThemeColor" -Value ([string]$m.color).ToUpper() -Type String
    Send-Msg @{ ok = $true }
  } elseif ($m.cmd -eq "clear") {
    if (Test-Path -LiteralPath $key) {
      Remove-ItemProperty -LiteralPath $key -Name "BrowserThemeColor" -ErrorAction SilentlyContinue
      # пустой ключ политик убираем — иначе браузер пишет «Управляется вашей организацией»
      $k = Get-Item -LiteralPath $key
      if ($k.ValueCount -eq 0 -and $k.SubKeyCount -eq 0) { Remove-Item -LiteralPath $key -Force }
    }
    Send-Msg @{ ok = $true }
  } else {
    Send-Msg @{ ok = $false; reason = "bad-request" }
  }
} catch {
  try { Send-Msg @{ ok = $false; reason = "error"; error = $_.Exception.Message } } catch {}
}
