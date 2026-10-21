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
  run-probe.ps1 -Action stop
#>

[CmdletBinding()]
param(
	[ValidateSet('uiaccess', 'plain')]
	[string] $Variant = 'uiaccess',

	[ValidateSet('start', 'stop')]
	[string] $Action = 'start',

	[string] $InstallDir = "$env:ProgramFiles\CrossOver Overlay Probe",

	[string] $UserId = $env:USERNAME
)

$ErrorActionPreference = 'Stop'

$taskName = "CrossOverProbe_$Variant"
$exeName = "crossover-overlay-$Variant"
$exePath = Join-Path $InstallDir "$exeName.exe"

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

if (-not (Test-Path $exePath)) {
	throw "probe not installed: $exePath (run deploy-probe.ps1 first)"
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
$launcher = "Start-Process -FilePath '$exePath'"
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
	Write-Host "started $exeName pid=$($process.Id) session=$($process.SessionId)"
} else {
	$info = Get-ScheduledTaskInfo -TaskName $taskName
	Write-Warning "process not running. Task last result: 0x$('{0:X8}' -f $info.LastTaskResult)"
}
