# Подключение распакованного расширения без участия пользователя: Windows UI Automation нажимает
# на странице расширений «Режим разработчика» и «Загрузить распакованное» и выбирает папку в окне выбора.
# Страница уже должна быть открыта в браузере. Если что-то не нашлось, возвращает текст причины.
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes
Add-Type -TypeDefinition @'
using System;
using System.Text;
using System.Runtime.InteropServices;
namespace HD {
  public static class Win {
    delegate bool EnumProc(IntPtr h, IntPtr l);
    [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc f, IntPtr l);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetClassName(IntPtr h, StringBuilder s, int n);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
    [DllImport("user32.dll")] public static extern IntPtr GetDlgItem(IntPtr h, int id);
    [DllImport("user32.dll")] static extern IntPtr GetWindow(IntPtr h, int cmd);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern IntPtr SendMessage(IntPtr h, int msg, IntPtr w, string l);
    [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr h, int msg, IntPtr w, IntPtr l);
    [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
    [DllImport("user32.dll")] public static extern void SwitchToThisWindow(IntPtr h, bool alt);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    public static int ForegroundPid() { uint pid; GetWindowThreadProcessId(GetForegroundWindow(), out pid); return (int)pid; }
    [StructLayout(LayoutKind.Sequential)] struct POINT { public int X, Y; }
    [DllImport("user32.dll")] static extern IntPtr WindowFromPoint(POINT p);
    [DllImport("user32.dll")] static extern bool GetCursorPos(out POINT p);
    [DllImport("user32.dll")] static extern bool SetCursorPos(int x, int y);
    [DllImport("user32.dll")] static extern void mouse_event(int f, int x, int y, int d, IntPtr e);
    // щелчок, только если в этой точке окно одного из процессов браузера; курсор возвращается на место
    public static bool Click(int x, int y, int[] pids) {
      var p = new POINT { X = x, Y = y };
      uint pid;
      GetWindowThreadProcessId(WindowFromPoint(p), out pid);
      if (Array.IndexOf(pids, (int)pid) < 0) return false;
      POINT old;
      GetCursorPos(out old);
      SetCursorPos(x, y);
      mouse_event(2, 0, 0, 0, IntPtr.Zero);
      mouse_event(4, 0, 0, 0, IntPtr.Zero);
      SetCursorPos(old.X, old.Y);
      return true;
    }
    // видимый диалог (#32770), владелец которого — окно браузера. Сам диалог Chrome открывает
    // в отдельном служебном процессе, поэтому его процесс не проверяем
    public static IntPtr FindDialog(int[] pids) {
      IntPtr found = IntPtr.Zero;
      EnumWindows((h, l) => {
        var sb = new StringBuilder(64);
        GetClassName(h, sb, 64);
        if (sb.ToString() != "#32770" || !IsWindowVisible(h)) return true;
        IntPtr owner = GetWindow(h, 4);
        if (owner == IntPtr.Zero) return true;
        uint pid;
        GetWindowThreadProcessId(owner, out pid);
        if (Array.IndexOf(pids, (int)pid) < 0) return true;
        found = h;
        return false;
      }, IntPtr.Zero);
      return found;
    }
  }
}
'@

$UA = [Windows.Automation.AutomationElement]
$Tree = [Windows.Automation.TreeScope]
$DevNames = "^(Developer mode|Режим разработчика|Режим розробника|Entwicklermodus|Mode développeur|Modo de desarrollador|Modo do desenvolvedor|Modo de programador|Tryb dewelopera|Geliştirici modu|开发者模式)$"
$LoadNames = "^(Load unpacked|Загрузить распакованное|Загрузить распакованное расширение|Завантажити розпаковане|Entpackte Erweiterung laden|Charger l'extension non empaquetée|Cargar descomprimida|Carregar sem compactação|Załaduj rozpakowane|Paketlenmemiş öğe yükle|加载已解压的扩展程序)$"

# Chrome отдаёт дерево страницы, только когда его обходят целиком: поиск по условию его не строит
function Find-Control($pids, [string]$id, [string]$names) {
  foreach ($w in Get-Windows $pids) {
    $all = $w.FindAll($Tree::Descendants, [Windows.Automation.Condition]::TrueCondition)
    $hit = $null
    foreach ($x in $all) {
      $c = $x.Current
      if ($c.IsOffscreen) { continue }
      if ($c.AutomationId -eq $id) { return $x }
      if (-not $hit -and $c.Name -match $names -and ($c.ControlType -eq [Windows.Automation.ControlType]::Button -or $c.ControlType -eq [Windows.Automation.ControlType]::CheckBox)) { $hit = $x }
    }
    if ($hit) { return $hit }
  }
  return $null
}
function Get-Windows([int[]]$pids) {
  $cond = New-Object Windows.Automation.PropertyCondition($UA::ClassNameProperty, "Chrome_WidgetWin_1")
  @($UA::RootElement.FindAll($Tree::Children, $cond) | Where-Object { $pids -contains $_.Current.ProcessId -and $_.Current.Name })
}
function Find-Dialog([int[]]$pids) {
  $h = [HD.Win]::FindDialog($pids)
  if ($h -ne [IntPtr]::Zero) { return $h }
  return $null
}
function Invoke-El($el) {
  $p = $null
  if ($el.TryGetCurrentPattern([Windows.Automation.InvokePattern]::Pattern, [ref]$p)) { $p.Invoke(); return }
  if ($el.TryGetCurrentPattern([Windows.Automation.TogglePattern]::Pattern, [ref]$p)) { $p.Toggle(); return }
  throw "no pattern"
}
# запасной щелчок мышью по элементу, если окно браузера впереди
function Press-El([int[]]$pids, $el) {
  Show-Browser $pids
  Start-Sleep -Milliseconds 300
  if ($pids -notcontains [HD.Win]::ForegroundPid()) { return $false }
  $r = $el.Current.BoundingRectangle
  if ($r.IsEmpty) { return $false }
  return [HD.Win]::Click([int]($r.X + $r.Width / 2), [int]($r.Y + $r.Height / 2), $pids)
}
function Wait-For([scriptblock]$probe, [int]$seconds) {
  $end = (Get-Date).AddSeconds($seconds)
  do {
    $r = & $probe
    if ($r) { return $r }
    Start-Sleep -Milliseconds 300
  } while ((Get-Date) -lt $end)
  return $null
}

$script:ConnectLog = $null
function Write-Step([string]$m) { if ($script:ConnectLog) { & $script:ConnectLog $m } }

# закрытое другими окнами окно Chrome не обновляет страницу — выводим его вперёд
function Show-Browser([int[]]$pids) {
  $w = @(Get-Windows $pids) | Select-Object -First 1
  if (-not $w) { return }
  $h = [IntPtr]$w.Current.NativeWindowHandle
  if ([HD.Win]::IsIconic($h)) { [void][HD.Win]::ShowWindow($h, 9) }
  [HD.Win]::SwitchToThisWindow($h, $true)
}

# $pids — процессы браузера, $path — папка расширения
function Connect-Unpacked([int[]]$pids, [string]$path) {
  Show-Browser $pids
  # первое обращение включает в браузере доступность, дерево страницы появляется не сразу
  $load = Wait-For { Find-Control $pids "loadUnpacked" $LoadNames } 4
  if (-not $load) {
    $dev = Wait-For { Find-Control $pids "devMode" $DevNames } 20
    if (-not $dev) { return "dev-mode-not-found" }
    Write-Step "dev mode toggle"
    Invoke-El $dev
    $load = Wait-For { Find-Control $pids "loadUnpacked" $LoadNames } 30
    if (-not $load) { return "load-button-not-found" }
  }
  # сначала нажатие через UI Automation, на повторе — щелчок мышью
  $dlg = $null
  for ($try = 0; $try -lt 4 -and -not $dlg; $try++) {
    Start-Sleep -Milliseconds 1500
    $load = Find-Control $pids "loadUnpacked" $LoadNames
    if (-not $load) { continue }
    Write-Step "load unpacked"
    if ($try -eq 0 -or -not (Press-El $pids $load)) { Invoke-El $load }
    $dlg = Wait-For { Find-Dialog $pids } 6
  }
  if (-not $dlg) { return "dialog-not-found" }
  Write-Step "dialog"
  # поле «Папка:» и кнопка «Выбор папки» — элементы Win32 с номерами 1152 и 1
  $edit = Wait-For { $e = [HD.Win]::GetDlgItem($dlg, 1152); if ($e -ne [IntPtr]::Zero) { $e } } 5
  $ok = [HD.Win]::GetDlgItem($dlg, 1)
  if (-not $edit -or $ok -eq [IntPtr]::Zero) { return "dialog-fields-not-found" }
  [void][HD.Win]::SendMessage($edit, 0x000C, [IntPtr]::Zero, $path)
  Start-Sleep -Milliseconds 200
  [void][HD.Win]::PostMessage($ok, 0x00F5, [IntPtr]::Zero, [IntPtr]::Zero)
  $closed = Wait-For { -not (Find-Dialog $pids) } 8
  if (-not $closed) { return "dialog-still-open" }
  return ""
}
