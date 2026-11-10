<#
.SYNOPSIS
  Captures the virtual desktop to a PNG.

.DESCRIPTION
  Must run in the interactive session (session 1), not over SSH (session 0),
  or it captures nothing.

  Known limitation, and an important one when reading the LAC-5181 matrix:
  this is a GDI BitBlt grab. It reliably captures ordinary and layered windows
  on the desktop and in borderless games, but it does NOT reliably capture a
  true exclusive-fullscreen game, and it does NOT capture an Xbox Game Bar
  widget overlay at all. For those cases the ground truth is a photo of the
  monitor, not this script.

  Alongside the PNG it writes "<Out>.foreground.json": the foreground window at
  the moment of capture. That has to be read here rather than by the caller.
  The caller is blocked on a prompt while the operator is in the game, so by the
  time it regains control the operator has alt-tabbed back and the foreground
  window is the console. The 2026-10-24 pass recorded powershell as the
  foreground window for all five trials for exactly that reason, which cost the
  run its only machine-read check of what mode the game was actually in.
#>

[CmdletBinding()]
param(
	[Parameter(Mandatory = $true)]
	[string] $Out
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Windows.Forms, System.Drawing

if (-not ('Lac5181.Capture' -as [type])) {
	Add-Type @'
using System;
using System.Runtime.InteropServices;
using System.Text;
namespace Lac5181 {
  public struct Rect { public int Left, Top, Right, Bottom; }
  public static class Capture {
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern int GetWindowThreadProcessId(IntPtr h, out uint pid);
    [DllImport("user32.dll")] public static extern int GetWindowLongW(IntPtr h, int i);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out Rect r);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowTextW(IntPtr h, StringBuilder s, int n);
  }
}
'@
}

function Get-ForegroundAtCapture {
	$hwnd = [Lac5181.Capture]::GetForegroundWindow()
	if ($hwnd -eq [IntPtr]::Zero) {
		return [pscustomobject] @{ Hwnd = 0 }
	}

	$foregroundPid = [uint32] 0
	[Lac5181.Capture]::GetWindowThreadProcessId($hwnd, [ref] $foregroundPid) | Out-Null
	$process = Get-Process -Id $foregroundPid -ErrorAction SilentlyContinue

	$title = New-Object System.Text.StringBuilder 512
	[Lac5181.Capture]::GetWindowTextW($hwnd, $title, $title.Capacity) | Out-Null

	$rect = New-Object Lac5181.Rect
	[Lac5181.Capture]::GetWindowRect($hwnd, [ref] $rect) | Out-Null

	# built up first: a hashtable value cannot be an `if` statement under
	# Windows PowerShell 5.1, which is what the test box runs.
	$exePath = $null
	$processName = $null
	if ($process) {
		$processName = $process.ProcessName
		try { $exePath = $process.Path } catch { $exePath = $null }
	}

	return [pscustomobject] @{
		Hwnd = [int64] $hwnd
		Pid = [int] $foregroundPid
		Name = $processName
		Path = $exePath
		Title = $title.ToString()
		Rect = '{0},{1},{2},{3}' -f $rect.Left, $rect.Top, $rect.Right, $rect.Bottom
		Style = '0x{0:X8}' -f [Lac5181.Capture]::GetWindowLongW($hwnd, -16)
		ExStyle = '0x{0:X8}' -f [Lac5181.Capture]::GetWindowLongW($hwnd, -20)
	}
}

$dir = Split-Path -Parent $Out
if ($dir -and -not (Test-Path $dir)) {
	New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

# read before the BitBlt, so it describes the screen this capture is about to take
$foreground = Get-ForegroundAtCapture
$foreground | ConvertTo-Json | Set-Content -Path "$Out.foreground.json" -Encoding UTF8

$bounds = [System.Windows.Forms.SystemInformation]::VirtualScreen
$bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)

try {
	$graphics.CopyFromScreen($bounds.Left, $bounds.Top, 0, 0, $bitmap.Size)
	$bitmap.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
	Write-Host "saved $Out ($($bounds.Width)x$($bounds.Height))"
	Write-Host "  foreground at capture: $($foreground.Name) '$($foreground.Title)'"
} finally {
	$graphics.Dispose()
	$bitmap.Dispose()
}
