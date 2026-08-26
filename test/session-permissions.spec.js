const fs = require( 'fs' )
const path = require( 'path' )
const { expect, test } = require( '@playwright/test' )

// Regression tests for #529 (startup race): appEvents() ran before
// app.whenReady() and touched session.defaultSession to install the
// deny-all permission handlers from #493. Electron throws "Session can
// only be received when app is ready" on pre-ready access, crashing the
// main process before any window or tray exists on machines that lose
// the race. The handlers must always be installed via a whenReady()
// deferral (src/main/session-permissions.js).

const SRC_DIR = path.resolve( 'src' )
const MODULE_PATH = require.resolve( '../src/main/session-permissions.js' )

// Minimal stand-in for Electron that reproduces the real semantics the
// bug depends on: defaultSession throws until the app is ready.
const loadWithFakeElectron = () => {

	const handlers = {}
	let ready = false
	let resolveReady
	const readyPromise = new Promise( resolve => {

		resolveReady = () => {

			ready = true
			resolve()

		}

	} )

	const fakeElectron = {
		app: {
			isReady: () => ready,
			whenReady: () => readyPromise,
			on() {},
		},
		session: {},
	}

	Object.defineProperty( fakeElectron.session, 'defaultSession', {
		get() {

			if ( !ready ) {

				throw new Error( 'Session can only be received when app is ready' )

			}

			return {
				setPermissionRequestHandler( handler ) {

					handlers.request = handler

				},
				setPermissionCheckHandler( handler ) {

					handlers.check = handler

				},
			}

		},
	} )

	const electronPath = require.resolve( 'electron' )
	const previous = require.cache[electronPath]
	require.cache[electronPath] = {
		id: electronPath,
		filename: electronPath,
		loaded: true,
		exports: fakeElectron,
	}
	delete require.cache[MODULE_PATH]

	try {

		return {
			sessionPermissions: require( '../src/main/session-permissions.js' ),
			handlers,
			resolveReady,
		}

	} finally {

		if ( previous ) {

			require.cache[electronPath] = previous

		} else {

			delete require.cache[electronPath]

		}

		delete require.cache[MODULE_PATH]

	}

}

test( 'init() before app is ready must not throw', async () => {

	const { sessionPermissions } = loadWithFakeElectron()

	expect( () => sessionPermissions.init() ).not.toThrow()

} )

test( 'Handlers are installed after ready and deny all permissions', async () => {

	const { sessionPermissions, handlers, resolveReady } = loadWithFakeElectron()

	const installed = sessionPermissions.init()

	expect( handlers.request, 'must not touch defaultSession before ready' ).toBeUndefined()

	resolveReady()
	await installed

	let granted = null
	handlers.request( null, 'notifications', allowed => {

		granted = allowed

	} )

	expect( granted, 'permission requests must be denied' ).toBe( false )
	expect( handlers.check(), 'permission checks must be denied' ).toBe( false )

} )

test( 'session.defaultSession is only accessed by session-permissions.js', async () => {

	const collectSourceFiles = dir => fs.readdirSync( dir, { withFileTypes: true } )
		.flatMap( entry => {

			const fullPath = path.join( dir, entry.name )
			if ( entry.isDirectory() ) {

				return collectSourceFiles( fullPath )

			}

			return entry.name.endsWith( '.js' ) ? [ fullPath ] : []

		} )

	for ( const file of collectSourceFiles( SRC_DIR ) ) {

		if ( path.resolve( file ) === MODULE_PATH ) {

			continue

		}

		const source = fs.readFileSync( file, 'utf8' )
		expect( source.includes( 'defaultSession' ), `${path.relative( SRC_DIR, file )} must not access defaultSession directly — use session-permissions.js, which defers until app ready (#529)` ).toBe( false )

	}

} )
