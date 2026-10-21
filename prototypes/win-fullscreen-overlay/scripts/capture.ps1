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
#>

[CmdletBinding()]
param(
	[Parameter(Mandatory = $true)]
	[string] $Out
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Windows.Forms, System.Drawing

$dir = Split-Path -Parent $Out
if ($dir -and -not (Test-Path $dir)) {
	New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

$bounds = [System.Windows.Forms.SystemInformation]::VirtualScreen
$bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)

try {
	$graphics.CopyFromScreen($bounds.Left, $bounds.Top, 0, 0, $bitmap.Size)
	$bitmap.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
	Write-Host "saved $Out ($($bounds.Width)x$($bounds.Height))"
} finally {
	$graphics.Dispose()
	$bitmap.Dispose()
}
