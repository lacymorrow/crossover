# #535: prove the Windows build actually opens a window, not just that it
# compiles. Installs or unpacks a Windows artifact the way a user would,
# launches it, enumerates visible top-level windows owned by the process, and
# fails if there are none. LAC-4450, LAC-7622.
#
#   windows-smoke.ps1 [-Kind portable|nsis] [-PkgDir dist] [-OutDir dist] [-Settle 30]
#
# Exit 0 = installed, launched, visible window present after -Settle seconds
# and the mouse/keyboard hooks loaded. Mirrors linux-smoke.sh.
param(
	[ValidateSet('portable', 'nsis')] [string]$Kind = 'portable',
	[string]$PkgDir = 'dist',
	[string]$OutDir = 'dist',
	[int]$Settle = 30
)
$ErrorActionPreference = 'Stop'

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$OutDir = (Resolve-Path $OutDir).Path
$log = Join-Path $OutDir "app-$Kind.log"
$errLog = Join-Path $OutDir "app-$Kind.err.log"

function Say($msg) { Write-Host "`n== $msg" }

# Nothing from an earlier matrix leg may be left running.
Stop-Process -Name CrossOver -Force -ErrorAction SilentlyContinue

# --- locate the artifact ------------------------------------------------
Say "Locate $Kind artifact in $PkgDir"
$all = @(Get-ChildItem $PkgDir -Filter 'CrossOver*.exe' -ErrorAction SilentlyContinue)
if ($Kind -eq 'portable') {
	$pkg = $all | Where-Object { $_.Name -like '*-Portable-*' } | Select-Object -First 1
} else {
	$pkg = $all | Where-Object { $_.Name -notlike '*-Portable-*' } | Select-Object -First 1
}
if (-not $pkg) { throw "no $Kind exe in $PkgDir (found: $($all.Name -join ', '))" }
Write-Host "artifact: $($pkg.FullName) ($([int]($pkg.Length / 1MB)) MB)"

# --- install it the way a user would ------------------------------------
if ($Kind -eq 'nsis') {
	Say 'Silent install (oneClick, per-user)'
	# electron-builder's oneClick NSIS installs to LOCALAPPDATA with no
	# elevation and launches the app itself when it finishes.
	$install = Start-Process -FilePath $pkg.FullName -ArgumentList '/S' -PassThru -Wait
	Write-Host "installer exit code: $($install.ExitCode)"
	if ($install.ExitCode -ne 0) { throw "installer failed with exit code $($install.ExitCode)" }

	$app = Join-Path $env:LOCALAPPDATA 'Programs\CrossOver\CrossOver.exe'
	if (-not (Test-Path $app)) { throw "installer reported success but $app does not exist" }
	Write-Host "installed: $app"

	# The installer auto-launches. Stop that copy so we own the launch and
	# can capture stdout/stderr, same as the portable leg.
	Start-Sleep -Seconds 5
	Stop-Process -Name CrossOver -Force -ErrorAction SilentlyContinue
	Start-Sleep -Seconds 2
} else {
	$app = $pkg.FullName
}

# --- launch -------------------------------------------------------------
Say "Launch: $app"
Start-Process -FilePath $app -RedirectStandardOutput $log -RedirectStandardError $errLog | Out-Null
Start-Sleep -Seconds $Settle

# --- assert the process is up -------------------------------------------
Say "State after ${Settle}s"
$procs = @(Get-Process -Name CrossOver -ErrorAction SilentlyContinue)
$alive = $procs.Count -gt 0
Write-Host "processes alive: $($procs.Count)"
$procIds = @($procs | ForEach-Object { $_.Id })

Add-Type -TypeDefinition @"
using System;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public class WinEnum {
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc f, IntPtr l);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowTextW(IntPtr h, StringBuilder s, int n);
  [DllImport("kernel32.dll")] public static extern IntPtr GetConsoleWindow();
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
  public struct RECT { public int L, T, R, B; }
  delegate bool EnumProc(IntPtr h, IntPtr l);
  public static List<string> Windows(int[] pids) {
    var found = new List<string>();
    EnumWindows((h, l) => {
      uint pid; GetWindowThreadProcessId(h, out pid);
      if (Array.IndexOf(pids, (int)pid) < 0) { return true; }
      if (!IsWindowVisible(h)) { return true; }
      RECT r; GetWindowRect(h, out r);
      var sb = new StringBuilder(256); GetWindowTextW(h, sb, 256);
      found.Add(String.Format("pid={0} hwnd={1} title='{2}' rect={3},{4} {5}x{6}",
        pid, h, sb.ToString(), r.L, r.T, r.R - r.L, r.B - r.T));
      return true;
    }, IntPtr.Zero);
    return found;
  }
}
"@

$windows = @()
if ($alive) { $windows = @([WinEnum]::Windows($procIds)) }
$windows | ForEach-Object { Write-Host "  $_" }

try {
	Add-Type -AssemblyName System.Windows.Forms, System.Drawing

	# The runner's host console sits right where the crosshair draws, and the
	# crosshair window is transparent, so a plain grab is this log with faint
	# cross lines over it. Clear the desktop first. MinimizeAll covers the
	# runner's console, which belongs to another process; SW_MINIMIZE on our
	# own console handle does not (and returns NULL under a redirected pwsh).
	try { (New-Object -ComObject Shell.Application).MinimizeAll() } catch {}
	[WinEnum]::ShowWindow([WinEnum]::GetConsoleWindow(), 6) | Out-Null
	Start-Sleep -Seconds 3

	$bmp = New-Object System.Drawing.Bitmap 1920, 1080
	$gfx = [System.Drawing.Graphics]::FromImage($bmp)
	$gfx.CopyFromScreen(0, 0, 0, 0, $bmp.Size)
	$bmp.Save((Join-Path $OutDir "windows-smoke-$Kind.png"))

	# And a crop of the crosshair window itself, which is what someone
	# reviewing this actually wants to look at.
	if ($windows.Count -gt 0 -and $windows[0] -match 'rect=(-?\d+),(-?\d+) (\d+)x(\d+)') {
		$pad = 40
		$x = [Math]::Max(0, [int]$Matches[1] - $pad)
		$y = [Math]::Max(0, [int]$Matches[2] - $pad)
		$w = [Math]::Min(1920 - $x, [int]$Matches[3] + 2 * $pad)
		$h = [Math]::Min(1080 - $y, [int]$Matches[4] + 2 * $pad)
		if ($w -gt 0 -and $h -gt 0) {
			$crop = $bmp.Clone((New-Object System.Drawing.Rectangle $x, $y, $w, $h), $bmp.PixelFormat)
			$crop.Save((Join-Path $OutDir "windows-smoke-$Kind-window.png"))
			Write-Host "crosshair crop saved: ${w}x${h} at $x,$y"
		}
	}
	Write-Host "screenshot saved to $OutDir\windows-smoke-$Kind.png"
} catch {
	Write-Host "screenshot unavailable: $_"
}

# --- report the logs before we tear anything down -----------------------
foreach ($f in @($log, $errLog)) {
	if ((Test-Path $f) -and (Get-Item $f).Length -gt 0) {
		Say "$([System.IO.Path]::GetFileName($f))"
		Get-Content $f -Tail 40 | ForEach-Object { Write-Host "  $_" }
	}
}

Stop-Process -Name CrossOver -Force -ErrorAction SilentlyContinue

# --- verdict ------------------------------------------------------------
if (-not $alive) { throw "FAIL: CrossOver is not running ${Settle}s after launch (#535)" }
if ($windows.Count -eq 0) { throw 'FAIL: CrossOver is running but has no visible window (#535)' }

# The hooks are what Hide on ADS, Follow Mouse and the hide keys run on. A
# packaged build that loses them opens a window and silently does nothing.
$hookFail = @(Get-ChildItem $OutDir -Filter "app-$Kind*.log" |
	Select-String -Pattern 'Failed to load uiohook-napi' -SimpleMatch)
if ($hookFail.Count -gt 0) {
	$hookFail | ForEach-Object { Write-Host "  $($_.Line)" }
	throw 'FAIL: mouse/keyboard hooks did not load'
}

Write-Host "`nPASS: $Kind installed, launched, $($windows.Count) visible window(s), hooks loaded"
