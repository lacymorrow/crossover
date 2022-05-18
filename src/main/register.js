const { app } = require( 'electron' )
const { is } = require( 'electron-util' )
const EXIT_CODES = require( '../config/exit-codes' )
const crossover = require( './crossover' )
const preferences = require( './preferences' ).init()
const iohook = require( './iohook' )
const keyboard = require( './keyboard' )
const log = require( './log' )
const reset = require( './reset' )
const windows = require( './windows' )

const appEvents = () => {

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

	app.on( 'will-quit', () => {

		// Unregister all shortcuts.
		iohook.unregisterIOHook()
		keyboard.unregisterShortcuts()

	} )

	// Sending a `SIGINT` (e.g: Ctrl-C) to an Electron app that registers
	// a `beforeunload` window event handler results in a disconnected white
	// browser window in GNU/Linux and macOS.
	// The `before-quit` Electron event is triggered in `SIGINT`, so we can
	// make use of it to ensure the browser window is completely destroyed.
	// See https://github.com/electron/electron/issues/5273
	app.on( 'before-quit', () => {

		app.releaseSingleInstanceLock()
		process.exit( EXIT_CODES.SUCCESS )

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
