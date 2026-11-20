# Moving CrossOver 3 users to CrossOver 4

CrossOver 4 (lacymorrow/xover, Electron 40) publishes into this repo's releases with the same appId, `com.lacymorrow.crossover`. Every v3 install reads the same `latest*.yml`, so publishing v4 as Latest offers it to every v3 install that checks for updates. This page covers how that offer is gated, what each kind of install does, and how to stop or undo it.

The rule: never offer or install CrossOver 4 on a system that can't run it.

## What CrossOver 4 needs

| | Floor | Source |
|---|---|---|
| Windows | Windows 10, 64-bit. ARM needs Windows 11 (Windows 10 on ARM can't emulate x64) | Electron 23+ dropped 7/8/8.1. v4 ships x64 only: `uiohook-napi` 1.5.4 and 1.5.5 have no `win32-ia32` prebuild |
| macOS | macOS 12 (Darwin 21) | Electron 38+ |
| Linux | x64, glibc 2.27 (Ubuntu 18.04) | The 4.0.0-beta.8 binary needs `GLIBC_2.25` by symbol version; 2.27 is Electron's stated floor. No musl, no arm64 build |

## The four gates

1. **`minimumSystemVersion` in `latest.yml` and `latest-mac.yml`** (`10.0.0` and `21.0.0`). electron-updater compares it with `os.release()`: the NT version on Windows, the Darwin version on macOS. Only electron-updater 6.3.0 and later read it, which means v3.4.1 to 3.4.10. electron-builder 25 does not write this field itself, so nothing conflicts. If `os.release()` isn't valid semver the check logs a warning and lets the update through.
2. **`stagingPercentage`** in all three ymls. Every electron-updater since 4.x reads it, so every v3 install is covered. The bucket comes from `<userData>/.updaterId`, which v3 and v4 share. `0` stops everything.
3. **The v4 Windows installer refuses unsupported systems** (`xover/assets/installer.nsh`, `preInit`). It runs before electron-builder's own 64-bit check and before v3 is uninstalled. On Windows 7/8/8.1, 32-bit Windows, or ARM before Windows 11 it quits, silently when run by the updater, and leaves v3 as it was. This is what protects 3.3.x and older, which ignore gate 1, and 32-bit Windows 10, which gate 1 can't see.
4. **3.4.10 checks the machine before it downloads anything** (`src/main/v4-support.js`). It downloads v4 automatically only when v4 runs there and the install can be replaced in place: the Windows installer build (not portable, not Store) or a Mac with CrossOver in /Applications. It never offers v4 to someone who already tried v4 and came back (v4's `config.json` exists in userData). The announcement uses the same check, so a machine that can't run v4 sees nothing.
5. **3.4.10 gives everyone a way to refuse** (`src/main/announcement.js`, `src/main/v4-update.js` `shouldDownload`). The background update needs no prompt: the rollout percentage is the gate. The announcement has "Update now" (skips the percentage, never the 0 kill switch), "Later" (hides it for 30 days, `hidden.bannerSnoozedUntil`) and a small "Never update" link (`hidden.v4Declined`: no announcement and no background v4 download on that install, for good). 3.4.9 and older have no such link: their only way to stay is to turn off automatic updates. That is why 3.4.10 goes out first and v4 waits at 0%.

`banner.json` stays `enabled: false` for good. 3.4.7 and 3.4.9 read it, and their check only knows the OS version, so they would offer v4 to Store installs and to old Linux, and they would switch the install to the pre-release channel. 3.4.10 and later read `announcement.json`.

## What happens to each install

Rows are v3 versions as published. 3.4.8 was never published. "Staged" means the install only acts if its bucket falls inside `stagingPercentage`.

### Windows

| Install | v3 versions | Updater | What happens when v4 is Latest |
|---|---|---|---|
| NSIS, 64-bit Win 10/11 | 3.4.10 | 6.3.0 | Staged: downloads, installs on quit. The announcement's Update button skips staging (but respects 0) |
| NSIS, 64-bit Win 10/11 | 3.4.1 to 3.4.9 | 6.3.0 | Staged: downloads, installs on quit. No announcement |
| NSIS, 64-bit Win 10/11 | 1.x to 3.3.x | 4.3 to 6.1.4 | Staged: downloads, installs on quit |
| NSIS, Win 7/8/8.1 | 3.4.1 to 3.4.10 | 6.3.0 | Nothing: gate 1 |
| NSIS, Win 7/8/8.1 | 1.x to 3.3.x | 4.3 to 6.1.4 | Staged: downloads about 100 MB, the v4 installer quits on every app quit (gate 3), v3 keeps working. Wasted bandwidth, no harm |
| NSIS, 32-bit Win 10 | 3.4.10 | 6.3.0 | Nothing: gate 4 |
| NSIS, 32-bit Win 10 | 3.4.5 to 3.4.9 | 6.3.0 | Can't happen: these releases are x64 only, so 32-bit users never installed them |
| NSIS, 32-bit Win 10 | 1.x to 3.4.1 (ia32+x64 installers) | 4.3 to 6.3.0 | Staged: downloads, the installer quits (gate 3), v3 keeps working. They already hit electron-builder's "64-bit Windows required" box on every quit when 3.4.5 shipped x64 only, and gate 3 does not fix that for 3.x updates |
| NSIS, Win 10 on ARM | any | | v3.4.5+ x64 can't run there. Older ia32 builds: like 32-bit, gate 3 refuses |
| Portable | 3.4.10 | 6.3.0 | No automatic download (gate 4). Announcement opens the download page |
| Portable | 1.x to 3.4.9 | | Staged: electron-updater runs the v4 NSIS installer, which installs v4 to `%LOCALAPPDATA%\Programs` beside the portable copy. v4 starts with default settings, because portable v3 kept its settings in `data\` next to the exe. Existing behavior for every v3 update too |
| Microsoft Store | any | throws, caught | Nothing. The Store updates it. v4 has no Store listing (v4's appx identity `CrossOverElectron` differs from v3's `CrossOverCrosshairOverlay`) |
| winget (`LacyMorrow.CrossOver`, manifest at 3.3.4 x86) | 3.3.4 | 6.1.4 | Same as NSIS 1.x to 3.3.x. `winget upgrade` keeps offering 3.3.4 until the manifest is bumped |

### macOS

Squirrel.Mac only installs updates into an app with a real signature. v3 releases before 3.4.7 are unsigned (checked: 3.3.4 and 3.4.1 report "code object is not signed at all"; 3.4.5 was built before Developer ID signing landed in #548).

| Install | v3 versions | What happens when v4 is Latest |
|---|---|---|
| Developer ID signed, macOS 12+, in /Applications | 3.4.10 | Staged: downloads the universal zip, installs on quit. Update button skips staging |
| Developer ID signed, macOS 12+ | 3.4.7, 3.4.9 | Staged: same, no announcement |
| Signed, outside /Applications or translocated | 3.4.10 | No automatic download. Announcement opens the download page |
| Signed, outside /Applications | 3.4.7, 3.4.9 | Staged: downloads, Squirrel may fail to replace a read-only or translocated copy. v3 keeps working |
| Any, macOS 11 or older | 3.4.1 to 3.4.10 | Nothing: gate 1 |
| Unsigned | 1.x to 3.4.5 | Staged: downloads about 200 MB, v3 says "CrossOver has been Updated", Squirrel refuses the install, v3 keeps working. This happens for every v3 update already. On macOS 11 or older with 3.3.x or older, gate 1 doesn't apply, but the unsigned host still blocks the install, so v4 never lands on an unsupported Mac |

### Linux

v3 never installs updates on Linux. When electron-updater reports one, v3 shows a dialog that opens the releases page.

| Install | v3 versions | What happens when v4 is Latest |
|---|---|---|
| AppImage, glibc 2.27+, x64 | 3.4.10 | Staged: dialog, opens the page. Announcement opens the download page |
| AppImage, glibc below 2.27 | 3.4.10 | Nothing: gate 4 |
| AppImage, any glibc | 1.x to 3.4.9 | Staged: dialog opens the releases page, which now shows v4. On glibc below 2.27 v4 won't start. Old-glibc desktops are rare, but staging is the only guard here |
| deb, pacman | any | electron-updater only runs for AppImage (and deb builds that carry `resources/package-type`), so usually nothing. If it runs: the dialog, gated as above |
| AUR `crossover-overlay-bin` (community, at 3.4.5) | 3.4.5 | Nothing in-app. The maintainer decides when to package v4 |
| Snap (`crossover`, stable 3.4.9) | any | Nothing: electron-updater is off inside snaps, and 3.4.10 hides the announcement. `release-v4.yml` builds no snap. If v4 ever goes to the same snap name, every snap user moves at once unless it uses `snapcraft release --progressive` |
| Flatpak | | None published. 3.4.10 treats one as unsupported |

## Rollback

- **Settings survive.** v4 keeps its settings in `<userData>/config.json`. It only reads v3's `preferences.json` (`xover/src/main/import-v3.ts`) and never writes it. Both apps share userData, so going back to v3 finds the old settings exactly as they were.
- **Windows downgrade works.** electron-builder's NSIS installer has no version check. Running `CrossOver-3.4.10.exe` over v4 runs v4's uninstaller with `--updated` (app data kept) and installs 3.4.10. v4's guard (gate 3) only runs in v4's own installer.
- **macOS:** drag CrossOver 3.4.10 from its DMG over the v4 app in /Applications.
- **Staying rolled back:** roll back to **3.4.10, not older**. 3.4.10 sees v4's `config.json` and never downloads v4 or shows the announcement again. 3.4.9 and older have no such check and sit in the same staging bucket, so they upgrade again on the next check. Turning off Automatic Updates in v3's settings also works on any version.
- **Stopping the rollout:** `scripts/v4-rollout.sh 0` stops new automatic downloads and the 3.4.10 Update button. It can't recall an update that has already downloaded; electron-updater installs it on the next quit. GitHub's CDN can serve the old yml for a few minutes. Also set `announcement.json` to `enabled: false` so 3.4.10 stops showing the note.

## Publish order

1. **Ship 3.4.10 as Latest** through the normal `release.yml` (tag `v3.4.10`). Leave `announcement.json` at `enabled: false`.
2. **Wait** until most active installs have taken 3.4.10, so the bulk of users have gate 4 and the rollback guard before v4 exists as Latest. One week (Lacy, 2026-11-19). Installs on 3.3.x and older that update in this window also gain gate 1.
3. **Publish v4 stable**: run `release-v4` with `release_type: latest`, `staging_percentage: 0`, `ref: <xover tag>`. It builds into a draft, starts the draft's files on Apple silicon, Intel Mac, Linux and Windows (`smoke-v4`; a build that cannot start stops here), writes the gates into the ymls, adds the notes, refuses to continue unless 3.4.10 (or newer) is Latest, then publishes v4 as Latest. Nobody updates yet.
4. **Check the published ymls**: `gh release download v4.0.0 -p 'latest*.yml'` and read `minimumSystemVersion` and `stagingPercentage`.
5. **1 percent** (Lacy, 2026-11-19: start at 1, not 5): `scripts/v4-rollout.sh 1`. Watch issues, crash reports and analytics for 48 hours or more. Then turn on the announcement: set `announcement.json` to `enabled: true` on main. Its button skips staging, so only enable it once you're happy for anyone who asks to get v4.
6. **5**, then **25**, then **50**, then **100**, each after a quiet stretch: `scripts/v4-rollout.sh 25` and so on.
7. **Kill switch at any point**: `scripts/v4-rollout.sh 0` and `announcement.json` back to `enabled: false`.

Later v4 releases (4.0.1 and up) go through the same workflow and start at 0 for everyone, v4 users included. Raise them with the same script.

## Known gaps

- **v3 fixes after v4 is Latest.** A new v3 release can't be Latest without taking the v4 offer away from every v3 install. Ship it as a non-Latest release; only people who download it by hand get it.
- **The website and `RELEASES_URL`.** v3's menus and crossover.lacy.sh link to `releases/latest`, which becomes v4. Someone on Windows 7, or with a 32-bit system, who follows those links lands on a v4 download they can't run. The site needs a "CrossOver 3 for older systems" link to `releases/tag/v3.4.10`.
- **Old unsigned Macs and Win 7/8 on 3.3.x and older** download v4 in their bucket and can't install it. That costs bandwidth each time they check, and it fails safely.
- **Pre-release testers.** Pre-releases get the OS floor but no staging, so v4 beta installs keep updating. Check that 4.0.0-beta.x installs move to 4.0.0 stable once it is Latest; electron-updater's channel logic for pre-release installs wasn't tested here.
