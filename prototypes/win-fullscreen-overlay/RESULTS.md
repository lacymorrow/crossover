# LAC-5181 results: the 2026-10-24 pass

Run by Lacy at otto (Win10 22H2 19045, RTX 3090, Samsung LC27G7xT), six photos
of the monitor. Photos in `evidence/matrix/`. The machine-written rows under
`C:\lac5181\results` were never copied off, and otto has been offline since
2026-10-25, so everything below is read from the photographs.

## What was on screen

Each trial put three crosshairs up at once so a single photo answers every
column:

| in the photo | what it is |
|---|---|
| green, left of centre | UIAccess probe, track B |
| magenta, right of centre | plain topmost probe |
| small white, centre | pinned Game Bar widget, track A |

## The table

| # | Game | API | Mode set | FSO | plain topmost | UIAccess | Game Bar widget | anti-cheat warning | photo |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Quake II | OpenGL | Fullscreen 1920x1080, video menu | n/a | visible | visible | visible | none | `quake2-opengl-fullscreen-video-settings.jpg` |
| 2 | Quake II | OpenGL | Fullscreen, main menu | n/a | visible | visible | visible | none | `quake2-opengl-fullscreen-menu.jpg` |
| 3 | Quake II RTX | Vulkan | Fullscreen 1920x1080, video menu | n/a | visible | visible | visible | none | `quake2rtx-vulkan-fullscreen-video-settings.jpg` |
| 4 | Fortnite | DX (UE5) | Fullscreen 2560x1440 | forced off | visible | visible | visible | none | `fortnite-dx-fullscreen-2560x1440.jpg` |
| 5 | ARC Raiders | DX (UE5) | Fullscreen, in gameplay | forced off | visible | visible | visible | none | `arcraiders-dx-fullscreen-gameplay.jpg` |
| 6 | Uncrashed FPV | DX (UE) | main menu | forced off | none | none | none | none | `uncrashed-menu-no-crosshairs-INCONCLUSIVE.jpg` |

`n/a` on the FSO column for the Quake II rows is not an omission: the
compatibility flag only governs the DXGI path, so an OpenGL or Vulkan title
ignores it (`scripts/fso.ps1` documents this).

## Reading it

**Not one trial reached true exclusive fullscreen, so the experiment did not
test its own hypothesis.** The plain topmost probe is the control precisely
because it cannot win against a game that has stopped DWM compositing. It won
in all five readable trials. Whatever those games were doing, it was
flip-model or borderless presentation, including Fortnite and ARC Raiders with
fullscreen optimizations explicitly forced off.

So the matrix contains no trial that separates track A from track B from the
baseline. UIAccess was visible exactly where plain topmost was visible. There
is **no evidence here that UIAccess or a Game Bar widget buys anything** over
what v4 already attempts.

### Trial 6 is inconclusive, not a result

It is tempting to read Uncrashed as the one real exclusive-fullscreen case.
Three things argue against it, and none of them can be settled without otto:

1. **The Game Bar widget vanished too.** It is pinned and runs in Game Bar's
   own overlay, independent of our probes. For all three to disappear at once
   needs either a mechanism that defeats all three or nothing running at all.
2. **It was photographed 2h12m after trial 5** (EXIF 19:05:06 vs 21:17:43).
   `matrix-run.ps1` starts the probes per trial and stops them at the end of
   it, so two hours later there is nothing on screen to photograph.
3. **The photo numbering skips 4937-4939.** Trial 6 is not the next frame
   after trial 5; whatever happened in between was not kept.

The honest reading is that trial 6 most likely shows a machine with no probes
running. It must not be reported as "exclusive fullscreen defeated UIAccess".

## Three defects this pass exposed

The first two corrupted columns that were supposed to be machine-read, which is
why the table above is sourced from photographs only. Both are fixed.

1. **Both probes shared one log file.** The reader took the last `uiaccess=`
   line, so whichever probe started last reported for both. The pass recorded
   `DENIED` for both probes in all five trials while the log itself showed the
   UIAccess build reporting `GRANTED` every time. Fixed: one log per build.
2. **The foreground window was read after the operator alt-tabbed back**, so
   all five trials recorded `powershell` as the foreground window. That was the
   only machine check of what mode the game was actually in, and it was the
   check that would have confirmed point 1 above independently. Fixed:
   `capture.ps1` records it at the instant of the screenshot instead.
3. **The control was not the control.** This one invalidates the conclusion,
   not just a column. See below.

## The control was stronger than the product

`src/overlay.c` re-applies `HWND_TOPMOST` on a 1 Hz timer. CrossOver v4 calls
Electron's `setAlwaysOnTop` **once**, at window creation
(`src/main/windows.js:179`), and never again; there is no re-assertion anywhere
in `src/main/`.

So the magenta crosshair labelled "what v4 does today" throughout the harness
was doing something v4 does not do. A game that takes topmost for itself pushes
other topmost windows down the z-order. A window that re-asserts every second
recovers from that. A window that asked once does not.

That matters for how trials 1-5 read. "Plain topmost was visible, therefore the
game was not exclusive fullscreen" is only sound if plain topmost is the
baseline. It was not. A v4-parity window might have lost those same trials, and
the pass had no way to see it.

It also fits the user reports better than exclusive fullscreen does. On otto,
v4's own mechanism was visible in all five games including the Vulkan title
behind #416, which is the opposite of what those reports describe.

## What the next pass must run

`-Variant all` now starts a third crosshair: **cyan, below centre**, the plain
binary with `--no-reassert`, which asks for topmost once and then stops. It is
v4's actual behaviour.

| what the photo shows | what it means |
|---|---|
| cyan missing, magenta present | v4 loses because it stops asking. Fix is ~10 lines in `src/main/windows.js`, and both tracks here are unnecessary. |
| cyan and magenta both present | v4's approach is fine in that game; the user reports have a different cause (multi-monitor, HDR, content protection, duplicate windows). |
| cyan and magenta both missing, green present | the z-band case this issue was opened for. Track B is justified. |
| all four missing | true exclusive fullscreen beats every hook-free approach, including Game Bar. Close both tracks. |

Only the third row justifies shipping any of this, and the pass so far has not
produced it once.

## Recommendation

**Do not wire UIAccess into v4 yet, and do not start a Game Bar widget.** Both
are expensive (UIAccess needs real Authenticode signing and a Program Files
install; a widget is a separate UWP XAML app and costs streamers their crosshair
in captures) and neither has a single trial showing it beats the baseline.

Test the re-assertion hypothesis first. It is cheap, it is a better fit for the
reports than exclusive fullscreen, and it is the one explanation this pass
accidentally controlled against.
