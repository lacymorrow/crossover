<#
.SYNOPSIS
  Opens Xbox Game Bar in the interactive session and captures the result.

.DESCRIPTION
  Track A helper. Game Bar is normally summoned with Win+G, which cannot be
  sent from an SSH session, so this activates the ms-gamingoverlay: URI from a
  task running in session 1 instead.

  This gets Game Bar on screen and shows which widgets are installed. It does
  NOT pin a widget or enable click-through: both are clicks inside the Game Bar
  UI and need a person at the machine. See README.md, "What still needs hands".
#>

[CmdletBinding()]
param(
	[string] $ShotPath = 'C:\lac5181\gamebar.png',
	[int] $SettleSeconds = 8
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive

function Invoke-InSession {
	param([string] $TaskName, [string] $Argument)

	$taskAction = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $Argument
	Register-ScheduledTask -TaskName $TaskName -Action $taskAction -Principal $principal -Force | Out-Null
	Start-ScheduledTask -TaskName $TaskName
}

Write-Host 'installed Game Bar widgets:'
Get-AppxPackage |
	Where-Object { $_.InstallLocation -and (Test-Path (Join-Path $_.InstallLocation 'AppxManifest.xml')) } |
	Where-Object { (Get-Content (Join-Path $_.InstallLocation 'AppxManifest.xml') -Raw) -match 'microsoft\.gameBarUIExtension' } |
	ForEach-Object { Write-Host "  $($_.Name) $($_.Version)" }

Invoke-InSession -TaskName 'GameBarOpen' -Argument '-NoProfile -WindowStyle Hidden -Command "Start-Process ms-gamingoverlay:"'
Start-Sleep -Seconds $SettleSeconds

Remove-Item $ShotPath -ErrorAction SilentlyContinue
$captureScript = Join-Path $scriptDir 'capture.ps1'
Invoke-InSession -TaskName 'GameBarShot' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$captureScript`" -Out `"$ShotPath`""

for ($i = 0; $i -lt 20 -and -not (Test-Path $ShotPath); $i++) {
	Start-Sleep -Seconds 1
}

foreach ($task in 'GameBarOpen', 'GameBarShot') {
	Unregister-ScheduledTask -TaskName $task -Confirm:$false -ErrorAction SilentlyContinue
}

if (Test-Path $ShotPath) {
	Write-Host "captured: $ShotPath ($((Get-Item $ShotPath).Length) bytes)"
} else {
	Write-Warning 'capture failed'
}
