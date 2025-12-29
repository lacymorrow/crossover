# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm start` - Run the app in development mode with GPU sandbox disabled
- `npm run watch` - Watch for changes and restart automatically
- `npm run css` - Compile SCSS styles

### Testing
- `npm test` - Run Playwright tests
- `npm run lint` - Run ESLint on all source files
- `npm run lint:src` - Lint only source directory
- `npm run depcheck` - Check for unused dependencies and circular dependencies

### Building
- `npm run build` - Build for current platform
- `npm run build:all` - Build for Windows and Linux (32-bit and 64-bit)
- `npm run build:mac` - Build for macOS (arm64 and x64)
- `npm run build:win` - Build for Windows (32-bit and 64-bit)
- `npm run build:linux` - Build for Linux (32-bit and 64-bit)

### Release
- `npm run release` - Create a new release (on release branch)

## Architecture

### Technology Stack
- **Electron 14** - Cross-platform desktop framework
- **Node.js 18.18.2+** - JavaScript runtime
- **SCSS** - Stylesheet preprocessing
- **Playwright** - End-to-end testing
- **electron-builder** - Build and distribution

### Core Structure
- **Main Process** (`src/main/`) - Electron backend handling window management, IPC, system integration
  - `main.js` - Entry point and app initialization
  - `crossover.js` - Core crosshair window logic
  - `windows.js` - Window creation and management
  - `preferences.js` - Settings management via electron-preferences
  - `keyboard.js` - Global hotkey handling
  - `iohook.js` - Mouse/keyboard hook integration

- **Renderer Process** (`src/renderer/`) - UI and frontend logic
  - `renderer.js` - Main window renderer
  - `chooser.js` - Crosshair selection interface
  - `preload.js` - Preload script for context isolation

- **Configuration** (`src/config/`) - App constants and utilities
  - `config.js` - Core configuration values (window sizes, defaults)

### Key Features Implementation
- **Crosshair Overlay** - Transparent, click-through window positioned above other apps
- **Global Hotkeys** - Default: Ctrl+Alt+Shift+[Key] combinations for all actions
- **Multiple Monitors** - Support for moving crosshair between displays
- **Shadow Windows** - Up to 14 duplicate crosshair windows
- **Mouse Following** - Optional crosshair tracking of mouse cursor
- **Hide Triggers** - Hide crosshair on specific mouse/keyboard events

## Code Style
- **ESLint** configured with XO style guide
- **Indentation**: Tabs
- **Semicolons**: None (enforced by ESLint)
- **Spacing**: Always use spaces in arrays, objects, and parentheses
- **Imports**: Sorted alphabetically

## Testing Approach
- Tests located in `test/` directory
- Uses Playwright for Electron app testing
- Test files named `*.spec.js`
- Run with `npm test`

## Important Notes
- Application uses Electron 14 (not latest) for stability
- GPU sandbox is disabled in development (`--disable-gpu-sandbox`)
- Supports Windows 7+, macOS 10.10+, Linux
- Uses `electron-preferences` for settings management
- Global hotkeys implemented via `uiohook-napi`