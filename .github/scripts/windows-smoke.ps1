# #535: prove the Windows build actually opens a window, not just that it
# compiles. Launches the portable exe, enumerates visible top-level windows
# owned by the process, fails if there are none. Used by the release
# workflow's QA verification build (workflow_dispatch only). LAC-4450.
$ErrorActionPreference = 'Stop'

$exe = Get-ChildItem dist -Filter 'CrossOver-Portable-*.exe' | Select-Object -First 1
if (-not $exe) { throw 'no portable exe in dist' }
Write-Host "launching $($exe.FullName)"
Start-Process -FilePath $exe.FullName | Out-Null
Start-Sleep -Seconds 30

$procs = @(Get-Process -Name CrossOver -ErrorAction SilentlyContinue)
if ($procs.Count -eq 0) { throw 'CrossOver is not running 30s after launch' }
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

$windows = @([WinEnum]::Windows($procIds))
$windows | ForEach-Object { Write-Host "  $_" }

try {
  Add-Type -AssemblyName System.Windows.Forms, System.Drawing
  $bmp = New-Object System.Drawing.Bitmap 1920, 1080
  $gfx = [System.Drawing.Graphics]::FromImage($bmp)
  $gfx.CopyFromScreen(0, 0, 0, 0, $bmp.Size)
  $bmp.Save("$PWD\dist\windows-smoke.png")
  Write-Host 'screenshot saved to dist/windows-smoke.png'
} catch {
  Write-Host "screenshot unavailable: $_"
}

Stop-Process -Name CrossOver -Force -ErrorAction SilentlyContinue

if ($windows.Count -eq 0) { throw 'CrossOver is running but has no visible window (#535)' }
Write-Host "visible windows: $($windows.Count)"
