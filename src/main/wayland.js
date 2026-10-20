const process = require( 'process' )

const { app } = require( 'electron' )

const log = require( './log.js' )

/*
	Global hotkeys need an X11 input grab.

	`globalShortcut` and `uiohook-napi` both ask an X server to grab a key
	combination. A native Wayland compositor has no equivalent and refuses by
	design, so `globalShortcut.register()` reports success and the shortcut then
	never fires. That is why #456 read as "shortcuts are set but they do nothing"
	instead of a registration error, and why the failure notice added in #517
	never fired on this path.

	XWayland does honor the grabs. The reporter on #456 confirmed that launching
	with `--ozone-platform=x11` makes every shortcut work on KDE Plasma Wayland.

	We cannot make that choice from here. Chromium picks its windowing backend and
	locks its feature list before this script runs, so appending `--ozone-platform`
	at startup does nothing (electron/electron#54594). The backend has to arrive on
	the command line, from the user or from the launcher. So this module works out
	which backend we are actually on, and when it is one where no hotkey can ever
	fire it hands the user a reason instead of silence.
*/

const OZONE_SWITCH = 'ozone-platform'
const FEATURES_SWITCH = 'enable-features'
const OZONE_FEATURE = 'UseOzonePlatform'
const HINT_ENV = 'ELECTRON_OZONE_PLATFORM_HINT'

// Electron 14 (Chromium 93) has no Ozone unless UseOzonePlatform is enabled on
// the command line. Its one backend is legacy X11, which runs through XWayland in
// a Wayland session. Ozone became the Linux default during the Electron 2x line;
// 21 is where we draw it, and it wants rechecking when we upgrade Electron.
const OZONE_DEFAULT_ELECTRON = 21

// ELECTRON_OZONE_PLATFORM_HINT landed in Electron 27 (electron/electron#39792).
// Older builds ignore it, so reading it there would name a backend we are not on.
const HINT_ELECTRON = 27

// From Electron 38 the default is `auto`, which takes Wayland in a Wayland
// session. Before that the default was x11 (electron/electron#48002).
const AUTO_DEFAULT_ELECTRON = 38

// What the user reads when no shortcut can fire. Short: this is a notification body.
const REASON_NATIVE_WAYLAND = 'Wayland won\'t let CrossOver grab hotkeys. Relaunch with --ozone-platform=x11 or use an X11 session.'
const REASON_NO_X_SERVER = 'Global hotkeys need an X server. Install XWayland or log in to an X11 session.'

const state = {
	// A Wayland login session.
	wayland: false,
	// The windowing backend Chromium is using, or null off Linux.
	backend: null,
	// Can we ask an X server for a key grab?
	usingX11: false,
	// Null unless no shortcut can fire; otherwise a sentence the user can act on.
	shortcutsBlockedReason: null,
}

const electronMajor = () => Number.parseInt( process.versions.electron ?? '', 10 ) || 0

const isWaylandSession = () => process.platform === 'linux'
	&& ( process.env.XDG_SESSION_TYPE === 'wayland' || Boolean( process.env.WAYLAND_DISPLAY ) )

// DISPLAY is only set when an X server (XWayland, in a Wayland session) is reachable.
const hasXServer = () => Boolean( process.env.DISPLAY )

// Reads the process command line Chromium itself parsed, so these answers are
// about the backend we are on rather than one we hoped to set.
const switchValue = name => ( app.commandLine.hasSwitch( name ) ? app.commandLine.getSwitchValue( name ) : '' )

const ozoneAvailable = () => electronMajor() >= OZONE_DEFAULT_ELECTRON
	|| switchValue( FEATURES_SWITCH ).includes( OZONE_FEATURE )

const requestedPlatform = () => {

	const chosen = switchValue( OZONE_SWITCH )
	if ( chosen ) {

		return chosen

	}

	if ( electronMajor() >= HINT_ELECTRON && process.env[HINT_ENV] ) {

		return process.env[HINT_ENV]

	}

	return electronMajor() >= AUTO_DEFAULT_ELECTRON ? 'auto' : 'x11'

}

const activeBackend = () => {

	// Without Ozone there is one backend: legacy X11.
	if ( !ozoneAvailable() ) {

		return 'x11'

	}

	const requested = requestedPlatform()
	if ( requested !== 'auto' ) {

		return requested

	}

	return isWaylandSession() ? 'wayland' : 'x11'

}

/**
 * Work out whether global hotkeys can fire in this session.
 * Safe to call more than once; every field is recomputed.
 */
const detect = () => {

	state.wayland = isWaylandSession()
	state.backend = process.platform === 'linux' ? activeBackend() : null
	state.usingX11 = state.backend === 'x11' && hasXServer()

	// Drive the verdict off the outcome, not off what we asked for: a session is
	// blocked whenever it is Wayland and no X server is in the path.
	if ( state.wayland && !state.usingX11 ) {

		state.shortcutsBlockedReason = state.backend === 'x11' ? REASON_NO_X_SERVER : REASON_NATIVE_WAYLAND

	} else {

		state.shortcutsBlockedReason = null

	}

	if ( !state.wayland ) {

		return state

	}

	if ( state.shortcutsBlockedReason ) {

		log.warn( `Wayland session on the ${state.backend} backend: the compositor will not let CrossOver grab a global hotkey, so no shortcut can fire. ${state.shortcutsBlockedReason}` )

	} else {

		log.info( 'Wayland session running through XWayland: global shortcuts can grab keys' )

	}

	return state

}

// Why global hotkeys cannot work here, or null when nothing is blocking them.
const shortcutsBlockedReason = () => state.shortcutsBlockedReason

const debugInfo = () => {

	if ( !state.wayland ) {

		return `Session: ${process.platform}${state.backend ? ` (${state.backend} backend)` : ''}`

	}

	return `Session: wayland (${state.backend} backend, hotkeys ${state.usingX11 ? 'via XWayland' : 'cannot be grabbed here'})`

}

const wayland = {
	debugInfo,
	detect,
	shortcutsBlockedReason,
}

module.exports = wayland
