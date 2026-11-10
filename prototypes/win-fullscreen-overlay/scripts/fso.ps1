<#
.SYNOPSIS
  Reads or flips Windows "fullscreen optimizations" (FSO) for one game exe.

.DESCRIPTION
  FSO is why the LAC-5181 matrix has two fullscreen rows rather than one. With
  FSO on -- the Windows 10/11 default -- a DX10/11/12 game that asks for
  exclusive fullscreen is quietly given a borderless flip-model window instead,
  and an ordinary topmost overlay still draws over it. With FSO off the game
  gets real exclusive fullscreen, DWM stops compositing the desktop, and the
  overlay loses. Testing only the default would therefore measure the easy case
  and report a pass CrossOver users do not see.

  The switch is a per-exe compatibility flag:
    HKCU\...\AppCompatFlags\Layers -> "<exe path>" = "~ DISABLEDXMAXIMIZEDWINDOWEDMODE"

  Honest limits, because reading the matrix depends on them:
  - This flag only governs the DXGI path. A Vulkan or OpenGL title such as
    Quake II RTX ignores it and uses its own exclusive-fullscreen mechanism
    (VK_EXT_full_screen_exclusive), so for those titles the in-game setting is
    the only control and -Disable is a no-op.
  - Some launchers rewrite or relaunch from a different exe. Verify with
    -Status after the game has been restarted, not before.
  - The game must be restarted for a change to take effect. It is read at
    process start.

.EXAMPLE
  fso.ps1 -Exe 'C:\Program Files (x86)\Steam\steamapps\common\Quake II RTX\q2rtx.exe' -Status
  fso.ps1 -Exe '...\FortniteClient-Win64-Shipping.exe' -Disable
#>

[CmdletBinding( DefaultParameterSetName = 'Status' )]
param(
	[Parameter( Mandatory = $true )]
	[string] $Exe,

	[Parameter( ParameterSetName = 'Disable' )]
	[switch] $Disable,

	[Parameter( ParameterSetName = 'Enable' )]
	[switch] $Enable,

	[Parameter( ParameterSetName = 'Status' )]
	[switch] $Status
)

$ErrorActionPreference = 'Stop'

$layers = 'HKCU:\Software\Microsoft\Windows NT\CurrentVersion\AppCompatFlags\Layers'
$flag = 'DISABLEDXMAXIMIZEDWINDOWEDMODE'

if (-not (Test-Path $layers)) {
	New-Item -Path $layers -Force | Out-Null
}

function Get-Layer {
	(Get-ItemProperty -Path $layers -Name $Exe -ErrorAction SilentlyContinue).$Exe
}

function Write-State {
	$value = Get-Layer

	if ($value -and $value -match $flag) {
		Write-Host "FSO off  (exclusive fullscreen allowed) : $Exe"
		Write-Host "  layers value: $value"
	} elseif ($value) {
		Write-Host "FSO on   (other compat layers present)  : $Exe"
		Write-Host "  layers value: $value"
	} else {
		Write-Host "FSO on   (Windows default)              : $Exe"
	}
}

if (-not (Test-Path -LiteralPath $Exe)) {
	Write-Warning "exe not found on disk: $Exe (the flag is keyed by path, so a wrong path silently does nothing)"
}

switch ($PSCmdlet.ParameterSetName) {
	'Disable' {
		# Preserve any layers already set by hand rather than clobbering them.
		$existing = Get-Layer
		$tokens = @()

		if ($existing) {
			$tokens = $existing -split '\s+' | Where-Object { $_ -and $_ -ne '~' }
		}

		if ($tokens -notcontains $flag) {
			$tokens += $flag
		}

		Set-ItemProperty -Path $layers -Name $Exe -Value ( "~ " + ( $tokens -join ' ' ) )
		Write-Host 'FSO disabled. Restart the game for it to take effect.'
		Write-State
	}

	'Enable' {
		$existing = Get-Layer

		if (-not $existing) {
			Write-Host 'already at the Windows default, nothing to do.'
		} else {
			$tokens = $existing -split '\s+' | Where-Object { $_ -and $_ -ne '~' -and $_ -ne $flag }

			if ($tokens.Count -eq 0) {
				Remove-ItemProperty -Path $layers -Name $Exe -ErrorAction SilentlyContinue
			} else {
				Set-ItemProperty -Path $layers -Name $Exe -Value ( "~ " + ( $tokens -join ' ' ) )
			}

			Write-Host 'FSO re-enabled. Restart the game for it to take effect.'
		}

		Write-State
	}

	default { Write-State }
}
