<#
.SYNOPSIS
  Parse-checks every prototype PowerShell script.

.DESCRIPTION
  These scripts are run by hand at the Windows test box, often mid-session with
  a game open. A syntax error found there costs a whole trip to the machine, so
  the parser runs here instead. It checks syntax only: nothing is executed and
  nothing Windows-specific is touched, so this works on macOS pwsh too.

.EXAMPLE
  pwsh -NoProfile -File test/lint-scripts.ps1
#>

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent ( Split-Path -Parent $MyInvocation.MyCommand.Path )
$scripts = Get-ChildItem -Path $root -Filter '*.ps1' -Recurse | Sort-Object FullName
$failed = 0

foreach ($script in $scripts) {
	$tokens = $null
	$errors = $null
	[System.Management.Automation.Language.Parser]::ParseFile( $script.FullName, [ref] $tokens, [ref] $errors ) | Out-Null

	$relative = $script.FullName.Substring( $root.Length ).TrimStart( '/', '\' )

	if ($errors -and $errors.Count -gt 0) {
		Write-Host "FAIL $relative"
		foreach ($parseError in $errors) {
			Write-Host "     line $($parseError.Extent.StartLineNumber): $($parseError.Message)"
		}
		$failed++
	} else {
		Write-Host "ok   $relative"
	}
}

Write-Host ''
if ($failed -gt 0) {
	Write-Host "$failed script(s) failed to parse"
	exit 1
}

Write-Host "$($scripts.Count) script(s) parsed cleanly"
