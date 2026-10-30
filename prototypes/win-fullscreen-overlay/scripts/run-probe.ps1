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
  run-probe.ps1 -Variant all       # all three at once, for one photo
  run-probe.ps1 -Action stop

.NOTES
  Three variants, not two. "plain" and "v4parity" are the same binary; the only
  difference is that v4parity passes --no-reassert, so it asks for topmost once
  and never again, which is what CrossOver v4 actually does. "plain" re-asserts
  at 1 Hz and is therefore stronger than the shipping product. The 2026-10-24
  pass had no v4parity crosshair, which is why it could not distinguish "the
  game was never exclusive fullscreen" from "v4 simply stopped asking".
#>

[CmdletBinding()]
param(
	[ValidateSet('uiaccess', 'plain', 'v4parity', 'both', 'all')]
	[string] $Variant = 'uiaccess',

	[ValidateSet('start', 'stop')]
	[string] $Action = 'start',

	[string] $InstallDir = "$env:ProgramFiles\CrossOver Overlay Probe",

	[string] $UserId = $env:USERNAME,

	[ValidateSet('green', 'magenta', 'cyan', 'yellow', 'red', 'white')]
	[string] $Tint,

	[int] $OffsetX = 0,

	[int] $OffsetY = 0,

	# RegisterHotKey is global, so the variants cannot share a quit key: the
	# second claim fails with ERROR_HOTKEY_ALREADY_REGISTERED and that probe ends
	# up with no hotkey at all. Q = uiaccess, W = plain, E = v4parity.
	[ValidatePattern( '^[A-Za-z0-9]$' )]
	[string] $QuitKey,

	# Horizontal separation used by -Variant both/all: UIAccess goes left of
	# centre in green, plain goes right of centre in magenta. A photo of the
	# monitor then answers the matrix columns at once, and tells which one drew.
	[int] $Separation = 260,

	# v4parity sits below the other two rather than beside them: the pinned Game
	# Bar widget occupies the centre of the row, and a cyan crosshair drawn on
	# top of a white one is not a photo anybody can read.
	[int] $ParityDrop = 220
)

$ErrorActionPreference = 'Stop'

function Stop-Probe {
	foreach ($name in 'crossover-overlay-uiaccess', 'crossover-overlay-plain') {
		Get-Process $name -ErrorAction SilentlyContinue | Stop-Process -Force
	}

	foreach ($task in 'CrossOverProbe_uiaccess', 'CrossOverProbe_plain', 'CrossOverProbe_v4parity') {
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
		[string] $ProbeQuitKey,
		[switch] $NoReassert
	)

	# v4parity is not its own binary: it is the plain build with the 1 Hz
	# topmost timer turned off. Only the task name distinguishes them, so that
	# -Variant all can register both without one clobbering the other.
	$exeVariant = if ($Which -eq 'v4parity') { 'plain' } else { $Which }
	$exeName = "crossover-overlay-$exeVariant"
	$exePath = Join-Path $InstallDir "$exeName.exe"
	$taskName = "CrossOverProbe_$Which"

	if (-not (Test-Path $exePath)) {
		throw "probe not installed: $exePath (run deploy-probe.ps1 first)"
	}

	$probeArgs = "--tint $ProbeTint --offset-x $ProbeOffsetX --offset-y $ProbeOffsetY --quit-key $ProbeQuitKey"
	if ($NoReassert) {
		$probeArgs += ' --no-reassert'
	}
	$launcher = "Start-Process -FilePath '$exePath' -ArgumentList '$probeArgs'"
	$taskAction = New-ScheduledTaskAction `
		-Execute 'powershell.exe' `
		-Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command `"$launcher`""
	$principal = New-ScheduledTaskPrincipal -UserId $UserId -LogonType Interactive
	$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

	Register-ScheduledTask -TaskName $taskName -Action $taskAction -Principal $principal -Settings $settings -Force | Out-Null
	Start-ScheduledTask -TaskName $taskName

	Start-Sleep -Seconds 3

	# plain and v4parity share a process name, so take the newest rather than
	# assuming a single match (Get-Process returns an array and $process.Id
	# would then be an array too, printing "started ... pid=1234 5678").
	#
	# StartTime is read defensively: it throws on a process this session cannot
	# open, and with $ErrorActionPreference = 'Stop' at the top of this script
	# that would abort the trial over a line of diagnostic output.
	$running = @( Get-Process $exeName -ErrorAction SilentlyContinue )
	$process = try {
		$running | Sort-Object StartTime -ErrorAction Stop | Select-Object -Last 1
	} catch {
		$running | Select-Object -Last 1
	}

	if ($process) {
		Write-Host "started $Which ($exeName) pid=$($process.Id) session=$($process.SessionId) tint=$ProbeTint offset=$ProbeOffsetX,$ProbeOffsetY quit=ctrl+alt+shift+$ProbeQuitKey reassert=$(if ($NoReassert) { 'once (v4 parity)' } else { '1hz' })"
	} else {
		$info = Get-ScheduledTaskInfo -TaskName $taskName
		Write-Warning "process not running. Task last result: 0x$('{0:X8}' -f $info.LastTaskResult)"
	}
}

if ($Variant -eq 'both' -or $Variant -eq 'all') {
	Start-Probe -Which 'uiaccess' -ProbeTint 'green'   -ProbeOffsetX ( $OffsetX - $Separation ) -ProbeOffsetY $OffsetY -ProbeQuitKey 'Q'
	Start-Probe -Which 'plain'    -ProbeTint 'magenta' -ProbeOffsetX ( $OffsetX + $Separation ) -ProbeOffsetY $OffsetY -ProbeQuitKey 'W'

	if ($Variant -eq 'all') {
		Start-Probe -Which 'v4parity' -ProbeTint 'cyan' -ProbeOffsetX $OffsetX -ProbeOffsetY ( $OffsetY + $ParityDrop ) -ProbeQuitKey 'E' -NoReassert
	}

	Write-Host ''
	Write-Host 'green crosshair   = UIAccess probe (left of centre),  quit: ctrl+alt+shift+Q'
	Write-Host 'magenta crosshair = plain topmost, re-asserted at 1 Hz (right of centre), quit: ctrl+alt+shift+W'

	if ($Variant -eq 'all') {
		Write-Host 'cyan crosshair    = v4 parity: topmost asked for once only (below centre), quit: ctrl+alt+shift+E'
		Write-Host ''
		Write-Host 'cyan missing while magenta is present = v4 loses because it stops asking, not because of the z-band.'
	}
} else {
	if (-not $Tint) {
		$Tint = switch ($Variant) {
			'uiaccess' { 'green' }
			'v4parity' { 'cyan' }
			default    { 'magenta' }
		}
	}

	if (-not $QuitKey) {
		$QuitKey = switch ($Variant) {
			'uiaccess' { 'Q' }
			'v4parity' { 'E' }
			default    { 'W' }
		}
	}

	Start-Probe -Which $Variant -ProbeTint $Tint -ProbeOffsetX $OffsetX -ProbeOffsetY $OffsetY -ProbeQuitKey $QuitKey -NoReassert:( $Variant -eq 'v4parity' )
}
