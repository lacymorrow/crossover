# CLAUDE.md - AI Assistant Guide for CrossOver

## Project Overview

**CrossOver** is an Electron-based desktop application that provides a customizable crosshair overlay for any screen. It's designed for gamers to improve their aim with permanent, colored crosshairs that can be placed over any application window.

- **Version:** 3.4.0
- **License:** CC-BY-NC-SA-4.0
- **Platforms:** Windows, macOS, Linux
- **Framework:** Electron v14
- **Language:** JavaScript (Node.js)

## Quick Reference

### Essential Commands

```bash
# Install dependencies and compile CSS
npm install

# Start development
npm start

# Run with file watching
npm run watch

# Run tests
npm test

# Lint code
npm run lint

# Build for current platform
npm run build

# Build for all platforms
npm run build:all
```

### Project Structure

```
crossover/
├── index.js                    # CLI entry point (--version, --debug, --reset)
├── package.json                # Project config and dependencies
├── src/
│   ├── index.js               # Exports main.js
│   ├── main.js                # Main app initialization
│   ├── main/                  # Main process (Electron backend)
│   ├── renderer/              # Renderer process (UI)
│   ├── config/                # Configuration constants
│   └── static/                # Static assets (crosshairs, icons, sounds)
├── test/                      # Playwright E2E tests
└── build/                     # Build configuration and assets
```

## Code Style (CRITICAL)

This project uses specific formatting rules that MUST be followed:

### Indentation & Spacing
- **Use TABS, not spaces** for indentation
- **No semicolons** at end of statements
- **Spaces inside brackets**: `[ 1, 2, 3 ]`, `{ key: value }`, `( param )`
- **Padded blocks**: Always add blank lines inside blocks, switches, and classes

### Example of Correct Style
```javascript
const example = ( param ) => {

	const array = [ 'one', 'two', 'three' ]
	const object = { key: 'value' }

	if ( condition ) {

		doSomething()

	}

	return result

}
```

### ESLint Rules Summary
- `indent: ['error', 'tab']`
- `semi: [2, 'never']`
- `array-bracket-spacing: ['error', 'always']`
- `object-curly-spacing: ['error', 'always']`
- `space-in-parens: ['error', 'always']`
- `padded-blocks: ['error', { blocks: 'always', switches: 'always', classes: 'always' }]`
- Imports must be sorted

## Architecture

### Main Process Files (`src/main/`)

| File | Purpose |
|------|---------|
| `crossover.js` | Core crosshair logic, keyboard shortcuts, window locking, settings sync |
| `windows.js` | Window creation/management, multi-display support |
| `preferences.js` | Settings definitions using electron-preferences |
| `init.js` | App initialization sequence |
| `ipc.js` | Inter-process communication handlers |
| `register.js` | App-level event registration |
| `iohook.js` | Global input hooks (mouse, keyboard) |
| `set.js` | Applies settings to renderer |
| `keyboard.js` | Keyboard shortcut management |
| `auto-update.js` | Electron auto-updater |

### Renderer Process Files (`src/renderer/`)

| File | Purpose |
|------|---------|
| `index.html` | Main crosshair window UI |
| `renderer.js` | Main window logic and interactions |
| `chooser.html/js` | Crosshair selection UI |
| `preload.js` | Context bridge for secure IPC |
| `styles/` | SCSS stylesheets (compiled to `dist/`) |

### Configuration (`src/config/`)

| File | Purpose |
|------|---------|
| `config.js` | App dimensions, URLs, constants |
| `utils.js` | Utility functions (debounce, color conversion) |
| `exit-codes.js` | Exit code constants |

## Key Patterns

### Module Export Pattern
```javascript
const module = {
	init,
	function1,
	function2,
	property: value
}
module.exports = module
```

### IPC Communication

**Main → Renderer channels:**
- `set_crosshair` - Update crosshair image
- `set_reticle` - Change reticle type
- `set_properties` - Update CSS variables
- `lock_window` - Toggle draggable state
- `play_sound` - Trigger sounds
- `notify` - Show notifications

**Renderer → Main channels:**
- `center_window`, `close_window`, `move_window`
- `open_chooser`, `open_settings`
- `save_crosshair`, `save_custom_image`
- `log`, `error`, `quit`

**Security:** All IPC channels must be whitelisted in `preload.js`

### Window Management

- **Main Window** (`windows.win`): Primary crosshair overlay
- **Shadow Windows** (`windows.shadowWindows` Set): Duplicate crosshairs (max 14)
- **Chooser Window** (`windows.chooserWindow`): Crosshair selector
- **Preferences Window** (`windows.preferencesWindow`): Settings UI

Use `windows.each(callback)` to iterate over all windows.

### Preferences

Settings use dot notation paths: `'crosshair.size'`, `'actions.followMouse'`
Hidden internal state uses: `'hidden.locked'`

Checkbox values are arrays - use `checkboxTrue(value, key)` to check.

## Common Tasks

### Adding a New Crosshair
1. Place image in `/src/static/crosshairs/[Category]/`
2. Supported formats: PNG, SVG
3. Crosshairs are auto-loaded by `helpers.js`

### Adding a New Setting
1. Add to `sections` array in `src/main/preferences.js`
2. Add default value to `defaults` object
3. Handle in `set.js` if it needs to apply to renderer

### Adding a Keyboard Shortcut
1. Add to `keyboardShortcuts()` in `src/main/crossover.js`
2. Add default binding in `src/main/preferences.js` under keybinds section
3. Test across platforms (modifier keys differ)

### Adding an IPC Channel
1. Add channel name to whitelist in `src/renderer/preload.js`
2. Add handler in `src/main/ipc.js`
3. Use `ipcRenderer.send()` from renderer

## Testing

**Framework:** Playwright with Electron support

```bash
npm test                  # Run tests
npm run test:verbose      # With detailed output
npm run test:debug        # With Playwright debugger
```

**Test location:** `/test/*.spec.js`
**Helpers:** `/test/helpers.js` - startApp, closeApp, wait utilities

## Building

```bash
npm run build            # Current platform
npm run build:mac        # macOS (x64 + arm64)
npm run build:win        # Windows (x86 + x64)
npm run build:linux      # Linux packages
npm run build:all        # Windows + Linux
npm run build:release    # Full release (all platforms)
```

**Output:** `/dist/` directory

## Critical Considerations

### Platform-Specific Behavior
- Use `is.macos`, `is.linux`, `is.windows` for platform checks
- macOS: Option key instead of Alt
- Windows: Uses `type: 'toolbar'` for window
- Linux: Transparency requires compositor, GPU acceleration settings critical

### Window Positioning
- Always account for multi-display setups
- Use `safeBounds()` to prevent off-screen windows
- Shadow windows offset by 40px each

### Lock State
When crosshair is locked:
- Window becomes click-through
- Control buttons hidden
- Input hooks may change behavior

### GPU Acceleration
- Can cause FPS issues with certain games
- Configurable via preferences
- Linux requires specific settings for transparency

### Accessibility Permissions
- Required on macOS for input hooks (uiohook-napi)
- Check with `accessibility.js` before using hooks

## Debugging

```bash
# Run with debug flag
./CrossOver --debug

# Reset all settings
./CrossOver --reset
```

Debug output goes to console and electron-log.

## Dependencies

**Key Production:**
- `electron-preferences` - Settings UI
- `electron-updater` - Auto-update
- `uiohook-napi` - Global input hooks
- `electron-log` - Logging

**Development:**
- `@playwright/test` - E2E testing
- `electron-builder` - Building/packaging
- `sass` - CSS preprocessing
- `eslint` - Linting

## CI/CD

- **GitHub Actions:** Builds on push to dev, main, release
- **CircleCI:** Linux builds, Snap Store publishing
- **Appveyor:** Windows builds, Windows Store publishing

## File Naming Conventions

- Kebab-case: `auto-update.js`, `error-handling.js`
- HTML files match their JS: `chooser.html` ↔ `chooser.js`
- Preload scripts prefixed: `preload.js`, `preload-chooser.js`

## When Making Changes

1. **Always lint before committing:** `npm run lint`
2. **Run tests:** `npm test`
3. **Test on multiple platforms** when touching window management
4. **Respect the code style** - tabs, no semicolons, spaces in brackets
5. **Update IPC whitelists** when adding new channels
6. **Consider multi-display** scenarios for window positioning
7. **Test lock/unlock transitions** for UI changes
