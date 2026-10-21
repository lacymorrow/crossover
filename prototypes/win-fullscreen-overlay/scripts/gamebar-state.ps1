<#
.SYNOPSIS
  Reports whether Game Bar is enabled and whether it is currently running.

.DESCRIPTION
  Used to tell two very different failures apart after gamebar-open.ps1:
  Game Bar never launched, versus Game Bar launched but is invisible to GDI
  capture. The second case is the one that matters for LAC-5181, because it
  means track A cannot be signed off from a screenshot.
#>

$ErrorActionPreference = 'Continue'

Write-Host '--- Game Bar policy / settings ---'
$keys = @(
	@{ Path = 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\GameDVR'; Name = 'AppCaptureEnabled' },
	@{ Path = 'HKCU:\System\GameConfigStore'; Name = 'GameDVR_Enabled' },
	@{ Path = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\GameDVR'; Name = 'AllowGameDVR' },
	@{ Path = 'HKCU:\SOFTWARE\Microsoft\GameBar'; Name = 'UseNexusForGameBarEnabled' },
	@{ Path = 'HKCU:\SOFTWARE\Microsoft\GameBar'; Name = 'ShowStartupPanel' }
)

foreach ($key in $keys) {
	$value = (Get-ItemProperty -Path $key.Path -Name $key.Name -ErrorAction SilentlyContinue).$($key.Name)
	if ($null -eq $value) { $value = '(unset)' }
	Write-Host "  $($key.Path)\$($key.Name) = $value"
}

Write-Host ''
Write-Host '--- Game Bar processes ---'
$procs = Get-Process -ErrorAction SilentlyContinue |
	Where-Object { $_.Name -match 'GameBar|XboxGam|GameBarFT|UltimateCrosshair|Ultimate Crosshair' }

if ($procs) {
	$procs | Select-Object Name, Id, SessionId, MainWindowTitle | Format-Table -AutoSize | Out-String | Write-Host
} else {
	Write-Host '  none running'
}
