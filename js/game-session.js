// CosmoU – while a game runs: back to CosmoU when it ends, and a controller combo that closes it.
// L + D-pad Down + Select (the combo known from Nintendo homebrew) closes the game and brings CosmoU to the front.
// On Windows a small hidden PowerShell reads the controllers (XInput) even while the game has the focus, and
// watches the game's processes (the program CosmoU started, the programs it starts, and new programs from its
// folder – a launcher often starts the real game and closes itself). Elsewhere the window's own controller
// reading and the program's end do the same. (Idea: Eduard)
const { spawn } = require('child_process');
const WW = require('./win-window.js');

const PAD = String.raw`
using System; using System.Runtime.InteropServices;
public static class CosmoPad {
  [StructLayout(LayoutKind.Sequential)] public struct XS { public uint pkt; public ushort buttons; public byte lt, rt; public short lx, ly, rx, ry; }
  [DllImport("xinput1_4.dll", EntryPoint = "XInputGetState")] static extern uint Get14(uint i, out XS s);
  [DllImport("xinput9_1_0.dll", EntryPoint = "XInputGetState")] static extern uint Get91(uint i, out XS s);
  static int api = 0;
  // L (left shoulder) + D-pad down + Back/Select held on any controller
  public static bool Combo() {
    for (uint i = 0; i < 4; i++) {
      XS s = new XS(); uint r = 1;
      try { r = api == 0 ? Get14(i, out s) : Get91(i, out s); } catch { api = 1; try { r = Get91(i, out s); } catch { return false; } }
      if (r == 0 && (s.buttons & 0x0122) == 0x0122) return true;
    }
    return false;
  }
}`;

const PS = `
$ProgressPreference = 'SilentlyContinue'
try { Add-Type -TypeDefinition $env:COSMOU_WIN_SRC -ErrorAction Stop; Add-Type -TypeDefinition $env:COSMOU_PAD_SRC -ErrorAction Stop } catch { Write-Output ('cannot watch: ' + $_); exit }
$ErrorActionPreference = 'SilentlyContinue'
$root = [uint32]$env:COSMOU_WIN_PID; $dir = $env:COSMOU_WIN_DIR; $self = [int64]$env:COSMOU_SELF
$since = [DateTimeOffset]::FromUnixTimeMilliseconds([int64]$env:COSMOU_WIN_AT).LocalDateTime.AddSeconds(-3)
function Mine {
  $procs = @(Get-CimInstance Win32_Process -Property ProcessId,ParentProcessId,ExecutablePath,CreationDate)
  $m = @{}; $alive = @{}; foreach ($p in $procs) { $alive[[uint32]$p.ProcessId] = 1 }
  $tree = @{}; if ($root) { $tree[$root] = 1 }
  do { $more = $false; foreach ($p in $procs) { if ($tree.ContainsKey([uint32]$p.ParentProcessId) -and -not $tree.ContainsKey([uint32]$p.ProcessId)) { $tree[[uint32]$p.ProcessId] = 1; $more = $true } } } while ($more)
  foreach ($k in $tree.Keys) { if ($alive.ContainsKey($k)) { $m[$k] = 1 } }
  if ($dir) { foreach ($p in $procs) { if ($p.ExecutablePath -and $p.CreationDate -ge $since -and $p.ExecutablePath.StartsWith($dir, [StringComparison]::OrdinalIgnoreCase)) { $m[[uint32]$p.ProcessId] = 1 } } }
  return $m
}
Write-Output ('session ' + $root)
$mine = Mine; $gone = 0; $held = 0; $tick = 0; $end = (Get-Date).AddHours(16)
while ((Get-Date) -lt $end) {
  if ([CosmoPad]::Combo()) { $held++ } else { $held = 0 }
  # held for about a third of a second: the game is closed (asked first, then for sure), CosmoU comes back
  if ($held -ge 2) {
    $mine = Mine
    foreach ($k in $mine.Keys) { $p = Get-Process -Id $k; if ($p -and $p.MainWindowHandle -ne 0) { [void]$p.CloseMainWindow() } }
    $t = (Get-Date).AddSeconds(3)
    while ((Get-Date) -lt $t) { Start-Sleep -Milliseconds 250; $left = @($mine.Keys | Where-Object { Get-Process -Id $_ }); if (-not $left.Count) { break } }
    foreach ($k in $mine.Keys) { Stop-Process -Id $k -Force }
    Write-Output 'closed'
    if ($self) { [void][CosmoWin]::Front($self) }
    exit
  }
  if ($tick % 12 -eq 0) {
    $mine = Mine
    if ($mine.Count -eq 0) { $gone++ } else { $gone = 0 }
    # nothing of the game is running any more (twice in a row: a launcher handing over to the game is not the end)
    if ($gone -ge 2) { Write-Output 'ended'; if ($self) { [void][CosmoWin]::Front($self) }; exit }
  }
  $tick++
  Start-Sleep -Milliseconds 150
}
`;

let cur = null;
// pid: the started program (0 when Windows opened it); dir: its folder; win: CosmoU's window; done(kind): 'ended' | 'closed'
function start(pid, dir, win, done) {
  stop();
  const s = { pid: pid || 0, dir: dir || '', at: Date.now(), helper: null, finished: false };
  cur = s;
  const finish = kind => {
    if (s.finished) return;
    s.finished = true;
    if (cur === s) cur = null;
    if (s.helper)
      try {
        s.helper.kill();
      } catch {}
    done && done(kind, Date.now() - s.at);
  };
  s.finish = finish;
  if (process.platform === 'win32') {
    const winDir = (process.env.SystemRoot || process.env.windir || 'C:\\Windows').toLowerCase();
    const own = dir && !String(dir).toLowerCase().startsWith(winDir) && String(dir).length > 3 ? String(dir).replace(/[\\/]*$/, '\\') : '';
    let self = 0;
    try {
      const b = win && !win.isDestroyed() ? win.getNativeWindowHandle() : null;
      self = b ? (b.length >= 8 ? Number(b.readBigInt64LE(0)) : b.readInt32LE(0)) : 0;
    } catch {}
    try {
      s.helper = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-EncodedCommand', Buffer.from(PS, 'utf16le').toString('base64')], {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'ignore'],
        env: { ...process.env, COSMOU_WIN_SRC: WW.SRC, COSMOU_PAD_SRC: PAD, COSMOU_WIN_PID: String(pid || 0), COSMOU_WIN_DIR: own, COSMOU_WIN_AT: String(Date.now()), COSMOU_SELF: String(self) },
      });
      s.helper.on('error', () => {});
      s.helper.stdout.on('data', d => {
        const t = String(d);
        if (process.env.COSMOU_DEBUG) console.error('game ' + t.trim());
        if (/\bclosed\b/.test(t)) finish('closed');
        else if (/\bended\b/.test(t)) finish('ended');
      });
    } catch {}
  }
  return s;
}
// the program ended (elsewhere than Windows: that is the end of the game; a launcher that quits within 15 s is not)
function exited(child) {
  const s = cur;
  if (!s || !child || child.pid !== s.pid || process.platform === 'win32') return;
  if (Date.now() - s.at > 15000) s.finish('ended');
}
// close the game (the combo read by CosmoU's own window, or a button)
function close() {
  const s = cur;
  if (!s || !s.pid) return false;
  if (process.platform === 'win32') {
    spawn('taskkill', ['/PID', String(s.pid), '/T'], { windowsHide: true, stdio: 'ignore' }).on('error', () => {});
    setTimeout(() => spawn('taskkill', ['/PID', String(s.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }).on('error', () => {}), 3000);
  } else {
    // (started in its own process group: the group goes, with what the program started)
    try {
      process.kill(-s.pid, 'SIGTERM');
    } catch {
      try {
        process.kill(s.pid, 'SIGTERM');
      } catch {}
    }
    setTimeout(() => {
      try {
        process.kill(-s.pid, 'SIGKILL');
      } catch {}
    }, 3000);
  }
  s.finish('closed');
  return true;
}
function stop() {
  if (cur && cur.helper)
    try {
      cur.helper.kill();
    } catch {}
  cur = null;
}
const running = () => !!cur;
module.exports = { start, exited, close, stop, running };
