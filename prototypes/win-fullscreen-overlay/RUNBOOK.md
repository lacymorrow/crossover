# LAC-5181 runbook: the hands-on matrix pass

The only part of this investigation that cannot be done over SSH. Everything
else is already automated.

**Where:** otto, at the keyboard, in an elevated PowerShell. Never zero.
**What you need:** your phone, for photos. Game Bar cannot be screenshotted, so
a photo of the monitor is the ground truth for track A. otto also has the NVIDIA
overlay running, so ShadowPlay is an option if you would rather record than
photograph: it is the one capture path that reportedly does see Game Bar.
**Time:** about 20 minutes for the `exclusive` pass across all five games, which
is the pass that actually decides this. Another 40 for the other two modes.

**The question each trial answers:** with a game fullscreen, which of these four
overlays is still on screen?

| in the photo | what it is |
|---|---|
| green crosshair, left of centre | UIAccess probe, track B |
| magenta crosshair, right of centre | plain topmost, re-asserted at 1 Hz |
| cyan crosshair, below centre | v4 parity: topmost asked for once, then never again |
| the widget's crosshair | pinned Game Bar widget, track A |

One photo answers all four columns, and tells them apart without notes.

**Magenta is not v4.** It re-applies `HWND_TOPMOST` every second; v4 calls
`setAlwaysOnTop` once at window creation and never again. The cyan crosshair is
the one that behaves like the shipping product. The 2026-10-24 pass ran without
it and could not tell "the game was never exclusive fullscreen" apart from "v4
simply stopped asking" — see [RESULTS.md](./RESULTS.md).

## One-time setup

**Already done on otto as of 2026-10-24.** Verified on the box:

| | |
|---|---|
| probes built, signed, installed | `C:\Program Files\CrossOver Overlay Probe\` |
| UIAccess actually granted | token reports `GRANTED`; the plain control reports `DENIED` |
| both crosshairs render, distinct | green left, magenta right, confirmed in a capture |
| crosshair widget present | `KGStudio.UltimateCrosshairforGamesGameBarWidget` |
| Quake II RTX | installed via Steam (app 1089130) |
| game exe paths | pre-resolved into `C:\lac5181\games.json`, so no trial has to ask |

If you ever need to redo it from scratch:

```powershell
# from your mac
#    scp prototypes/win-fullscreen-overlay/dist/*.exe    otto:C:/lac5181/dist/
#    scp prototypes/win-fullscreen-overlay/scripts/*.ps1 otto:C:/lac5181/scripts/

# on otto, elevated. -ExecutionPolicy Bypass is required: the default policy
# refuses to run these at all.
powershell -ExecutionPolicy Bypass -File C:\lac5181\scripts\deploy-probe.ps1
start steam://install/1089130
```

The one thing left that needs you: pin the Game Bar widget, once:

1. `Win+G`
2. Widget menu, then the crosshair widget
3. the pin icon in its title bar

Pinning is what keeps it on screen after Game Bar closes, so once pinned it
appears in every trial with no further clicks. If it is not pinned the script
records the track A columns as `n/a` rather than guessing.

## The pass

```powershell
cd C:\lac5181\scripts
powershell -ExecutionPolicy Bypass -File .\matrix-run.ps1 -Modes exclusive        # this one first
powershell -ExecutionPolicy Bypass -File .\matrix-run.ps1 -Modes fso,borderless   # then these
```

`-ExecutionPolicy Bypass` is not optional on otto: the machine's default policy
refuses to run an unsigned `.ps1` at all, with a `PSSecurityException`.

Per trial the script prints what to do and waits. Your part:

1. launch the game, set the display mode it names
2. photograph the middle of the monitor
3. alt-tab back, answer three or four `y/n` questions
4. it stops the probes and moves on

The script handles the rest: the fullscreen-optimizations flag, starting both
probes with the right colour and offset, a delayed desktop screenshot taken
while you are still in the game, and a CSV plus a JSON of machine-read facts per
trial.

Save each photo as the filename the script prints, `T03-fortnite-exclusive.jpg`
and so on. `-Games` and `-Modes` both filter, so you can stop anywhere and pick
up later.

If a crosshair gets stuck on screen, each probe has its own quit hotkey:
`ctrl+alt+shift+Q` kills the green UIAccess one, `W` the magenta plain one, `E`
the cyan v4-parity one. They need separate keys because `RegisterHotKey` is
global, so two probes claiming one combination leaves the second with no hotkey
at all. `matrix-run.ps1` also stops all three between trials, so this is only a
safety valve.

### Rules while you are in there

- **Offline, practice, lobby or Creative only.** Never a ranked or competitive
  match with the overlays running. Fortnite and ARC Raiders are both Easy
  Anti-Cheat titles; Fortnite's lobby alone is enough to answer the question.
- If anything shows an anti-cheat warning, answer `y` to that question and stop
  that game. That result is a finding, not a failure.

## When you are done

```powershell
# copy the results back (from your mac)
# scp -r otto:C:/lac5181/results prototypes/win-fullscreen-overlay/evidence/matrix/

# then, on otto: remove the test signing cert
powershell -File C:\lac5181\scripts\remove-probe.ps1
```

`remove-probe.ps1` is not optional housekeeping. `deploy-probe.ps1` trusted a
self-signed certificate in `LocalMachine\Root`, which means anything signed with
that key is trusted machine-wide. It should not outlive the test.

Drop the photos in `evidence/matrix/` with the names the script gave them, and
the matrix is finished.

## Reading the results afterwards

Two things to check before trusting a row:

**Did the game really go exclusive fullscreen?** Look at the trial's
`*-screen.png`. If that capture shows the game normally, DWM was still
compositing, so the game was in a borderless or FSO window no matter what its
menu said, and the row belongs in the `fso` bucket. A black or stale capture is
good evidence the mode was genuine. This matters most for Quake II RTX: it is
SDL2-based, and SDL2's fullscreen on Windows is a display-mode change rather
than a Vulkan exclusive-fullscreen surface, so it may never hand over the
display at all.

**Is the FSO flag doing anything?** It only governs the DXGI path. Quake II RTX
is Vulkan and ignores it; for that title the in-game setting is the only
control, and the `exclusive` and `fso` rows should come out identical.

How to read a row:

| photo shows | means |
|---|---|
| cyan missing, magenta present | v4 loses because it stops asking, not because of the z-band. Fix is in `src/main/windows.js`; neither track here is needed. |
| cyan and magenta both present | v4's approach works in that game. The user reports have some other cause. |
| cyan and magenta missing, green present | the z-band case this issue was opened for. Justifies wiring track B into v4. |
| all four missing | exclusive fullscreen beats every hook-free approach, Game Bar included. Close both tracks. |

Only the third row justifies shipping any of this. The 2026-10-24 pass did not
produce it once; every readable trial came out in the second row.
