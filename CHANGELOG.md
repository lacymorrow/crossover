# Changelog

Every CrossOver release that changed something you can see or use.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- The Linux documentation covers dependencies, X11 versus Wayland, Mint compositing, Nobara and Silverblue, and how to recover with a reset. The download page says which macOS build to take. (#523, #524)

### Fixed

- Portable Windows builds keep their data next to the exe. `userData`, `logs`, and `crashDumps` go to a `data/` folder beside the executable instead of `%APPDATA%\CrossOver`, so a portable copy stays portable. Installer builds are unaffected. (#521)
- A hotkey that the operating system or another overlay has already claimed now tells you it failed to register, instead of silently doing nothing. (#517)
- `--reset` works on Linux launchers that strip Chromium switches, through an argv fallback, so AppImage, Snap, and Flatpak wrappers can recover a broken setup. (#524)

## [3.4.6] - 2026-08-26

### Fixed

- CrossOver starts reliably. Window permission handling waits for the app to finish launching instead of running too early. (#529)

## [3.4.5] - 2026-08-25

### Fixed

- The Troubleshooting and Compatibility links open instead of failing on a missing address, and the Linux snap reaches the Snap Store again. (#515)

## [3.4.4] - 2026-08-15

### Added

- Hide from screen recording keeps the crosshair out of screen captures and stream output while it stays visible on your own monitor. (#359)
- A first-run walkthrough shows you how to pick a sight, drag it where you want it, and lock it.
- Show on ADS inverts the aim-down-sights behavior, so the crosshair appears while you scope in instead of disappearing. (#499)

### Changed

- Resetting your settings asks you to confirm first, so a stray hotkey no longer wipes your setup. (#481)
- CrossOver is licensed FSL-1.1-MIT.

### Fixed

- The crosshair lock survives quitting and reopening on Windows. (#484)
- Clearing the app background color clears the highlight color with it, so buttons stay visible against the default background.
- Quitting no longer crashes while the mouse hook shuts down, and `--reset` falls back to safe GPU settings when the app will not start. (#492, #506)
- Your operating system stops asking for camera, microphone, and location access on launch. (#493)
- Resize on ADS reads the preference it writes, so aiming down sights resizes the crosshair. (#496)

## [3.4.2] - 2026-03-16

### Fixed

- Windows release files carry the version in their filename, which is what auto-update needs to find the right download. (#477)

## [3.4.1] - 2025-12-29

### Added

- Ctrl+Alt+Shift+S hides and shows the center reticle without touching the crosshair around it.

### Fixed

- Reset returns every preference to its default, including the ones the old reset skipped.
- Show/hide responds only while the crosshair is locked, so the shortcut stops firing while you are still positioning it.

## [3.4.0] - 2025-08-03

### Added

- The Kenney sight set ships as SVG, so those crosshairs stay sharp at any size.

### Changed

- Mouse follow, hide on ADS, and the global hotkeys run on a new input hook that works on current macOS and Windows builds.
- On macOS, CrossOver tells you when a mouse feature needs Accessibility permission and opens the right System Settings pane for you.

## [3.3.7] - 2025-06-05

### Fixed

- Start at login works again.

## [3.3.5] - 2025-06-02

### Added

- A plain SVG circle sight ships with the app.

## [3.3.4] - 2023-11-02

### Fixed

- CrossOver no longer quits unexpectedly on macOS, and links in the settings window open in your browser again.

## [3.2.0] - 2023-10-30

### Added

- The crosshair resizes when you aim down sights. Pick the size in settings and it swaps while the mouse button is held.
- The reset shortcut is rebindable like every other keybind. (#195)

### Changed

- Light and dark mode follow your system setting across all of CrossOver's windows.

### Fixed

- The crosshair stays on top of fullscreen apps on macOS and Linux, and show/hide stops leaving it half hidden. (#133)
- CrossOver quits properly on Linux instead of leaving a process running. (#226)

## [3.1.5] - 2022-04-15

### Added

- CrossOver can start when you log in.

### Fixed

- Sounds play once, at the right moment, and a locked crosshair no longer spawns a duplicate.

## [3.0.1] - 2022-04-13

### Fixed

- A failed update check no longer takes the app down with it. Auto-update errors are caught and logged.

## [3.0.0] - 2022-04-10

### Added

- You can install CrossOver from the Windows Store, and a privacy policy ships with the app.
- SVG crosshairs work, and you can recolor them from settings. (#121)
- The center reticle has its own shape and color, independent of the crosshair around it. (#16)
- The app window resizes, the crosshair scales larger than before, and the app background and accent colors are yours to set. (#60, #112)
- CrossOver sits in the system tray, so settings and quit are one click away without the overlay.

### Fixed

- Dragging an image onto the window sets it as your crosshair again.

## [2.7.5] - 2022-03-25

### Added

- `--debug`, `--reset`, and `--version` flags run CrossOver from the command line.

## [2.7.0] - 2022-03-24

### Added

- Dark mode, sounds, and desktop notifications, each with its own preference.
- Downloading an update shows a progress bar, and macOS gets a dock badge when one is ready.
- CrossOver is on the Snap Store, so `snap install crossover` works on Linux.

## [2.5.5] - 2022-03-13

### Added

- A Custom Image button picks your own crosshair file without drag and drop, and a Reset button returns everything to defaults.

### Fixed

- The settings window no longer floats above everything else, so file dialogs open in front of it.

## [2.5.0] - 2021-12-09

### Added

- Toggle to tilt. Press the tilt key once to rotate the crosshair instead of holding it down.

## [2.1.5] - 2021-10-06

### Added

- Light-colored sights for dark scenes, and the maximum crosshair size goes to 125.

### Fixed

- The crosshair stays above fullscreen games on macOS.

## [2.1.2] - 2021-08-03

### Added

- An About window, a second shortcut for the settings window, and your own CSS for the overlay.

## [2.0.0] - 2021-07-15

### Added

- Every shortcut is rebindable, and you can switch individual shortcuts off. (#20)
- Bind a mouse button to hide the crosshair while you aim down sights. (#84)
- You can stop CrossOver from updating itself. (#81)

## [1.3.0] - 2021-03-23

### Added

- A shortcut moves the crosshair to the center of the next display. (#36)
- Settings moved into a real preferences window, and duplicate crosshairs can be centered and nudged like the main one.

### Fixed

- Dragging a custom image onto the window works again, and centering puts the crosshair in the actual center of the screen. (#53, #59)

## [1.2.0] - 2021-02-19

### Added

- Duplicate crosshairs. Open CrossOver again to pin a second sight, and keep going up to fourteen.

## [1.0.3] - 2021-01-28

### Added

- A new layout with close and quit buttons you can reach without the keyboard.

### Changed

- CrossOver was rebuilt on Electron's context isolation, which is the foundation the later preferences and custom crosshair work sits on. (#24, #32)

### Fixed

- Dragging the crosshair works on Linux, the close button appears on Fedora, and the color picker stays open while you pick a color. (#51)

## [0.3.13] - 2020-12-23

### Added

- Ctrl+Alt+Shift+C centers the crosshair. (#34)
- A 32-bit Windows build, and more real scope reticles in the chooser. (#35)

### Fixed

- Sight crosses and dots land on exact pixels instead of blurring across two.

## [0.3.9] - 2020-06-22

### Added

- Drag any image onto the window to use it as your crosshair, and the Kenney sight set joins the library. (#15)

## [0.3.0] - 2020-05-15

### Added

- A crosshair chooser with a browsable library of premade sights, plus a settings window of its own. Escape closes it, and your current sight is highlighted inside it. (#19)

## [0.2.4] - 2019-10-10

### Added

- Hide, Reset, and Center are available from the app window, and the color picker stays open while you choose a color.

## [0.1.1] - 2019-10-05

### Added

- CrossOver. A transparent, always-on-top crosshair you drop over any game, with a settings panel for color and size.

[unreleased]: https://github.com/lacymorrow/crossover/compare/v3.4.6...HEAD
[3.4.6]: https://github.com/lacymorrow/crossover/compare/v3.4.5...v3.4.6
[3.4.5]: https://github.com/lacymorrow/crossover/compare/v3.4.4...v3.4.5
[3.4.4]: https://github.com/lacymorrow/crossover/compare/v3.4.2...v3.4.4
[3.4.2]: https://github.com/lacymorrow/crossover/compare/v3.4.1...v3.4.2
[3.4.1]: https://github.com/lacymorrow/crossover/compare/v3.4.0...v3.4.1
[3.4.0]: https://github.com/lacymorrow/crossover/compare/v3.3.7...v3.4.0
[3.3.7]: https://github.com/lacymorrow/crossover/compare/v3.3.5...v3.3.7
[3.3.5]: https://github.com/lacymorrow/crossover/compare/v3.3.4...v3.3.5
[3.3.4]: https://github.com/lacymorrow/crossover/compare/v3.2.0...v3.3.4
[3.2.0]: https://github.com/lacymorrow/crossover/compare/v3.1.5...v3.2.0
[3.1.5]: https://github.com/lacymorrow/crossover/compare/v3.0.1...v3.1.5
[3.0.1]: https://github.com/lacymorrow/crossover/compare/v3.0.0...v3.0.1
[3.0.0]: https://github.com/lacymorrow/crossover/compare/v2.7.5...v3.0.0
[2.7.5]: https://github.com/lacymorrow/crossover/compare/v2.7.0...v2.7.5
[2.7.0]: https://github.com/lacymorrow/crossover/compare/v2.5.5...v2.7.0
[2.5.5]: https://github.com/lacymorrow/crossover/compare/v2.5.0...v2.5.5
[2.5.0]: https://github.com/lacymorrow/crossover/compare/v2.1.5...v2.5.0
[2.1.5]: https://github.com/lacymorrow/crossover/compare/v2.1.2...v2.1.5
[2.1.2]: https://github.com/lacymorrow/crossover/compare/v2.0.0...v2.1.2
[2.0.0]: https://github.com/lacymorrow/crossover/compare/v1.3.0...v2.0.0
[1.3.0]: https://github.com/lacymorrow/crossover/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/lacymorrow/crossover/compare/v1.0.3...v1.2.0
[1.0.3]: https://github.com/lacymorrow/crossover/compare/v0.3.13...v1.0.3
[0.3.13]: https://github.com/lacymorrow/crossover/compare/v0.3.9...v0.3.13
[0.3.9]: https://github.com/lacymorrow/crossover/compare/v0.3.0...v0.3.9
[0.3.0]: https://github.com/lacymorrow/crossover/compare/v0.2.4...v0.3.0
[0.2.4]: https://github.com/lacymorrow/crossover/compare/v0.1.1...v0.2.4
[0.1.1]: https://github.com/lacymorrow/crossover/releases/tag/v0.1.1
