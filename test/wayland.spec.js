const path = require( 'path' )
const Module = require( 'module' )
const { expect, test } = require( '@playwright/test' )

// Regression tests for #456: shortcuts registered without error on KDE Plasma
// Wayland and then never fired, because a native Wayland compositor refuses the
// X11 input grab globalShortcut needs. wayland.detect() works out whether an X
// server is in the path and explains itself when one is not.
//
// These tests read the backend off a faked command line, the way the module
// does, because Chromium has already locked its backend in by the time our main
// script runs. Appending a switch at that point is a no-op, so every case also
// asserts that we never append one.
//
// relaunchOnX11() is the other half (LAC-5118): where a switch cannot help, come
// back as a new process that was launched on Ozone/X11 from the start. Every case
// below also records whether it fired, since firing it in the wrong session is
// worse than the bug it fixes.

const WAYLAND_PATH = require.resolve( path.join( __dirname, '../src/main/wayland.js' ) )
const LOG_PATH = require.resolve( path.join( __dirname, '../src/main/log.js' ) )
const SESSION_VARS = [
	'XDG_SESSION_TYPE',
	'WAYLAND_DISPLAY',
	'DISPLAY',
	'ELECTRON_OZONE_PLATFORM_HINT',
	'CROSSOVER_RELAUNCHED_X11',
]

const WAYLAND_WITH_XWAYLAND = { XDG_SESSION_TYPE: 'wayland', WAYLAND_DISPLAY: 'wayland-0', DISPLAY: ':0' }
const WAYLAND_NO_XWAYLAND = { XDG_SESSION_TYPE: 'wayland', WAYLAND_DISPLAY: 'wayland-0' }
const X11_SESSION = { XDG_SESSION_TYPE: 'x11', DISPLAY: ':0' }

// The Electron we ship: Chromium 93, no Ozone, legacy X11 backend only.
const ELECTRON_14 = '14.2.9'
// A distro build like the one on #456, where `--ozone-platform` defaults to auto.
const ELECTRON_41 = '41.10.6'

/**
 * Load wayland.js against a faked session.
 *
 * `argv` becomes the process command line, parsed into switches the same way
 * Chromium parses it, so `app.commandLine` answers about real arguments rather
 * than ones the module appended.
 */
const sandbox = ( { argv = [], platform = 'linux', electron = ELECTRON_14, switchesStripped = false } = {}, run ) => {

	// `switchesStripped` is the AppImage/Snap/Flatpak case main.js already works
	// around for `--reset`: the arguments reach argv but never reach Chromium.
	const switches = {}
	for ( const arg of switchesStripped ? [] : argv ) {

		const [ key, value ] = arg.replace( /^--/, '' ).split( '=' )
		switches[key] = value ?? ''

	}

	const appended = []
	// What a relaunch would do, instead of actually replacing the test process.
	const relaunches = []
	const exits = []
	const electronStub = {
		app: {
			commandLine: {
				hasSwitch: key => key in switches,
				getSwitchValue: key => switches[key] ?? '',
				appendSwitch( key, value ) {

					switches[key] = value ?? ''
					appended.push( value === undefined ? `--${key}` : `--${key}=${value}` )

				},
			},
			relaunch( options ) {

				relaunches.push( options )

			},
			exit( code ) {

				exits.push( code )

			},
		},
	}

	const noop = () => {}
	const savedEnv = { ...process.env }
	const savedArgv = process.argv
	const savedPlatform = process.platform
	const savedElectron = process.versions.electron
	const originalLoad = Module._load

	Module._load = function ( request, ...rest ) {

		return request === 'electron' ? electronStub : originalLoad.call( this, request, ...rest )

	}

	require.cache[LOG_PATH] = { id: LOG_PATH, filename: LOG_PATH, loaded: true, exports: { info: noop, warn: noop } }
	delete require.cache[WAYLAND_PATH]

	process.argv = [ 'electron', ...argv ]
	Object.defineProperty( process, 'platform', { value: platform, configurable: true } )
	Object.defineProperty( process.versions, 'electron', { value: electron, configurable: true, enumerable: true, writable: true } )

	// Run detect() against a set of session variables and report what it decided,
	// then run the relaunch decision the same way main.js does.
	const inSession = env => {

		for ( const key of SESSION_VARS ) {

			delete process.env[key]

		}

		Object.assign( process.env, env )
		relaunches.length = 0
		exits.length = 0

		const wayland = require( WAYLAND_PATH )
		const state = wayland.detect()
		const relaunched = wayland.relaunchOnX11()
		// Called twice on purpose: no session may ever relaunch more than once.
		const relaunchedAgain = wayland.relaunchOnX11()

		return {
			appended,
			backend: state.backend,
			blocked: wayland.shortcutsBlockedReason(),
			debugInfo: wayland.debugInfo(),
			exits: [ ...exits ],
			relaunchArgs: relaunches[0]?.args ?? null,
			relaunched,
			relaunchedAgain,
			relaunches: relaunches.length,
			usingX11: state.usingX11,
			wayland: state.wayland,
		}

	}

	try {

		return run( inSession )

	} finally {

		Module._load = originalLoad
		process.argv = savedArgv
		Object.defineProperty( process, 'platform', { value: savedPlatform, configurable: true } )

		if ( savedElectron === undefined ) {

			delete process.versions.electron

		} else {

			Object.defineProperty( process.versions, 'electron', { value: savedElectron, configurable: true, enumerable: true, writable: true } )

		}

		for ( const key of Object.keys( process.env ) ) {

			delete process.env[key]

		}

		Object.assign( process.env, savedEnv )
		delete require.cache[WAYLAND_PATH]
		delete require.cache[LOG_PATH]

	}

}

// Shorthand for the single-call cases.
const detectIn = ( env, options ) => sandbox( options, inSession => inSession( env ) )

test( 'Wayland session on the X11 backend can grab hotkeys (#456)', () => {

	const result = detectIn( WAYLAND_WITH_XWAYLAND )

	expect( result.wayland ).toBe( true )
	expect( result.backend ).toBe( 'x11' )
	expect( result.usingX11 ).toBe( true )
	expect( result.blocked ).toBeNull()
	expect( result.appended ).toEqual( [] )

} )

test( 'Wayland session with no X server says hotkeys need one', () => {

	const result = detectIn( WAYLAND_NO_XWAYLAND )

	expect( result.usingX11 ).toBe( false )
	expect( result.blocked ).toContain( 'X server' )
	expect( result.appended ).toEqual( [] )

} )

test( 'Native Wayland backend says how to get hotkeys back', () => {

	// Electron 14 only reaches the Wayland backend when both switches are passed.
	const result = detectIn( WAYLAND_WITH_XWAYLAND, { argv: [ '--enable-features=UseOzonePlatform', '--ozone-platform=wayland' ] } )

	expect( result.backend ).toBe( 'wayland' )
	expect( result.usingX11 ).toBe( false )
	expect( result.blocked ).toContain( '--ozone-platform=x11' )
	expect( result.debugInfo ).toContain( 'cannot be grabbed here' )

	// Chromium 93's Ozone/X11 was experimental and is where #450 lives, so the
	// notice is all Electron 14 gets. See the relaunch tests below.
	expect( result.relaunched ).toBe( false )
	expect( result.relaunches ).toBe( 0 )

} )

test( 'An ozone switch Chromium 93 ignores does not raise a false alarm', () => {

	// Without UseOzonePlatform, Electron 14 stays on the legacy X11 backend and
	// hotkeys keep working, so there is nothing to warn about.
	const result = detectIn( WAYLAND_WITH_XWAYLAND, { argv: [ '--ozone-platform=wayland' ] } )

	expect( result.backend ).toBe( 'x11' )
	expect( result.blocked ).toBeNull()

} )

test( 'ELECTRON_OZONE_PLATFORM_HINT is read only where Electron honors it', () => {

	const env = { ...WAYLAND_WITH_XWAYLAND, ELECTRON_OZONE_PLATFORM_HINT: 'wayland' }

	// Electron 14 ignores the hint, so we are still on X11 and still fine.
	expect( detectIn( env, { electron: ELECTRON_14 } ).blocked ).toBeNull()

	// A build that honors it really is on native Wayland. That is the #456 report.
	const honored = detectIn( env, { electron: ELECTRON_41 } )
	expect( honored.backend ).toBe( 'wayland' )
	expect( honored.blocked ).toContain( '--ozone-platform=x11' )

} )

test( 'A modern Electron defaults to Wayland in a Wayland session', () => {

	// From Electron 38 the default is `auto`, so a distro build picks Wayland with
	// no flags at all and every shortcut dies silently. Say so.
	const result = detectIn( WAYLAND_WITH_XWAYLAND, { electron: ELECTRON_41 } )

	expect( result.backend ).toBe( 'wayland' )
	expect( result.blocked ).toContain( '--ozone-platform=x11' )

	// And the documented workaround clears it.
	const fixed = detectIn( WAYLAND_WITH_XWAYLAND, { electron: ELECTRON_41, argv: [ '--ozone-platform=x11' ] } )
	expect( fixed.usingX11 ).toBe( true )
	expect( fixed.blocked ).toBeNull()

} )

test( 'X11 sessions are left alone', () => {

	const result = detectIn( X11_SESSION )

	expect( result.wayland ).toBe( false )
	expect( result.blocked ).toBeNull()
	expect( result.appended ).toEqual( [] )

} )

test( 'macOS and Windows are untouched', () => {

	for ( const platform of [ 'darwin', 'win32' ] ) {

		const result = detectIn( WAYLAND_WITH_XWAYLAND, { platform } )

		expect( result.wayland, `${platform} is never a wayland session` ).toBe( false )
		expect( result.blocked ).toBeNull()
		expect( result.appended, `${platform} must not get ozone switches` ).toEqual( [] )

	}

} )

test( 'detect is idempotent on a loaded module', () => {

	// Same module instance, called twice: the second verdict must not inherit the
	// first. Preferences re-register shortcuts, so detect() runs more than once.
	sandbox( { argv: [ '--enable-features=UseOzonePlatform', '--ozone-platform=wayland' ] }, inSession => {

		const blockedRun = inSession( WAYLAND_WITH_XWAYLAND )
		expect( blockedRun.blocked ).toContain( '--ozone-platform=x11' )

		const x11Run = inSession( X11_SESSION )
		expect( x11Run.wayland ).toBe( false )
		expect( x11Run.blocked ).toBeNull()

		const blockedAgain = inSession( WAYLAND_WITH_XWAYLAND )
		expect( blockedAgain.blocked ).toContain( '--ozone-platform=x11' )

	} )

} )

test( 'Both reasons fit in a notification body', () => {

	// OS notifications truncate. This is the text the user actually reads.
	for ( const env of [ WAYLAND_NO_XWAYLAND, WAYLAND_WITH_XWAYLAND ] ) {

		const result = detectIn( env, { electron: ELECTRON_41 } )

		expect( result.blocked ).not.toBeNull()
		expect( result.blocked.length, result.blocked ).toBeLessThan( 110 )

	}

} )

// relaunchOnX11(): a switch cannot move the backend, so come back as a process
// that was launched on x11 to begin with. (LAC-5118)

test( 'Native Wayland on a modern Electron relaunches onto Ozone/X11', () => {

	// The #456 report: a distro build on Electron 38+, no flags, XWayland present.
	const result = detectIn( WAYLAND_WITH_XWAYLAND, { electron: ELECTRON_41, argv: [ '--some-user-flag' ] } )

	expect( result.backend ).toBe( 'wayland' )
	expect( result.relaunched ).toBe( true )
	expect( result.relaunches ).toBe( 1 )
	expect( result.exits ).toEqual( [ 0 ] )

	// The user's own arguments survive, and the backend arrives on the new one.
	expect( result.relaunchArgs ).toEqual( [
		'--some-user-flag',
		'--enable-features=UseOzonePlatform',
		'--ozone-platform=x11',
	] )

	// Still a no-op path for appendSwitch: this process is not being fixed, replaced.
	expect( result.appended ).toEqual( [] )

	// And it never fires a second time in the same process.
	expect( result.relaunchedAgain ).toBe( false )

} )

test( 'Relaunching keeps features the user already asked for', () => {

	// Chromium keeps only the last copy of a switch, so --enable-features has to be
	// merged. Overwriting it would silently drop whatever was there.
	const result = detectIn( WAYLAND_WITH_XWAYLAND, { electron: ELECTRON_41, argv: [ '--enable-features=WaylandWindowDecorations' ] } )

	expect( result.relaunched ).toBe( true )
	expect( result.relaunchArgs ).toEqual( [
		'--enable-features=WaylandWindowDecorations,UseOzonePlatform',
		'--ozone-platform=x11',
	] )

} )

test( 'Electron 14 is never relaunched', () => {

	// Chromium 93's Ozone/X11 is experimental and is the backend #450 lives on.
	// Our own builds must behave exactly as they did before this landed.
	const onWaylandBackend = detectIn( WAYLAND_WITH_XWAYLAND, { argv: [ '--enable-features=UseOzonePlatform', '--ozone-platform=wayland' ] } )
	expect( onWaylandBackend.backend ).toBe( 'wayland' )
	expect( onWaylandBackend.relaunched ).toBe( false )
	expect( onWaylandBackend.relaunches ).toBe( 0 )
	expect( onWaylandBackend.exits ).toEqual( [] )

	// And with no flags it is on legacy X11, where hotkeys already work.
	const plain = detectIn( WAYLAND_WITH_XWAYLAND )
	expect( plain.relaunched ).toBe( false )
	expect( plain.relaunches ).toBe( 0 )

} )

test( 'Sessions that already work are left where they are', () => {

	// An X11 session is never on the wayland backend, so it is never moved.
	expect( detectIn( X11_SESSION, { electron: ELECTRON_41 } ).relaunched ).toBe( false )

	// Neither is a Wayland session already running through XWayland.
	const viaXWayland = detectIn( WAYLAND_WITH_XWAYLAND, { electron: ELECTRON_41, argv: [ '--ozone-platform=x11' ] } )
	expect( viaXWayland.usingX11 ).toBe( true )
	expect( viaXWayland.relaunched ).toBe( false )

	// macOS and Windows have no backend to switch.
	for ( const platform of [ 'darwin', 'win32' ] ) {

		const result = detectIn( WAYLAND_WITH_XWAYLAND, { electron: ELECTRON_41, platform } )
		expect( result.relaunched, `${platform} must not relaunch` ).toBe( false )
		expect( result.exits ).toEqual( [] )

	}

} )

test( 'No X server means no relaunch, just the notice', () => {

	// Relaunching into x11 without an X server trades missing hotkeys for a window
	// that never appears.
	const result = detectIn( WAYLAND_NO_XWAYLAND, { electron: ELECTRON_41 } )

	expect( result.relaunched ).toBe( false )
	expect( result.exits ).toEqual( [] )

	// So the #456 notice stands, and it is the one for a native Wayland backend:
	// the session is on wayland, it just has no XWayland to move to.
	expect( result.backend ).toBe( 'wayland' )
	expect( result.blocked ).toContain( 'X11 session' )

} )

test( 'An explicit --ozone-platform=wayland is honored', () => {

	// Someone asked for this backend, possibly for the transparency in #450.
	// Leave them on it; the notice says what it costs.
	const result = detectIn( WAYLAND_WITH_XWAYLAND, { electron: ELECTRON_41, argv: [ '--ozone-platform=wayland' ] } )

	expect( result.backend ).toBe( 'wayland' )
	expect( result.relaunched ).toBe( false )
	expect( result.blocked ).toContain( '--ozone-platform=x11' )

} )

test( 'A relaunch that did not take effect does not loop', () => {

	// Guard one: the env var we set on the process we spawn.
	const guarded = detectIn( { ...WAYLAND_WITH_XWAYLAND, CROSSOVER_RELAUNCHED_X11: '1' }, { electron: ELECTRON_41 } )
	expect( guarded.backend ).toBe( 'wayland' )
	expect( guarded.relaunched ).toBe( false )
	expect( guarded.exits ).toEqual( [] )

	// Guard two: our own switch sitting in argv on a launcher that strips arguments
	// before Chromium parses them, where the env var may not survive either.
	const stripped = detectIn( WAYLAND_WITH_XWAYLAND, {
		electron: ELECTRON_41,
		argv: [ '--enable-features=UseOzonePlatform', '--ozone-platform=x11' ],
		switchesStripped: true,
	} )
	expect( stripped.backend ).toBe( 'wayland' )
	expect( stripped.relaunched ).toBe( false )
	expect( stripped.exits ).toEqual( [] )

} )
