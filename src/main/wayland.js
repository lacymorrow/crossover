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

	A switch cannot help, but a new process can: `relaunchOnX11()` restarts
	CrossOver with the backend on its command line from the start. The affected
	users run distro repackages against system Electron, so we do not own their
	`Exec` line and `linux.executableArgs` cannot reach them. That makes an in-app
	relaunch the only mechanism left. It is deliberately narrow: see the guards on
	`relaunchOnX11()` for every session it refuses to touch.
*/

const OZONE_SWITCH = 'ozone-platform'
const FEATURES_SWITCH = 'enable-features'
const OZONE_FEATURE = 'UseOzonePlatform'
const HINT_ENV = 'ELECTRON_OZONE_PLATFORM_HINT'

// Set on the process we relaunch, so a switch that does not take effect leaves us
// with one wasted start instead of a relaunch loop.
const RELAUNCHED_ENV = 'CROSSOVER_RELAUNCHED_X11'

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

// We have had our one attempt once either of these is true: the env var we set on
// the relaunched process, or an `--ozone-platform=x11` already sitting in argv.
// The second covers launchers that hand Chromium a stripped command line, the same
// reason `--reset` is read off argv in main.js. Without it, a switch that never
// arrives would relaunch forever.
const alreadyRelaunched = () => Boolean( process.env[RELAUNCHED_ENV] )
	|| process.argv.slice( 1 ).includes( `--${OZONE_SWITCH}=x11` )

// The command line to come back with: our own arguments, minus the backend
// switches we are replacing, plus Ozone/X11. UseOzonePlatform is merged into any
// existing --enable-features rather than overwriting it, since Chromium keeps only
// the last copy of a switch.
const x11Args = () => {

	const features = switchValue( FEATURES_SWITCH ).split( ',' ).filter( Boolean )
	if ( !features.includes( OZONE_FEATURE ) ) {

		features.push( OZONE_FEATURE )

	}

	const forwarded = process.argv.slice( 1 )
		.filter( argument => !argument.startsWith( `--${OZONE_SWITCH}` ) && !argument.startsWith( `--${FEATURES_SWITCH}` ) )

	return [
		...forwarded,
		`--${FEATURES_SWITCH}=${features.join( ',' )}`,
		`--${OZONE_SWITCH}=x11`,
	]

}

/**
 * Restart on the Ozone/X11 backend when we are on a native Wayland backend that
 * can never grab a hotkey.
 *
 * Must run before any window exists: it replaces this process. Returns true when
 * the relaunch is under way, so the caller can stop starting up.
 */
const relaunchOnX11 = () => {

	// The only backend that cannot grab a key. Read live rather than off state, so
	// this does not depend on detect() having run first.
	if ( process.platform !== 'linux' || activeBackend() !== 'wayland' ) {

		return false

	}

	// Ozone/X11 was experimental in Chromium 93 and is the backend #450 lives on,
	// so an Electron 14 build is never moved. From the line where Ozone is the
	// Linux default, x11 is simply the other supported backend.
	if ( electronMajor() < OZONE_DEFAULT_ELECTRON ) {

		return false

	}

	// `--ozone-platform=wayland` is a choice, not an accident: someone asked for
	// this backend, possibly for the transparency in #450. Leave them on it and let
	// the notice explain what it costs.
	if ( switchValue( OZONE_SWITCH ) === 'wayland' ) {

		return false

	}

	// x11 with no X server has no windows at all, which is worse than no hotkeys.
	if ( !hasXServer() ) {

		return false

	}

	if ( alreadyRelaunched() ) {

		log.warn( 'Already relaunched for Ozone/X11 and still on the Wayland backend: staying here so this cannot loop' )

		return false

	}

	const args = x11Args()

	log.info( `Native Wayland backend cannot grab global hotkeys. Relaunching on Ozone/X11: ${args.join( ' ' )}` )

	// Inherited by the relaunched process. This is what stops a second attempt.
	process.env[RELAUNCHED_ENV] = '1'

	app.relaunch( { args } )
	app.exit( 0 )

	return true

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
	relaunchOnX11,
	shortcutsBlockedReason,
}

module.exports = wayland
