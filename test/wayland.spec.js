const path = require( 'path' )
const Module = require( 'module' )
const { expect, test } = require( '@playwright/test' )

// Regression tests for #456: shortcuts registered without error on KDE Plasma
// Wayland and then never fired, because a native Wayland compositor refuses the
// X11 input grab that globalShortcut needs. wayland.preferX11() moves the app
// onto XWayland when one is available, and explains itself when it can't.

const WAYLAND_PATH = require.resolve( path.join( __dirname, '../src/main/wayland.js' ) )
const LOG_PATH = require.resolve( path.join( __dirname, '../src/main/log.js' ) )
const SESSION_VARS = [
	'XDG_SESSION_TYPE', 'WAYLAND_DISPLAY', 'DISPLAY', 'CROSSOVER_OZONE_PLATFORM', 'ELECTRON_OZONE_PLATFORM_HINT',
]

/**
 * Load wayland.js against a faked Linux session and report what it did.
 * Stubs `electron` and `./log.js` so nothing touches the real app.
 */
const inSession = ( { env = {}, argv = [], platform = 'linux' } = {} ) => {

	const appended = []
	const switches = {}
	const electronStub = {
		app: {
			commandLine: {
				hasSwitch: key => key in switches,
				appendSwitch( key, value ) {

					switches[key] = value
					appended.push( value === undefined ? `--${key}` : `--${key}=${value}` )

				},
			},
		},
	}

	const noop = () => {}
	const savedEnv = { ...process.env }
	const savedArgv = process.argv
	const savedPlatform = process.platform
	const originalLoad = Module._load

	Module._load = function ( request, ...rest ) {

		return request === 'electron' ? electronStub : originalLoad.call( this, request, ...rest )

	}

	require.cache[LOG_PATH] = { id: LOG_PATH, filename: LOG_PATH, loaded: true, exports: { info: noop, warn: noop } }
	delete require.cache[WAYLAND_PATH]

	for ( const key of SESSION_VARS ) {

		delete process.env[key]

	}

	Object.assign( process.env, env )
	process.argv = [ 'electron', ...argv ]
	Object.defineProperty( process, 'platform', { value: platform, configurable: true } )

	try {

		const wayland = require( WAYLAND_PATH )
		const state = wayland.preferX11()

		return {
			appended,
			usingX11: state.usingX11,
			wayland: state.wayland,
			blocked: wayland.shortcutsBlockedReason(),
			debugInfo: wayland.debugInfo(),
		}

	} finally {

		Module._load = originalLoad
		process.argv = savedArgv
		Object.defineProperty( process, 'platform', { value: savedPlatform, configurable: true } )

		for ( const key of Object.keys( process.env ) ) {

			delete process.env[key]

		}

		Object.assign( process.env, savedEnv )
		delete require.cache[WAYLAND_PATH]
		delete require.cache[LOG_PATH]

	}

}

const waylandWithXwayland = { XDG_SESSION_TYPE: 'wayland', WAYLAND_DISPLAY: 'wayland-0', DISPLAY: ':0' }

test( 'Wayland session with XWayland runs on X11 so shortcuts fire (#456)', () => {

	const result = inSession( { env: waylandWithXwayland } )

	expect( result.appended ).toEqual( [ '--enable-features=UseOzonePlatform', '--ozone-platform=x11' ] )
	expect( result.usingX11 ).toBe( true )
	expect( result.blocked ).toBeNull()

} )

test( 'Native Wayland with no XWayland says why shortcuts cannot work', () => {

	const result = inSession( { env: { XDG_SESSION_TYPE: 'wayland', WAYLAND_DISPLAY: 'wayland-0' } } )

	// Forcing x11 without an X server would leave the app unable to open a window.
	expect( result.appended ).toEqual( [] )
	expect( result.usingX11 ).toBe( false )
	expect( result.blocked ).toContain( 'XWayland' )
	// OS notifications truncate: this is the body the user actually reads.
	expect( result.blocked.length ).toBeLessThan( 100 )

} )

test( 'X11 sessions are left alone', () => {

	const result = inSession( { env: { XDG_SESSION_TYPE: 'x11', DISPLAY: ':0' } } )

	expect( result.appended ).toEqual( [] )
	expect( result.wayland ).toBe( false )
	expect( result.blocked ).toBeNull()

} )

test( 'macOS and Windows are untouched', () => {

	for ( const platform of [ 'darwin', 'win32' ] ) {

		const result = inSession( { platform, env: waylandWithXwayland } )

		expect( result.appended, `${platform} must not get ozone switches` ).toEqual( [] )
		expect( result.wayland ).toBe( false )

	}

} )

test( 'An explicit --ozone-platform wins', () => {

	const result = inSession( { env: waylandWithXwayland, argv: [ '--ozone-platform=wayland' ] } )

	expect( result.appended ).toEqual( [] )
	expect( result.usingX11 ).toBe( false )

} )

test( 'CROSSOVER_OZONE_PLATFORM=wayland stays native and turns hotkeys off', () => {

	const result = inSession( { env: { ...waylandWithXwayland, CROSSOVER_OZONE_PLATFORM: 'wayland' } } )

	expect( result.appended ).toEqual( [ '--enable-features=UseOzonePlatform', '--ozone-platform=wayland' ] )
	expect( result.usingX11 ).toBe( false )

} )

test( 'CROSSOVER_OZONE_PLATFORM applies the platform it names', () => {

	// Nothing but us reads this variable, so ignoring its value would make
	// CROSSOVER_OZONE_PLATFORM=x11 silently do nothing.
	const result = inSession( { env: { ...waylandWithXwayland, CROSSOVER_OZONE_PLATFORM: 'x11' } } )

	expect( result.appended ).toEqual( [ '--enable-features=UseOzonePlatform', '--ozone-platform=x11' ] )
	expect( result.usingX11 ).toBe( true )

} )

test( 'ELECTRON_OZONE_PLATFORM_HINT opts out', () => {

	const result = inSession( { env: { ...waylandWithXwayland, ELECTRON_OZONE_PLATFORM_HINT: 'wayland' } } )

	expect( result.appended ).toEqual( [] )
	expect( result.usingX11 ).toBe( false )

} )

test( 'preferX11 is idempotent across calls', () => {

	// The second call must not inherit the first call's verdict.
	const first = inSession( { env: waylandWithXwayland } )
	const second = inSession( { env: { XDG_SESSION_TYPE: 'x11', DISPLAY: ':0' } } )

	expect( first.usingX11 ).toBe( true )
	expect( second.usingX11 ).toBe( false )
	expect( second.wayland ).toBe( false )

} )
