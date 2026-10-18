const process = require( 'process' )

const { app } = require( 'electron' )

const log = require( './log.js' )

/*
	Global hotkeys need an X11 input grab.

	Electron's `globalShortcut` and `uiohook-napi` both ask the X server to
	grab a key combination. A native Wayland compositor has no equivalent and
	refuses by design, so `globalShortcut.register()` reports success and the
	shortcut then never fires. That is why #456 looked like "shortcuts are set
	but they do nothing" rather than a registration error.

	XWayland does honor the grabs, and users confirmed that launching with
	`--ozone-platform=x11` makes every shortcut work. So when we detect a
	Wayland session with XWayland running, we pick X11 ourselves instead of
	asking the user to know what Ozone is.

	Set CROSSOVER_OZONE_PLATFORM to pick the platform yourself (e.g. `wayland`
	to stay native, which turns global hotkeys off).
*/

const OZONE_SWITCH = 'ozone-platform'

const state = {
	wayland: false,
	usingX11: false,
	// Null unless something stops hotkeys; otherwise a sentence explaining why.
	shortcutsBlockedReason: null,
}

const isWaylandSession = () => process.platform === 'linux'
	&& ( process.env.XDG_SESSION_TYPE === 'wayland' || Boolean( process.env.WAYLAND_DISPLAY ) )

// Respect a platform the user or packager already picked.
const platformAlreadyChosen = () => Boolean( process.env.CROSSOVER_OZONE_PLATFORM )
	|| Boolean( process.env.ELECTRON_OZONE_PLATFORM_HINT )
	|| app.commandLine.hasSwitch( OZONE_SWITCH )
	|| process.argv.slice( 1 ).some( arg => arg.startsWith( '--ozone-platform' ) )

// DISPLAY is only set when an X server (XWayland, under Wayland) is reachable.
// Forcing x11 without one leaves the app unable to open a window at all.
const hasXServer = () => Boolean( process.env.DISPLAY )

/**
 * Pick a windowing platform that supports global hotkeys.
 * Must run before `app.whenReady()` — Ozone reads the switch during startup.
 */
const preferX11 = () => {

	state.wayland = isWaylandSession()
	state.usingX11 = false
	state.shortcutsBlockedReason = null

	if ( !state.wayland ) {

		return state

	}

	// CROSSOVER_OZONE_PLATFORM is ours, so nothing else would act on it. Apply the
	// platform it names instead of only treating it as an opt-out.
	const requested = process.env.CROSSOVER_OZONE_PLATFORM
	if ( requested ) {

		log.info( `Wayland session: CROSSOVER_OZONE_PLATFORM=${requested}, using that platform` )
		app.commandLine.appendSwitch( 'enable-features', 'UseOzonePlatform' )
		app.commandLine.appendSwitch( OZONE_SWITCH, requested )
		state.usingX11 = requested === 'x11'

		return state

	}

	if ( platformAlreadyChosen() ) {

		const chosen = process.env.ELECTRON_OZONE_PLATFORM_HINT ?? 'command-line switch'
		log.info( `Wayland session: honoring the platform already set (${chosen})` )

		return state

	}

	if ( !hasXServer() ) {

		state.shortcutsBlockedReason = 'Global hotkeys need X11. Log in to an X11/Xorg session, or install XWayland.'
		log.warn( 'Native Wayland session with no XWayland (DISPLAY is unset): the compositor will not let CrossOver grab a global hotkey, so no shortcut can fire.' )

		return state

	}

	log.info( 'Wayland session detected: running on XWayland so global shortcuts work (set CROSSOVER_OZONE_PLATFORM=wayland to opt out)' )
	app.commandLine.appendSwitch( 'enable-features', 'UseOzonePlatform' )
	app.commandLine.appendSwitch( OZONE_SWITCH, 'x11' )
	state.usingX11 = true

	return state

}

// Why global hotkeys cannot work here, or null when nothing is blocking them.
const shortcutsBlockedReason = () => state.shortcutsBlockedReason

const debugInfo = () => `Session: ${state.wayland ? 'wayland' : process.platform}${state.wayland ? ` (hotkeys via ${state.usingX11 ? 'XWayland' : 'native wayland, unsupported'})` : ''}`

const wayland = {
	debugInfo,
	preferX11,
	shortcutsBlockedReason,
}

module.exports = wayland
