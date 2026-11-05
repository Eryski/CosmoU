// CosmoU – on Windows, an app (a PC port, a PC game) can open maximized or in full screen even when the program
// itself always opens in a small window. After the start, a small hidden PowerShell watches for 45 seconds which
// new windows the app opens (its own process, the processes it starts, and programs from its folder – a game's
// launcher often starts the real game) and makes each new big window maximized, or full screen without a border
// on its monitor – and in front, with the keyboard and the controller, while the app's log window (a console) steps
// aside. Programs that were already running before the start are never touched.
const { spawn } = require('child_process');

const SRC = String.raw`
using System; using System.Collections.Generic; using System.Runtime.InteropServices; using System.Text;
public static class CosmoWin {
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
  [StructLayout(LayoutKind.Sequential)] public struct MONITORINFO { public int cbSize; public RECT rcMonitor; public RECT rcWork; public uint dwFlags; }
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc f, IntPtr l);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] static extern IntPtr GetWindow(IntPtr h, uint cmd);
  [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr h, int c);
  [DllImport("user32.dll")] static extern int GetWindowLong(IntPtr h, int i);
  [DllImport("user32.dll")] static extern int SetWindowLong(IntPtr h, int i, int v);
  [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int w, int hh, uint f);
  [DllImport("user32.dll")] static extern IntPtr MonitorFromWindow(IntPtr h, uint f);
  [DllImport("user32.dll")] static extern bool GetMonitorInfo(IntPtr m, ref MONITORINFO mi);
  [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
  [DllImport("kernel32.dll")] static extern uint GetCurrentThreadId();
  [DllImport("user32.dll")] static extern bool AttachThreadInput(uint a, uint b, bool on);
  [DllImport("user32.dll")] static extern bool BringWindowToTop(IntPtr h);
  [DllImport("user32.dll")] static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);
  // the game gets the keyboard and the controller: Windows lets a helper in the background hand over the focus only
  // while it shares the input of the window in front (or right after it sent a key: F24, which nothing uses)
  public static bool Front(long hw) {
    IntPtr h = new IntPtr(hw);
    if (GetForegroundWindow() == h) return true;
    uint pid; uint fg = GetWindowThreadProcessId(GetForegroundWindow(), out pid), me = GetCurrentThreadId();
    bool att = fg != 0 && fg != me && AttachThreadInput(me, fg, true);
    BringWindowToTop(h); SetForegroundWindow(h);
    if (att) AttachThreadInput(me, fg, false);
    if (GetForegroundWindow() != h) { keybd_event(0x87, 0, 0, UIntPtr.Zero); keybd_event(0x87, 0, 2, UIntPtr.Zero); BringWindowToTop(h); SetForegroundWindow(h); }
    return GetForegroundWindow() == h;
  }
  public static bool IsFront(long hw) { return GetForegroundWindow() == new IntPtr(hw); }
  // a log window goes down to the task bar, without taking the focus
  public static void Down(long hw) { ShowWindow(new IntPtr(hw), 7); }
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetClassName(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  public static string Name(long hw) { var b = new StringBuilder(256); GetWindowText(new IntPtr(hw), b, 256); var c = new StringBuilder(256); GetClassName(new IntPtr(hw), c, 256); return b + " [" + c + "]"; }
  // the visible top-level windows (no tool windows, no owned popups) with their process
  public static List<long[]> Windows() {
    var l = new List<long[]>();
    EnumWindows((h, p) => {
      if (!IsWindowVisible(h) || GetWindow(h, 4) != IntPtr.Zero) return true;
      if ((GetWindowLong(h, -20) & 0x80) != 0) return true;
      // console windows (a port's log window) are not the game: they are marked
      var c = new StringBuilder(64); GetClassName(h, c, 64);
      bool con = c.ToString() == "ConsoleWindowClass" || c.ToString() == "CASCADIA_HOSTING_WINDOW_CLASS" || c.ToString() == "PseudoConsoleWindow";
      uint pid; GetWindowThreadProcessId(h, out pid);
      l.Add(new long[] { h.ToInt64(), pid, con ? 1 : 0 });
      return true;
    }, IntPtr.Zero);
    return l;
  }
  // big enough to be the game, not a splash or a small dialog
  public static bool Big(long hw) {
    RECT r; if (!GetWindowRect(new IntPtr(hw), out r)) return false;
    return !IsIconic(new IntPtr(hw)) && r.R - r.L >= 400 && r.B - r.T >= 300;
  }
  public static bool Fills(long hw) {
    IntPtr h = new IntPtr(hw); RECT r; GetWindowRect(h, out r);
    var mi = new MONITORINFO(); mi.cbSize = Marshal.SizeOf(mi); GetMonitorInfo(MonitorFromWindow(h, 2), ref mi);
    return r.L <= mi.rcMonitor.L && r.T <= mi.rcMonitor.T && r.R >= mi.rcMonitor.R && r.B >= mi.rcMonitor.B;
  }
  public static void Apply(long hw, string mode) {
    IntPtr h = new IntPtr(hw);
    if (mode == "focus") { Front(hw); return; }
    if (mode == "max") { ShowWindow(h, 3); Front(hw); return; }
    ShowWindow(h, 9);
    // no title bar and no frame, over the whole monitor (also over the task bar)
    int st = GetWindowLong(h, -16);
    SetWindowLong(h, -16, st & ~(0x00C00000 | 0x00040000 | 0x00020000 | 0x00010000 | 0x00080000));
    int ex = GetWindowLong(h, -20);
    SetWindowLong(h, -20, ex & ~(0x00000001 | 0x00000200 | 0x00020000 | 0x00000100));
    var mi = new MONITORINFO(); mi.cbSize = Marshal.SizeOf(mi); GetMonitorInfo(MonitorFromWindow(h, 2), ref mi);
    var m = mi.rcMonitor;
    SetWindowPos(h, IntPtr.Zero, m.L, m.T, m.R - m.L, m.B - m.T, 0x0020 | 0x0040 | 0x0004);
    Front(hw);
  }
}`;

// the watcher: arguments come in through the environment, never into the script text
const PS = `
$ProgressPreference = 'SilentlyContinue'
try { Add-Type -TypeDefinition $env:COSMOU_WIN_SRC -ErrorAction Stop } catch { Write-Output ('cannot watch: ' + $_); exit }
$ErrorActionPreference = 'SilentlyContinue'
$root = [uint32]$env:COSMOU_WIN_PID; $dir = $env:COSMOU_WIN_DIR; $mode = $env:COSMOU_WIN_MODE
# programs from the app's folder count when they started with it or after it (not one that was already running)
$since = [DateTimeOffset]::FromUnixTimeMilliseconds([int64]$env:COSMOU_WIN_AT).LocalDateTime.AddSeconds(-3)
$done = @{}; $logs = @{}; $once = @{}; $game = $null; $end = (Get-Date).AddSeconds(45); Write-Output ('watching ' + $root + ' ' + $mode)
while ((Get-Date) -lt $end) {
  $procs = @(Get-CimInstance Win32_Process -Property ProcessId,ParentProcessId,ExecutablePath,CreationDate)
  $mine = @{}; if ($root) { $mine[$root] = 1 }
  do { $more = $false; foreach ($p in $procs) { if ($mine.ContainsKey([uint32]$p.ParentProcessId) -and -not $mine.ContainsKey([uint32]$p.ProcessId)) { $mine[[uint32]$p.ProcessId] = 1; $more = $true } } } while ($more)
  if ($dir) { foreach ($p in $procs) { if ($p.ExecutablePath -and $p.CreationDate -ge $since -and $p.ExecutablePath.StartsWith($dir, [StringComparison]::OrdinalIgnoreCase)) { $mine[[uint32]$p.ProcessId] = 1 } } }
  foreach ($w in [CosmoWin]::Windows()) {
    $h = $w[0]
    if (-not $mine.ContainsKey([uint32]$w[1])) { continue }
    # the app's log window (a console) steps aside once the game's window is there
    if ($w[2] -eq 1) { if ($game -and -not $logs.ContainsKey($h)) { $logs[$h] = 1; [CosmoWin]::Down($h); Write-Output ('log window down ' + [CosmoWin]::Name($h)) }; continue }
    if (-not [CosmoWin]::Big($h)) { continue }
    # a game often sizes its window again right after it opens: for a few seconds CosmoU puts it back (and in front)
    if (-not $done.ContainsKey($h)) { $done[$h] = Get-Date; $game = $h; [CosmoWin]::Apply($h, $mode); Write-Output ('window ' + [CosmoWin]::Name($h) + ' ' + $mode + ' front=' + [CosmoWin]::IsFront($h)) }
    elseif (((Get-Date) - $done[$h]).TotalSeconds -lt 8 -and $h -eq $game) {
      if ($mode -eq 'full' -and -not [CosmoWin]::Fills($h)) { [CosmoWin]::Apply($h, $mode) }
      elseif (-not [CosmoWin]::IsFront($h) -and -not $once.ContainsKey($h)) { $once[$h] = 1; [void][CosmoWin]::Front($h); Write-Output ('front again ' + [CosmoWin]::IsFront($h)) }
    }
  }
  Start-Sleep -Milliseconds 600
}
`;

// mode: 'max' (maximized), 'full' (full screen without a border) or 'focus' (only in front, with the keyboard and the
// controller – for every app, so a port that opens a console window first doesn't leave its game behind); pid: the started program (0 when Windows
// opened it); dir: the program's folder (not used for programs inside Windows' own folder)
function windowMode(mode, pid, dir, log) {
  if (process.platform !== 'win32' || !['max', 'full', 'focus'].includes(mode)) return null;
  const win = (process.env.SystemRoot || process.env.windir || 'C:\\Windows').toLowerCase();
  const own = dir && !String(dir).toLowerCase().startsWith(win) && String(dir).length > 3 ? String(dir).replace(/[\\/]*$/, '\\') : '';
  try {
    const ps = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-EncodedCommand', Buffer.from(PS, 'utf16le').toString('base64')], {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'ignore'],
      env: { ...process.env, COSMOU_WIN_SRC: SRC, COSMOU_WIN_PID: String(pid || 0), COSMOU_WIN_DIR: own, COSMOU_WIN_MODE: mode, COSMOU_WIN_AT: String(Date.now()) },
    });
    ps.on('error', () => {});
    if (log) ps.stdout.on('data', d => log(String(d).trim()));
    return ps;
  } catch {
    return null;
  }
}
module.exports = { windowMode, SRC };
