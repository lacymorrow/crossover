<#
.SYNOPSIS
  Removes everything deploy-probe.ps1 put on the test machine.

.DESCRIPTION
  Run this when the LAC-5181 matrix is finished. The important part is the
  certificate: deploy-probe.ps1 adds a self-signed cert to LocalMachine\Root,
  which means anything signed with it is trusted machine-wide. Leaving that on
  a box after testing is a real liability, not leftover clutter.

  Optionally also removes the third-party Game Bar widgets installed for the
  track A comparison, with -RemoveWidgets.
#>

[CmdletBinding()]
param(
	[string] $InstallDir = "$env:ProgramFiles\CrossOver Overlay Probe",
	[string] $CertSubject = 'CN=CrossOver LAC-5181 Test Signing',
	[string] $ScratchDir = 'C:\lac5181',
	[switch] $RemoveWidgets
)

$ErrorActionPreference = 'Continue'

Write-Host 'stopping probes...'
foreach ($name in 'crossover-overlay-uiaccess', 'crossover-overlay-plain', 'crossover-overlay-adversary') {
	Get-Process $name -ErrorAction SilentlyContinue | Stop-Process -Force
}

Write-Host 'removing scheduled tasks...'
foreach ($task in 'CrossOverProbe_uiaccess', 'CrossOverProbe_plain', 'CrossOverAdversary',
	'CrossOverCapture', 'GameBarOpen', 'GameBarShot', 'LAC5181Shot', 'LAC5181Probe', 'LAC5181ProbePlain') {
	Unregister-ScheduledTask -TaskName $task -Confirm:$false -ErrorAction SilentlyContinue
}

Write-Host 'removing installed binaries...'
Remove-Item $InstallDir -Recurse -Force -ErrorAction SilentlyContinue

Write-Host 'removing test certificate from all stores...'
foreach ($store in 'My', 'Root', 'TrustedPublisher') {
	Get-ChildItem "Cert:\LocalMachine\$store" -ErrorAction SilentlyContinue |
		Where-Object { $_.Subject -eq $CertSubject } |
		ForEach-Object {
			Write-Host "  removing $($_.Thumbprint) from LocalMachine\$store"
			Remove-Item $_.PSPath -Force -ErrorAction SilentlyContinue
		}
}

$remaining = foreach ($store in 'My', 'Root', 'TrustedPublisher') {
	Get-ChildItem "Cert:\LocalMachine\$store" -ErrorAction SilentlyContinue |
		Where-Object { $_.Subject -eq $CertSubject }
}

if ($remaining) {
	Write-Warning 'test certificate still present. Remove it manually before signing off.'
} else {
	Write-Host 'test certificate fully removed.'
}

if ($RemoveWidgets) {
	Write-Host 'removing third-party Game Bar widgets installed for testing...'
	Get-AppxPackage | Where-Object { $_.Name -match 'KGStudio' } | ForEach-Object {
		Write-Host "  removing $($_.Name)"
		Remove-AppxPackage -Package $_.PackageFullName -ErrorAction SilentlyContinue
	}
}

Remove-Item $ScratchDir -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item 'C:\lac5181-shot.ps1' -Force -ErrorAction SilentlyContinue

Write-Host 'done.'
