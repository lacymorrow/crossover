const { app, session } = require( 'electron' )
const { is } = require( './util' )
const crossover = require( './crossover' )
const preferences = require( './preferences' ).init()
const iohook = require( './iohook' )
const keyboard = require( './keyboard' )
const log = require( './log' )
const reset = require( './reset' )
const windows = require( './windows' )

const appEvents = () => {

	// CrossOver only renders local files and needs no browser permissions.
	// Deny all permission requests (geolocation, notifications, camera, etc.)
	// to prevent unexpected OS prompts, particularly on Windows. (#471)
	session.defaultSession.setPermissionRequestHandler( ( _webContents, _permission, callback ) => {

		callback( false )

	} )

	app.on( 'activate', async () => {

		// Will return current window if exists
		await windows.init()

	} )

	// Opening 2nd instance focuses app
	app.on( 'second-instance', async () => {

		log.warn( 'Tried to create second app instance' )

		// If locked, unlock, else create shadow window
		if ( windows.win ) {

			if ( preferences.value( 'hidden.locked' ) ) {

				// Unlock
				crossover.toggleWindowLock( false )

			} else {

				// Show app and create shadow window
				if ( windows.win.isMinimized() ) {

					windows.win.restore()

				}

				windows.win.show()
				crossover.initShadowWindow()

			}

		} else {

			await windows.init()

		}

	} )

	// Sending a `SIGINT` (e.g: Ctrl-C) to an Electron app that registers
	// a `beforeunload` window event handler results in a disconnected white
	// browser window in GNU/Linux and macOS.
	// The `before-quit` Electron event is triggered in `SIGINT`, so we can
	// make use of it to ensure the browser window is completely destroyed.
	// See https://github.com/electron/electron/issues/5273
	app.on( 'before-quit', () => {

		// Unlock all windows before quitting so they can properly close on Windows
		// When locked, closable=false prevents the window from being destroyed,
		// leaving a zombie process (see #480)
		const makeWindowClosable = win => {

			if ( win && !win.isDestroyed() ) {

				win.closable = true
				win.setFocusable( true )
				win.setIgnoreMouseEvents( false )

			}

		}

		makeWindowClosable( windows.win )
		windows.shadowWindows.forEach( makeWindowClosable )

		app.releaseSingleInstanceLock()

	} )

	app.on( 'will-quit', () => {

		// Save lock state before cleanup so it persists for next launch
		// Then unregister all hooks and shortcuts
		iohook.unregisterIOHook()
		keyboard.unregisterShortcuts()
		// process.exit( EXIT_CODES.SUCCESS )

	} )

	app.on( 'window-all-closed', app.quit )

	app.on( 'web-contents-created', ( event, webContents ) => {

		// Security #13: Prevent navigation
		// https://www.electronjs.org/docs/latest/tutorial/security#13-disable-or-limit-navigation
		webContents.on( 'will-navigate', ( event, _navigationUrl ) => {

			event.preventDefault()

		} )

		// Security workaround for https://github.com/lacymorrow/crossover/security/dependabot/7
		// Affects electron < 13.6.6
		webContents.on( 'select-bluetooth-device', ( event, devices, callback ) => {

			// Prevent default behavior
			event.preventDefault()
			// Cancel the request
			callback( '' )

		} )

	} )

}

const events = () => {

	// Sync preferences to renderer
	preferences.on( 'save', options => {

		crossover.syncSettings( options )

	} )

	// Sync preference buttons to renderer
	preferences.on( 'click', key => {

		switch ( key ) {

		case 'chooseCrosshair':
			crossover.openChooserWindow()
			break
		case 'resetPreferences':
			reset.allPreferences()
			break
		case 'resetApp':
			reset.app()
			break
		default:
			// Key not found
			break

		}

	} )

	// Reopen settings/chooser if killed
	windows.chooserWindow.on( 'close', async () => {

		windows.showHideWindow()
		await windows.createChooser()
		events()

	} )

	// Close windows if clicked away (mac only)
	if ( !is.development ) {

		windows.chooserWindow.on( 'blur', () => {

			windows.hideChooserWindow( { focus: true } )

		} )

	}

}

const register = {
	appEvents,
	events,
}
module.exports = register
