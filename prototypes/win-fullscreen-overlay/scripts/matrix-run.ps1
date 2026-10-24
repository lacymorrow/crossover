<#
.SYNOPSIS
  Drives the LAC-5181 test matrix, one trial at a time, at the test box.

.DESCRIPTION
  The matrix cannot be filled in over SSH: taking a game into exclusive
  fullscreen is in-game navigation, pinning a Game Bar widget is a click inside
  the Game Bar UI, and Game Bar is invisible to screen capture so the ground
  truth for track A has to be a photo of the monitor. This script does
  everything around those human steps, so the human part stays "launch a game,
  take a photo, answer three questions".

  One trial = one game in one display mode, with all three overlays on screen
  at once:

    green crosshair,  left of centre   UIAccess probe        (track B)
    magenta crosshair, right of centre plain topmost probe   (the baseline:
                                                              what v4 does now)
    the pinned Game Bar widget         third-party widget    (track A)

  A single photo therefore answers all three matrix columns and is
  self-evidencing: if only the green one is in the photo, UIAccess won and
  plain lost, and no note-taking is needed to tell them apart.

  Per trial it records a CSV row, a JSON file of machine-read facts (probe
  UIAccess token state, foreground window style and rect, FSO flag, Game Bar
  process state), and a delayed desktop screenshot taken while the game is
  still in front. That screenshot is secondary evidence with a useful quirk: a
  frame that comes back black or stale is itself good evidence the game really
  was in exclusive fullscreen rather than a borderless window.

.NOTES
  Run this at the machine, in the interactive session, in an elevated
  PowerShell. Test boxes only (otto), never a daily driver.

  Anti-cheat: offline, practice, lobby or Creative modes only. Never ranked or
  competitive play with either overlay running.

.EXAMPLE
  # the mode that actually matters, across every game, first
  matrix-run.ps1 -Modes exclusive

  # then the rest
  matrix-run.ps1 -Modes fso,borderless

  # one game, picking up where you left off
  matrix-run.ps1 -Games quake2rtx
#>

[CmdletBinding()]
param(
	[ValidateSet( 'quake2rtx', 'fortnite', 'arcraiders', 'sims4', 'uncrashed' )]
	[string[]] $Games = @( 'quake2rtx', 'fortnite', 'arcraiders', 'sims4', 'uncrashed' ),

	[ValidateSet( 'exclusive', 'fso', 'borderless' )]
	[string[]] $Modes = @( 'exclusive', 'fso', 'borderless' ),

	[string] $ScratchDir = 'C:\lac5181',

	[string] $InstallDir = "$env:ProgramFiles\CrossOver Overlay Probe",

	# Seconds after the prompt appears before the desktop screenshot is taken.
	# Long enough to be back in the game, short enough not to stall the run.
	[int] $CaptureDelay = 25
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$resultsDir = Join-Path $ScratchDir 'results'
$csvPath = Join-Path $resultsDir 'trials.csv'
$gameCachePath = Join-Path $ScratchDir 'games.json'

New-Item -ItemType Directory -Force -Path $resultsDir | Out-Null

if (-not ( 'Lac5181.Win' -as [type] )) {
	Add-Type -Namespace Lac5181 -Name Win -MemberDefinition @'
	[DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
	[DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
	[DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
	[DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowTextW(IntPtr hWnd, System.Text.StringBuilder text, int count);
	[DllImport("user32.dll")] public static extern int GetWindowLongW(IntPtr hWnd, int index);
	public struct RECT { public int Left, Top, Right, Bottom; }
'@
}

# The exe is what FSO is keyed on, and the matrix has to say which binary was
# measured, so the path is resolved once per game and remembered. Asking the
# foreground window beats guessing at install paths: launchers relaunch from
# unexpected exes (Fortnite's shipping binary is not FortniteLauncher.exe).
function Get-GameCache {
	if (Test-Path $gameCachePath) {
		$raw = Get-Content -Raw -LiteralPath $gameCachePath | ConvertFrom-Json
		$table = @{}
		foreach ($property in $raw.PSObject.Properties) { $table[$property.Name] = $property.Value }
		return $table
	}

	return @{}
}

function Save-GameCache($table) {
	$table | ConvertTo-Json | Set-Content -LiteralPath $gameCachePath -Encoding UTF8
}

function Resolve-GameExe($game) {
	$cache = Get-GameCache

	if ($cache.ContainsKey($game.Key) -and $cache[$game.Key]) {
		return $cache[$game.Key]
	}

	Write-Host ''
	Write-Host "First time testing $($game.Name). I need its exe path once, to set the fullscreen-optimizations flag."
	Write-Host "Launch $($game.Name), let it reach its menu, click on it, then alt-tab back here and press Enter."
	Read-Host 'Enter when the game is running' | Out-Null

	Write-Host 'Click the game window now. Reading the foreground window in 8 seconds...'
	Start-Sleep -Seconds 8

	$path = (Get-ForegroundProcess).Path

	if (-not $path) {
		$path = Read-Host 'Could not read it. Paste the full exe path'
	} else {
		Write-Host "found: $path"
		$answer = Read-Host 'Is that the game? [Y/n]'
		if ($answer -and $answer -notmatch '^(y|yes)$') {
			$path = Read-Host 'Paste the full exe path instead'
		}
	}

	$cache[$game.Key] = $path
	Save-GameCache $cache
	return $path
}

function Get-ForegroundProcess {
	$hwnd = [Lac5181.Win]::GetForegroundWindow()

	# Not $pid: that name is a read-only automatic variable and assigning to it
	# throws.
	[uint32] $foregroundPid = 0
	[Lac5181.Win]::GetWindowThreadProcessId($hwnd, [ref] $foregroundPid) | Out-Null

	$title = New-Object System.Text.StringBuilder 512
	[Lac5181.Win]::GetWindowTextW($hwnd, $title, $title.Capacity) | Out-Null

	$rect = New-Object -TypeName 'Lac5181.Win+RECT'
	[Lac5181.Win]::GetWindowRect($hwnd, [ref] $rect) | Out-Null

	$process = Get-Process -Id $foregroundPid -ErrorAction SilentlyContinue
	$path = $null
	$processName = $null
	if ($process) {
		$processName = $process.ProcessName
		try { $path = $process.Path } catch { $path = $null }
	}

	# -16 = GWL_STYLE, -20 = GWL_EXSTYLE. WS_POPUP + screen-sized + topmost is
	# the signature of a borderless or FSO window; a true exclusive-fullscreen
	# game often looks the same from here, which is exactly why the photo and
	# the capture matter more than these numbers.
	[pscustomobject] @{
		Hwnd = [int64] $hwnd
		Pid = [int] $foregroundPid
		Name = $processName
		Path = $path
		Title = $title.ToString()
		Rect = "$($rect.Left),$($rect.Top),$($rect.Right),$($rect.Bottom)"
		Style = '0x{0:X8}' -f [Lac5181.Win]::GetWindowLongW($hwnd, -16)
		ExStyle = '0x{0:X8}' -f [Lac5181.Win]::GetWindowLongW($hwnd, -20)
	}
}

function Get-ProbeFacts {
	$facts = @{}

	foreach ($variant in 'uiaccess', 'plain') {
		$name = "crossover-overlay-$variant"
		$process = Get-Process $name -ErrorAction SilentlyContinue
		$logPath = Join-Path $env:TEMP 'crossover-overlay-probe.log'
		$token = 'unknown'

		if (Test-Path $logPath) {
			$line = Select-String -Path $logPath -Pattern 'uiaccess=(\w+)' -ErrorAction SilentlyContinue |
				Select-Object -Last 1
			if ($line) { $token = $line.Matches[0].Groups[1].Value }
		}

		$probePid = $null
		$probeSession = $null
		if ($process) {
			$probePid = $process.Id
			$probeSession = $process.SessionId
		}

		$facts[$variant] = [pscustomobject] @{
			Running = [bool] $process
			Pid = $probePid
			Session = $probeSession
			LastLoggedUIAccess = $token
		}
	}

	return $facts
}

function Get-FsoState($exePath) {
	$layers = 'HKCU:\Software\Microsoft\Windows NT\CurrentVersion\AppCompatFlags\Layers'
	$value = (Get-ItemProperty -Path $layers -Name $exePath -ErrorAction SilentlyContinue).$exePath

	if ($value -and $value -match 'DISABLEDXMAXIMIZEDWINDOWEDMODE') { return 'off' }
	return 'on'
}

function Read-Choice($question, $choices) {
	while ($true) {
		$answer = Read-Host "$question [$($choices -join '/')]"
		if ($choices -contains $answer) { return $answer }
		Write-Host "  answer one of: $($choices -join ', ')"
	}
}

$catalogue = @(
	[pscustomobject] @{
		Key = 'quake2rtx'; Name = 'Quake II RTX'; Api = 'Vulkan'
		Covers = 'issue #416 (Vulkan)'
		AntiCheat = 'none'
		Notes = 'Vulkan ignores the FSO compat flag and drives exclusive fullscreen itself. Use the in-game Video setting (or the console: vid_fullscreen 1). The FSO rows are still worth recording for comparison, but expect them to behave the same.'
	}
	[pscustomobject] @{
		Key = 'fortnite'; Name = 'Fortnite'; Api = 'DX11/DX12'
		Covers = 'issue #351'
		AntiCheat = 'Easy Anti-Cheat'
		Notes = 'EAC title. Lobby or Creative only, never a ranked or competitive match. The lobby renders fullscreen and is enough to answer the question. Set Display Resolution mode in Video settings.'
	}
	[pscustomobject] @{
		Key = 'arcraiders'; Name = 'ARC Raiders'; Api = 'DX12'
		Covers = 'a second anti-cheat DX12 title'
		AntiCheat = 'Easy Anti-Cheat'
		Notes = 'Menu or practice only. Do not queue into a live raid with the overlays running.'
	}
	[pscustomobject] @{
		Key = 'sims4'; Name = 'The Sims 4'; Api = 'DX9/DX11'
		Covers = 'the no-anti-cheat control'
		AntiCheat = 'none'
		Notes = 'The clean control: if an overlay fails here, it is not anti-cheat doing it.'
	}
	[pscustomobject] @{
		Key = 'uncrashed'; Name = 'Uncrashed FPV'; Api = 'Unreal / DX12'
		Covers = 'the FPV-sim audience CrossOver actually has'
		AntiCheat = 'none'
		Notes = 'Freestyle map is fine. Closest title on this box to what CrossOver users fly.'
	}
)

$modeHelp = @{
	exclusive = 'in-game Video settings -> Fullscreen, with fullscreen optimizations DISABLED (this script sets that flag for you; the game must then be restarted)'
	fso = 'in-game Video settings -> Fullscreen, with fullscreen optimizations at the Windows default'
	borderless = 'in-game Video settings -> Windowed Borderless (sometimes called Windowed Fullscreen)'
}

Write-Host ''
Write-Host '=== LAC-5181 matrix run ==='
Write-Host ''

foreach ($variant in 'uiaccess', 'plain') {
	$exe = Join-Path $InstallDir "crossover-overlay-$variant.exe"
	if (-not (Test-Path $exe)) {
		throw "probe not installed: $exe`nRun deploy-probe.ps1 first (elevated)."
	}
}

$widgets = Get-AppxPackage | Where-Object { $_.Name -match 'crosshair|gamebar|hudsight' } | Select-Object -ExpandProperty Name
if ($widgets) {
	Write-Host 'Game Bar widget packages installed:'
	$widgets | ForEach-Object { Write-Host "  $_" }
} else {
	Write-Warning 'no crosshair widget package found. Track A columns will be recorded as n/a.'
}

Write-Host ''
Write-Host 'Before the first trial, pin the widget once: Win+G -> Widget menu -> the crosshair'
Write-Host 'widget -> the pin icon in its title bar. Pinning is what keeps it on screen after'
Write-Host 'Game Bar closes, so it then shows up in every trial without further clicks.'
Write-Host ''
$widgetPinned = Read-Choice 'Is the crosshair widget pinned?' @( 'y', 'n' )

$trials = @()
foreach ($gameKey in $Games) {
	foreach ($mode in $Modes) {
		$trials += [pscustomobject] @{ Game = ( $catalogue | Where-Object { $_.Key -eq $gameKey } ); Mode = $mode }
	}
}

Write-Host ''
if ($trials.Count -eq 1) {
	Write-Host '1 trial queued.'
} else {
	Write-Host "$($trials.Count) trials queued."
}

$index = 0
foreach ($trial in $trials) {
	$index++
	$game = $trial.Game
	$mode = $trial.Mode
	$id = 'T{0:d2}' -f $index
	$stem = "$id-$($game.Key)-$mode"

	Write-Host ''
	Write-Host ('-' * 70)
	Write-Host "$id  ($index of $($trials.Count))   $($game.Name)   mode: $mode"
	Write-Host ('-' * 70)
	Write-Host "api:        $($game.Api)"
	Write-Host "covers:     $($game.Covers)"
	Write-Host "anti-cheat: $($game.AntiCheat)"
	Write-Host "notes:      $($game.Notes)"
	Write-Host ''

	$skip = Read-Choice 'Run this trial?' @( 'y', 'n' )
	if ($skip -eq 'n') {
		Write-Host 'skipped.'
		continue
	}

	$exePath = Resolve-GameExe $game

	if ($mode -eq 'exclusive') {
		& (Join-Path $scriptDir 'fso.ps1') -Exe $exePath -Disable | Out-Host
	} else {
		& (Join-Path $scriptDir 'fso.ps1') -Exe $exePath -Enable | Out-Host
	}

	Write-Host ''
	Write-Host 'starting both probes...'
	& (Join-Path $scriptDir 'run-probe.ps1') -Variant both -InstallDir $InstallDir | Out-Host

	$screenshot = Join-Path $resultsDir "$stem-screen.png"
	$captureJob = Start-Job -ScriptBlock {
		param( $script, $out, $delay )
		Start-Sleep -Seconds $delay
		& $script -Out $out
	} -ArgumentList ( Join-Path $scriptDir 'capture.ps1' ), $screenshot, $CaptureDelay

	Write-Host ''
	Write-Host 'Now, at the machine:'
	Write-Host "  1. launch $($game.Name) (restart it if it was already running: the FSO flag is read at startup)"
	Write-Host "  2. set: $($modeHelp[$mode])"
	Write-Host '  3. photograph the middle of the monitor with your phone'
	Write-Host "     save it later as evidence/matrix/$stem.jpg"
	Write-Host '  4. alt-tab back here'
	Write-Host ''
	Write-Host '  in the photo:  green crosshair, left  = UIAccess probe'
	Write-Host '                 magenta crosshair, right = plain topmost (what v4 does today)'
	Write-Host '                 the widget crosshair     = Game Bar / track A'
	Write-Host ''
	Write-Host '  stuck crosshair? ctrl+alt+shift+Q kills green, ctrl+alt+shift+W kills magenta.'
	Write-Host ''
	Read-Host 'Enter once the photo is taken' | Out-Null

	$foreground = Get-ForegroundProcess
	Receive-Job $captureJob -Wait -AutoRemoveJob -ErrorAction SilentlyContinue | Out-Host

	Write-Host ''
	$uiaccessVisible = Read-Choice '  green (UIAccess) crosshair visible over the game?' @( 'y', 'n', 'partial' )
	$plainVisible = Read-Choice '  magenta (plain topmost) crosshair visible over the game?' @( 'y', 'n', 'partial' )

	if ($widgetPinned -eq 'y') {
		$widgetVisible = Read-Choice '  Game Bar widget crosshair visible over the game?' @( 'y', 'n', 'partial' )
		$widgetSurvived = Read-Choice '  was the widget still there with Game Bar closed?' @( 'y', 'n' )
	} else {
		$widgetVisible = 'n/a'
		$widgetSurvived = 'n/a'
	}

	$antiCheatWarning = Read-Choice '  any anti-cheat warning, kick or ban notice?' @( 'y', 'n' )
	$notes = Read-Host '  notes (Enter to skip)'

	$facts = [pscustomobject] @{
		Trial = $id
		Timestamp = (Get-Date).ToString( 'o' )
		Game = $game.Name
		GameKey = $game.Key
		Api = $game.Api
		Mode = $mode
		GameExe = $exePath
		FsoState = Get-FsoState $exePath
		Probes = Get-ProbeFacts
		Foreground = $foreground
		GameBarRunning = [bool] ( Get-Process GameBar -ErrorAction SilentlyContinue )
		WidgetPackages = $widgets
		Screenshot = $screenshot
		PhotoExpected = "evidence/matrix/$stem.jpg"
		Answers = [pscustomobject] @{
			UIAccessVisible = $uiaccessVisible
			PlainVisible = $plainVisible
			WidgetVisible = $widgetVisible
			WidgetSurvivedGameBarClose = $widgetSurvived
			AntiCheatWarning = $antiCheatWarning
			Notes = $notes
		}
	}

	$facts | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath ( Join-Path $resultsDir "$stem.json" ) -Encoding UTF8

	[pscustomobject] @{
		Trial = $id
		Game = $game.Name
		Api = $game.Api
		Mode = $mode
		FSO = $facts.FsoState
		PlainTopmost = $plainVisible
		UIAccess = $uiaccessVisible
		GameBarWidget = $widgetVisible
		WidgetSurvivesClose = $widgetSurvived
		AntiCheatWarning = $antiCheatWarning
		Notes = $notes
	} | Export-Csv -LiteralPath $csvPath -NoTypeInformation -Append

	& (Join-Path $scriptDir 'run-probe.ps1') -Action stop | Out-Host
	Write-Host "$id recorded."
}

Write-Host ''
Write-Host '=== done ==='
Write-Host "rows:        $csvPath"
Write-Host "json + pngs: $resultsDir"
Write-Host ''
if (Test-Path $csvPath) {
	Import-Csv $csvPath | Format-Table -AutoSize | Out-Host
}
Write-Host 'Next: copy the phone photos into prototypes/win-fullscreen-overlay/evidence/matrix/'
Write-Host 'using the filenames above, and pull the results folder back:'
Write-Host "  scp -r otto:$($resultsDir -replace '\\', '/') ./evidence/matrix/"
Write-Host ''
Write-Host 'When the matrix is finished, run remove-probe.ps1. It deletes the self-signed'
Write-Host 'cert this testing trusted in LocalMachine\Root, which should not outlive the test.'
