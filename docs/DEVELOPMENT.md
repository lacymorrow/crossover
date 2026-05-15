# Developing CrossOver

Internal notes for working on CrossOver itself. For the public docs, see [`readme.md`](../readme.md). For how to file bugs or send PRs, see [`.github/CONTRIBUTING.md`](../.github/CONTRIBUTING.md).

CrossOver is built with [Electron](https://electronjs.org) — plain HTML/JS, no framework. The main app window lives in `src/main/`; the renderer (settings, chooser, preferences) lives in `src/renderer/`. Layout in `index.html`, styles in `src/renderer/styles/index.scss`.

## Run

```sh
$ nvm install && nvm use   # uses .nvmrc
$ npm install
$ npm start
```

`npm start` compiles SCSS, then launches Electron with `--disable-gpu-sandbox --trace-warnings`. Use `npm run watch` to auto-restart on file changes.

## Build

> Build steps are optimized for macOS. See [electron-builder](https://www.electron.build/) for help customizing.

```sh
$ npm run build          # current platform
$ npm run build:all      # Windows + Linux (32/64-bit)
$ npm run build:mac      # arm64 + x64
$ npm run build:win      # 32/64-bit
$ npm run build:linux    # 32/64-bit
```

`wine` and `mono` must be installed for Windows builds from macOS. [Multipass](https://multipass.run/) is required for Snap builds from macOS.

### Known build issues

**`CrossOver is damaged and can't be opened`** — CI builds don't always work for Mac. Try a real Mac.

**Closing via traffic lights crashes on Mac** — calling `process.exit()` before the app finishes quitting will crash it. Let the lifecycle complete naturally.

**`i386 architecture deprecated`** — newer macOS can't build 32-bit. Use CircleCI for those.

**`gyp: name 'openssl_fips' is not defined`** — Node 16 has worked around this. See [this StackOverflow answer](https://stackoverflow.com/questions/69882740/how-to-rebuild-epoll-package-in-electron).

**`app-builder_arm64 process failed`** — install rpm support: `brew install rpm`.

## Test

```sh
$ npm test               # Playwright
$ npm run test:verbose
$ npm run test:debug     # PWDEBUG=1
```

Tests live in `test/` as `*.spec.js`. Run `npm run lint` (XO style) and `npm run depcheck` (unused + circular deps) before opening a PR.

## Release

```sh
$ npm run release
```

Then edit the auto-created GitHub Releases draft and publish. The current release branch is `release`.

## Continuous integration

| Service | Builds | Publishes to |
|---|---|---|
| [GitHub Actions](https://github.com/lacymorrow/crossover/actions) | All targets | GitHub Releases |
| [CircleCI](https://circleci.com/gh/lacymorrow/crossover) | All targets | GitHub Releases, [Snap Store](https://snapcraft.io/crossover) |
| [Appveyor](https://ci.appveyor.com/project/lacymorrow/crossover) | Windows | [Microsoft Store](https://apps.microsoft.com/detail/9mtd5zln7nl1) |

### CircleCI environment

- `GH_TOKEN` — Personal Access Token, for GitHub Releases uploads.
- `SNAPCRAFT_STORE_CREDENTIALS` — required as of Snapcraft v7. Replaces the old `SNAP_TOKEN`.

To install Snapcraft on macOS:

```sh
$ brew install multipass --cask
$ brew install snapcraft
```

## Debugging

Run CrossOver from the command line to see debug output:

```sh
$ /Applications/CrossOver.app/Contents/MacOS/CrossOver --debug
09:45:16.023 › CrossOver 2.7.4 Development
09:45:16.030 › Setting: Enable GPU
09:45:16.487 › App ready
```

### Command-line flags

| Flag | Alias | Effect |
|---|---|---|
| `--debug` | `-d` | Start with Chrome DevTools open. |
| `--reset` | `-r` | Reset all preferences to default. Useful when the app gets into a broken state. |
| `--version` | `-v` | Print version to stdout (good for CI). |

## Code style

- **ESLint** with the XO config.
- **Tabs**, no semicolons. Spaces inside arrays/objects/parens. Imports sorted alphabetically.
- Don't introduce new frameworks — vanilla HTML/JS keeps the runtime tiny.
- No `.unwrap()`-style "this should never fail" code in the IPC layer — surface errors and log them through `electron-log`.

## Architecture cheat sheet

```
src/
├── main/
│   ├── main.js          # entry, app lifecycle
│   ├── crossover.js     # core crosshair window logic
│   ├── windows.js       # multi-window management
│   ├── preferences.js   # electron-preferences integration
│   ├── keyboard.js      # global hotkey registration
│   └── iohook.js        # mouse/keyboard hook hook
├── renderer/
│   ├── renderer.js      # main crosshair window
│   ├── chooser.js       # crosshair picker
│   └── preload.js       # context-isolation bridge
└── config/
    └── config.js        # window sizes, defaults
```

## Useful issue references

- [#1](https://github.com/lacymorrow/crossover/issues/1) — Hidden by fullscreen apps (the long-standing limitation)
- [#47](https://github.com/lacymorrow/crossover/issues/47) — Game compatibility tracking thread
- [#70](https://github.com/lacymorrow/crossover/issues/70) — FPS reports, `Hide on ADS` debugging
- [#230](https://github.com/lacymorrow/crossover/issues/230) — Linux compositor edge cases
- [#330](https://github.com/lacymorrow/crossover/issues/330) — V-Sync / G-Sync stutter reports
