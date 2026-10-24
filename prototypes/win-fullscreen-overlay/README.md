# Windows fullscreen overlay prototype (LAC-5181)

Prototype only. Nothing here ships, and nothing here is wired into CrossOver v4.

The question: when a game runs fullscreen and CrossOver's normal always-on-top
window loses, can we get the crosshair back without touching the game?

Two tracks, both hook-free:

- **Track A, Xbox Game Bar widget.** Ship a UWP widget that Game Bar renders in
  its own overlay. What HudSight and YoloX do.
- **Track B, UIAccess window.** A signed helper in a higher z-band, the one
  Magnifier and the On-Screen Keyboard use.

Swapchain and DLL injection are explicitly out of scope: anti-cheat ban risk,
and it breaks the "never touches the game" promise.

## Layout

```
RUNBOOK.md          the hands-on pass at the test box, start here
src/overlay.c       crosshair overlay, built twice (uiaccess + plain control)
src/probe-args.h    probe options: tint and offset, kept free of windows.h
src/adversary.c     opaque fullscreen topmost window, stands in for a game
src/*.manifest      the only difference between the two overlay builds
build.sh            cross-compiles for Windows x64 from macOS or Linux
test/run.sh         the parts that can be checked without a Windows box
scripts/            deploy, sign, launch, capture and teardown on the test box
scripts/matrix-run.ps1  drives the matrix one trial at a time, at the machine
scripts/fso.ps1     reads and flips fullscreen optimizations per game exe
```

## Test

```sh
./test/run.sh
```

Covers the probe's option parsing (compiled and run on the dev machine, no
Windows needed) and a parse check of every PowerShell script if `pwsh` is on
PATH. `build.sh` runs it first. The parse check is worth its keep: these scripts
are run by hand at the test box, often with a game open, so a syntax error found
there costs a trip to the machine.

## Build

```sh
brew install mingw-w64     # or: apt install mingw-w64
./build.sh                 # -> dist/
```

No Visual Studio needed for track B. Track A is a different story, see below.

## Run on the test box

Test machines only. On otto, never on zero.

```sh
scp dist/*.exe otto:C:/lac5181/dist/
scp scripts/*.ps1 otto:C:/lac5181/scripts/

ssh otto 'powershell -File C:\lac5181\scripts\deploy-probe.ps1'            # sign + install
ssh otto 'powershell -File C:\lac5181\scripts\zband-test.ps1 -Variant uiaccess'
ssh otto 'powershell -File C:\lac5181\scripts\remove-probe.ps1'            # when finished
```

`remove-probe.ps1` matters. `deploy-probe.ps1` trusts a self-signed cert in
`LocalMachine\Root`, which trusts anything signed with it machine-wide.

## What is verified so far

Measured on otto: Windows 10 Pro 22H2 build 19045, RTX 3090, Game Bar
7.326.8061.0.

| Finding | Status | Evidence |
|---|---|---|
| UIAccess is actually granted | Confirmed | Process token reports `uiaccess=GRANTED`. The identical plain build reports `DENIED`, so the manifest is the only variable. |
| Self-signed cert is enough for UIAccess | Confirmed | Cert trusted in `LocalMachine\Root` + signed exe + `%ProgramFiles%` install. No production signing certificate needed to test. |
| UIAccess outranks an ordinary topmost window | Confirmed | Against `adversary.exe` (fullscreen `WS_EX_TOPMOST`): UIAccess probe visible, plain probe fully hidden. |
| CrossOver v4 today loses to a topmost window | Confirmed | In the same capture, v4's crosshair is hidden exactly like the plain probe. |
| UIAccess over real exclusive fullscreen | **Not tested** | Needs real games. See below. |
| Game Bar widget over real exclusive fullscreen | **Not tested** | Needs a pinned widget and a person at the machine. |

Two findings that change how this gets tested, both learned the hard way:

**A UIAccess binary cannot be started with `CreateProcess`.** It fails with
`ERROR_ELEVATION_REQUIRED` (0x800702E4), because granting UIAccess is the
AppInfo/UAC broker's job and only `ShellExecute` routes through it. This is not
just a test-harness detail: Electron's `child_process.spawn` is also
`CreateProcess`, so if v4 ever launches a UIAccess helper it has to use
`ShellExecute`.

**Game Bar is invisible to screen capture.** `GameBar.exe` was confirmed
running in the interactive session while a GDI `BitBlt` capture of that same
desktop showed no trace of it. This matches HudSight's own documentation, which
says their Game Bar overlay is not visible to OBS or standard recording tools,
only to NVIDIA ShadowPlay.

Two consequences:

1. Track A cannot be signed off from a screenshot. Ground truth has to be a
   photo of the monitor or a ShadowPlay recording.
2. It is a product downside worth deciding on before building anything.
   CrossOver's current Electron overlay *is* captured, as the baseline shot
   shows. Moving to Game Bar would mean streamers and recorders stop seeing
   their own crosshair.

## Track A specifics

A Game Bar widget is a **UWP XAML app**, not Electron and not Win32. It cannot
be the existing app in an MSIX wrapper; it is a second, separate application.
HudSight is built this way too: a free "Simple Crosshair" widget in the Store
plus a paid desktop companion.

The extension declaration, taken from a real shipping widget installed on otto
(`KGStudio.UltimateCrosshairforGamesGameBarWidget`):

```xml
<uap3:Extension Category="windows.appExtension">
  <uap3:AppExtension Name="microsoft.gameBarUIExtension" Id="..." DisplayName="...">
    <uap3:Properties>
      <GameBarWidget Type="Standard">
        <HomeMenuVisible>true</HomeMenuVisible>
        <PinningSupported>true</PinningSupported>
        <Window>
          <AllowForegroundTransparency>true</AllowForegroundTransparency>
        </Window>
      </GameBarWidget>
    </uap3:Properties>
  </uap3:AppExtension>
</uap3:Extension>
```

`PinningSupported` is what keeps the widget on screen after Game Bar closes.
`AllowForegroundTransparency` is what lets it be a crosshair instead of a panel.

Requirements and constraints:

- Visual Studio 2022 with the **Universal Windows Platform** workload, plus
  Windows SDK 19041. otto currently has the SDK but **no compiler and no VS**,
  so track A cannot be built there yet.
- Distribution fits: any UWP app declaring the extension is picked up by the
  Game Bar Widget Store automatically, with no separate Microsoft approval.
  Sideloading works for testing. CrossOver is already published in the
  Microsoft Store (`9MTD5ZLN7NL1`, Fly5, free).
- **Known dead end for issue #416:** HudSight documents that Game Bar widgets
  do not work in Vulkan or OpenGL fullscreen. Track A will not fix the Vulkan
  request. Only track B could.

## What still needs hands

Decided by the board on 2026-10-24: finish the matrix for **both** tracks, with
**Quake II RTX** (free, Vulkan, covers #416) and **Fortnite** (already installed,
EAC) added to what otto already has, and Lacy running the pass at the machine
with phone photos as the evidence.

So the one remaining step is that pass, and everything around it is automated:
see [RUNBOOK.md](./RUNBOOK.md). Nothing here needs a compiler on otto, because
track A is measured with a third-party widget already installed rather than one
we build.

Two things stay out of reach and are deliberately not in the matrix:

- **Escape from Tarkov** (#64) is paid and BattlEye-protected with no offline
  mode, so it is not testable under the "no anti-cheat-protected play" rule.
- **Our own Game Bar widget.** It needs Visual Studio 2022 with the UWP
  workload, which otto does not have. Only worth installing if track A wins on
  the matrix, and the findings above already argue against it.

## Test matrix to fill in

Five games, three display modes, fifteen trials. `matrix-run.ps1` walks them in
this order and writes the rows itself; this table is here so the shape is
reviewable without running anything.

"Visible" means the crosshair is actually on screen over the game, confirmed by
photo. Not by screenshot: a screenshot cannot see a Game Bar widget at all, and
does not reliably see a true exclusive-fullscreen game either.

| Game | API | Covers | Anti-cheat |
|---|---|---|---|
| Quake II RTX | Vulkan | #416, the Vulkan request | none |
| Fortnite | DX11/DX12 | #351 | Easy Anti-Cheat |
| ARC Raiders | DX12 | a second anti-cheat DX12 title | Easy Anti-Cheat |
| The Sims 4 | DX9/DX11 | the control: no anti-cheat at all | none |
| Uncrashed FPV | Unreal/DX12 | the FPV-sim audience CrossOver actually has | none |

Per trial, all three overlays are on screen at once and one photo answers all
three columns:

| | |
|---|---|
| green crosshair, left of centre | UIAccess probe (track B) |
| magenta crosshair, right of centre | plain topmost probe, which is what v4 does today |
| the widget's crosshair | pinned Game Bar widget (track A) |

| Game | Mode | Plain topmost | UIAccess | Game Bar widget | Widget survives Game Bar closing | Anti-cheat warning |
|---|---|---|---|---|---|---|
| | exclusive fullscreen | | | | | |
| | fullscreen, FSO on | | | | | |
| | borderless | | | | | |

The two fullscreen rows are a real distinction, not padding. With fullscreen
optimizations on, the Windows default, a DX game asking for exclusive fullscreen
is quietly handed a borderless flip-model window instead and an ordinary topmost
overlay still draws over it. Testing only the default would measure the easy
case and report a pass CrossOver users never see. `fso.ps1` flips the per-exe
compat flag that controls it.

Reading a row honestly needs one check: if the trial's screenshot shows the game
normally, DWM was still compositing, so that row was not exclusive fullscreen
whatever the game's menu said. See RUNBOOK.md.

Keep to offline, practice, lobby or Creative modes. No anti-cheat-protected
ranked play with either overlay running.
