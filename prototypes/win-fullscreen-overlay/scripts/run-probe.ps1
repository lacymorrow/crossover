<#
.SYNOPSIS
  Starts or stops an overlay probe in the interactive desktop session.

.DESCRIPTION
  An SSH session on Windows lands in session 0, which has no desktop. Anything
  that needs to be seen on screen has to be handed to the logged-in session via
  a scheduled task running as that user with an interactive logon. This script
  is that bridge, so the test matrix can be driven remotely.

  Register-ScheduledTask is used rather than schtasks.exe on purpose: the
  Program Files path contains a space, and passing it through
  ssh -> powershell -> schtasks /TR mangles the quoting and fails with
  0x80070002.

.EXAMPLE
  run-probe.ps1 -Variant uiaccess
  run-probe.ps1 -Variant both      # both at once, side by side, for one photo
  run-probe.ps1 -Action stop
#>

[CmdletBinding()]
param(
	[ValidateSet('uiaccess', 'plain', 'both')]
	[string] $Variant = 'uiaccess',

	[ValidateSet('start', 'stop')]
	[string] $Action = 'start',

	[string] $InstallDir = "$env:ProgramFiles\CrossOver Overlay Probe",

	[string] $UserId = $env:USERNAME,

	[ValidateSet('green', 'magenta', 'cyan', 'yellow', 'red', 'white')]
	[string] $Tint,

	[int] $OffsetX = 0,

	[int] $OffsetY = 0,

	# RegisterHotKey is global, so the two variants cannot share a quit key: the
	# second claim fails with ERROR_HOTKEY_ALREADY_REGISTERED and that probe ends
	# up with no hotkey at all. -Variant both gives uiaccess Q and plain W.
	[ValidatePattern( '^[A-Za-z0-9]$' )]
	[string] $QuitKey,

	# Horizontal separation used by -Variant both: UIAccess goes left of centre
	# in green, plain goes right of centre in magenta. A photo of the monitor
	# then answers both matrix columns at once, and tells which one drew.
	[int] $Separation = 260
)

$ErrorActionPreference = 'Stop'

function Stop-Probe {
	foreach ($name in 'crossover-overlay-uiaccess', 'crossover-overlay-plain') {
		Get-Process $name -ErrorAction SilentlyContinue | Stop-Process -Force
	}

	foreach ($task in 'CrossOverProbe_uiaccess', 'CrossOverProbe_plain') {
		Unregister-ScheduledTask -TaskName $task -Confirm:$false -ErrorAction SilentlyContinue
	}

	Write-Host 'probes stopped'
}

if ($Action -eq 'stop') {
	Stop-Probe
	return
}

Stop-Probe

# A uiAccess="true" binary cannot be started with CreateProcess: that path fails
# with ERROR_ELEVATION_REQUIRED (0x800702E4), because granting UIAccess is the
# AppInfo/UAC broker's job and only ShellExecute routes through it. Task
# Scheduler launches via CreateProcess, so the task starts a PowerShell stub
# whose Start-Process call does the ShellExecute. The plain control build starts
# either way; wrapping both keeps the two paths identical apart from the
# manifest.
#
# This matters beyond the probe: if v4 ever ships a UIAccess helper, Electron's
# child_process.spawn is also CreateProcess and would hit the same error.
function Start-Probe {
	param(
		[string] $Which,
		[string] $ProbeTint,
		[int] $ProbeOffsetX,
		[int] $ProbeOffsetY,
		[string] $ProbeQuitKey
	)

	$exeName = "crossover-overlay-$Which"
	$exePath = Join-Path $InstallDir "$exeName.exe"
	$taskName = "CrossOverProbe_$Which"

	if (-not (Test-Path $exePath)) {
		throw "probe not installed: $exePath (run deploy-probe.ps1 first)"
	}

	$probeArgs = "--tint $ProbeTint --offset-x $ProbeOffsetX --offset-y $ProbeOffsetY --quit-key $ProbeQuitKey"
	$launcher = "Start-Process -FilePath '$exePath' -ArgumentList '$probeArgs'"
	$taskAction = New-ScheduledTaskAction `
		-Execute 'powershell.exe' `
		-Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command `"$launcher`""
	$principal = New-ScheduledTaskPrincipal -UserId $UserId -LogonType Interactive
	$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

	Register-ScheduledTask -TaskName $taskName -Action $taskAction -Principal $principal -Settings $settings -Force | Out-Null
	Start-ScheduledTask -TaskName $taskName

	Start-Sleep -Seconds 3

	$process = Get-Process $exeName -ErrorAction SilentlyContinue
	if ($process) {
		Write-Host "started $exeName pid=$($process.Id) session=$($process.SessionId) tint=$ProbeTint offset=$ProbeOffsetX,$ProbeOffsetY quit=ctrl+alt+shift+$ProbeQuitKey"
	} else {
		$info = Get-ScheduledTaskInfo -TaskName $taskName
		Write-Warning "process not running. Task last result: 0x$('{0:X8}' -f $info.LastTaskResult)"
	}
}

if ($Variant -eq 'both') {
	Start-Probe -Which 'uiaccess' -ProbeTint 'green'   -ProbeOffsetX ( $OffsetX - $Separation ) -ProbeOffsetY $OffsetY -ProbeQuitKey 'Q'
	Start-Probe -Which 'plain'    -ProbeTint 'magenta' -ProbeOffsetX ( $OffsetX + $Separation ) -ProbeOffsetY $OffsetY -ProbeQuitKey 'W'
	Write-Host ''
	Write-Host 'green crosshair   = UIAccess probe (left of centre),  quit: ctrl+alt+shift+Q'
	Write-Host 'magenta crosshair = plain topmost  (right of centre), quit: ctrl+alt+shift+W'
} else {
	if (-not $Tint) {
		if ($Variant -eq 'uiaccess') { $Tint = 'green' } else { $Tint = 'magenta' }
	}

	if (-not $QuitKey) {
		if ($Variant -eq 'uiaccess') { $QuitKey = 'Q' } else { $QuitKey = 'W' }
	}

	Start-Probe -Which $Variant -ProbeTint $Tint -ProbeOffsetX $OffsetX -ProbeOffsetY $OffsetY -ProbeQuitKey $QuitKey
}
