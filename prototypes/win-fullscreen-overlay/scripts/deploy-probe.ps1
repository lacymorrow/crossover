<#
.SYNOPSIS
  Signs and installs the CrossOver overlay probes on a Windows test machine.

.DESCRIPTION
  UIAccess is only granted when all three conditions hold, so this script sets
  up all three and then verifies them rather than assuming:

    1. the exe declares uiAccess="true" in its manifest   (done at build time)
    2. the exe is Authenticode-signed by a trusted root   (done here)
    3. the exe runs from a secure path, e.g. Program Files (done here)

  The certificate created here is a throwaway for testing only. Run
  remove-probe.ps1 when the test matrix is finished -- a trusted root cert left
  behind on a machine is a real liability, not a stray temp file.

.NOTES
  Run elevated. Test machines only (LAC-5181 uses "otto"), never a daily driver.
#>

[CmdletBinding()]
param(
	[string] $Source = "C:\lac5181\dist",
	[string] $InstallDir = "$env:ProgramFiles\CrossOver Overlay Probe",
	[string] $CertSubject = "CN=CrossOver LAC-5181 Test Signing"
)

$ErrorActionPreference = 'Stop'

function Assert-Elevated {
	$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
	if (-not ([Security.Principal.WindowsPrincipal] $identity).IsInRole('Administrators')) {
		throw 'This script must run elevated.'
	}
}

function Get-SignTool {
	$candidates = Get-ChildItem "${env:ProgramFiles(x86)}\Windows Kits\10\bin" -Recurse -Filter signtool.exe -ErrorAction SilentlyContinue |
		Where-Object { $_.FullName -match '\\x64\\' }

	if (-not $candidates) {
		throw 'signtool.exe not found. Install the Windows 10 SDK.'
	}

	return ($candidates | Sort-Object FullName -Descending | Select-Object -First 1).FullName
}

Assert-Elevated

$signtool = Get-SignTool
Write-Host "signtool: $signtool"

# --- certificate -----------------------------------------------------------
$cert = Get-ChildItem Cert:\LocalMachine\My | Where-Object { $_.Subject -eq $CertSubject } | Select-Object -First 1

if ($cert) {
	Write-Host "reusing existing test cert $($cert.Thumbprint)"
} else {
	Write-Host 'creating self-signed code-signing cert...'
	$cert = New-SelfSignedCertificate `
		-Type CodeSigningCert `
		-Subject $CertSubject `
		-CertStoreLocation Cert:\LocalMachine\My `
		-KeyUsage DigitalSignature `
		-KeyExportPolicy Exportable `
		-NotAfter (Get-Date).AddMonths(3)

	Write-Host "created $($cert.Thumbprint)"
}

# UIAccess validates the signing chain, so the test root has to be trusted
# machine-wide. TrustedPublisher additionally suppresses the SmartScreen-style
# publisher prompt on launch.
foreach ($store in 'Root', 'TrustedPublisher') {
	$existing = Get-ChildItem "Cert:\LocalMachine\$store" | Where-Object { $_.Thumbprint -eq $cert.Thumbprint }
	if (-not $existing) {
		Write-Host "trusting cert in LocalMachine\$store..."
		$target = New-Object System.Security.Cryptography.X509Certificates.X509Store($store, 'LocalMachine')
		$target.Open('ReadWrite')
		$target.Add($cert)
		$target.Close()
	}
}

# --- install ---------------------------------------------------------------
if (-not (Test-Path $InstallDir)) {
	New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

$exes = Get-ChildItem $Source -Filter 'crossover-overlay-*.exe'
if (-not $exes) {
	throw "no probe binaries found in $Source"
}

foreach ($exe in $exes) {
	$dest = Join-Path $InstallDir $exe.Name
	Copy-Item $exe.FullName $dest -Force

	Write-Host "signing $($exe.Name)..."
	& $signtool sign /fd SHA256 /sm /sha1 $cert.Thumbprint $dest
	if ($LASTEXITCODE -ne 0) {
		throw "signtool failed for $($exe.Name) (exit $LASTEXITCODE)"
	}

	& $signtool verify /pa /v $dest | Out-Null
	if ($LASTEXITCODE -ne 0) {
		throw "signature verification failed for $($exe.Name) -- UIAccess will be refused"
	}

	Write-Host "  installed and verified: $dest"
}

Write-Host ''
Write-Host "done. Probes installed to: $InstallDir"
Write-Host 'Launch them in the interactive session (run-probe.ps1), not over SSH:'
Write-Host '  a UIAccess process started from session 0 will not reach the desktop.'
