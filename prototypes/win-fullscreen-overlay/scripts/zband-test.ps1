<#
.SYNOPSIS
  Runs the z-band comparison: probe vs an ordinary topmost fullscreen window.

.DESCRIPTION
  Starts the adversary (opaque fullscreen WS_EX_TOPMOST), then the requested
  probe variant, then captures the desktop. Reading the resulting screenshot:

    green crosshair on dark red  -> the probe outranks an ordinary topmost window
    plain dark red               -> it does not

  If CrossOver itself is running, its crosshair appears in the same shot, which
  makes the capture a three-way comparison: shipping v4 (Electron topmost),
  the probe, and the adversary.

  Caveat worth keeping in mind when reading results: this proves z-band
  ordering only. A real exclusive-fullscreen game stops DWM composition, which
  this adversary does not do, so a pass here is necessary but not sufficient.

.EXAMPLE
  zband-test.ps1 -Variant uiaccess
#>

[CmdletBinding()]
param(
	[ValidateSet('uiaccess', 'plain')]
	[string] $Variant = 'uiaccess',

	[string] $AdversaryPath = 'C:\lac5181\dist\crossover-overlay-adversary.exe',
	[string] $ShotPath,
	[int] $SettleSeconds = 4
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $ShotPath) {
	$ShotPath = "C:\lac5181\zband-$Variant.png"
}

function Stop-All {
	foreach ($name in 'crossover-overlay-uiaccess', 'crossover-overlay-plain', 'crossover-overlay-adversary') {
		Get-Process $name -ErrorAction SilentlyContinue | Stop-Process -Force
	}

	foreach ($task in 'CrossOverProbe_uiaccess', 'CrossOverProbe_plain', 'CrossOverAdversary') {
		Unregister-ScheduledTask -TaskName $task -Confirm:$false -ErrorAction SilentlyContinue
	}
}

function Start-Interactive {
	param([string] $TaskName, [string] $Path)

	# Same ShellExecute-via-stub trick as run-probe.ps1: required for the
	# UIAccess binary, harmless for the others, and keeps both launch paths
	# identical so the comparison stays clean.
	$taskAction = New-ScheduledTaskAction `
		-Execute 'powershell.exe' `
		-Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command `"Start-Process -FilePath '$Path'`""
	$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive
	$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

	Register-ScheduledTask -TaskName $TaskName -Action $taskAction -Principal $principal -Settings $settings -Force | Out-Null
	Start-ScheduledTask -TaskName $TaskName
}

Stop-All

$probePath = "$env:ProgramFiles\CrossOver Overlay Probe\crossover-overlay-$Variant.exe"
if (-not (Test-Path $probePath)) { throw "probe not installed: $probePath" }
if (-not (Test-Path $AdversaryPath)) { throw "adversary not found: $AdversaryPath" }

Write-Host 'starting adversary (fullscreen topmost)...'
Start-Interactive -TaskName 'CrossOverAdversary' -Path $AdversaryPath
Start-Sleep -Seconds 2

Write-Host "starting probe ($Variant)..."
Start-Interactive -TaskName "CrossOverProbe_$Variant" -Path $probePath
Start-Sleep -Seconds $SettleSeconds

foreach ($name in "crossover-overlay-$Variant", 'crossover-overlay-adversary') {
	$proc = Get-Process $name -ErrorAction SilentlyContinue
	if ($proc) {
		Write-Host "  running: $name pid=$($proc.Id) session=$($proc.SessionId)"
	} else {
		Write-Warning "  NOT running: $name"
	}
}

# The capture has to happen in session 1 as well: a GDI grab run from the SSH
# session would photograph an empty session-0 desktop.
Remove-Item $ShotPath -ErrorAction SilentlyContinue

$captureScript = Join-Path $scriptDir 'capture.ps1'
$captureAction = New-ScheduledTaskAction `
	-Execute 'powershell.exe' `
	-Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$captureScript`" -Out `"$ShotPath`""
$capturePrincipal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive

Register-ScheduledTask -TaskName 'CrossOverCapture' -Action $captureAction -Principal $capturePrincipal -Force | Out-Null
Start-ScheduledTask -TaskName 'CrossOverCapture'

for ($i = 0; $i -lt 20 -and -not (Test-Path $ShotPath); $i++) {
	Start-Sleep -Seconds 1
}

Unregister-ScheduledTask -TaskName 'CrossOverCapture' -Confirm:$false -ErrorAction SilentlyContinue

if (Test-Path $ShotPath) {
	Write-Host "captured: $ShotPath"
} else {
	Write-Warning "capture failed: $ShotPath never appeared"
}

Stop-All
Write-Host 'cleaned up'
