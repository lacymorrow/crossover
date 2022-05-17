const { app } = require( 'electron' )
const { is } = require( 'electron-util' )
const EXIT_CODES = require( '../config/exit-codes' )
const crossover = require( './crossover' )
const preferences = require( './preferences' ).init()
const iohook = require( './iohook' )
const keyboard = require( './keyboard' )
const reset = require( './reset' )
const windows = require( './windows' )

const appEvents = () => {

	app.on( 'activate', async () => {

		// Will return current window if exists
		await windows.init()

	} )

	// Opening 2nd instance focuses app
	app.on( 'second-instance', async () => {

		// If locked, unlock, else create shadow window
		if ( windows.win ) {

			if ( preferences.value( 'hidden.locked' ) ) {

				crossover.toggleWindowLock( false )

			} else {

				crossover.initShadowWindow()

				if ( windows.win.isMinimized() ) {

					windows.win.restore()

				}

				windows.win.show()

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

	// Security workaround for https://github.com/lacymorrow/crossover/security/dependabot/7
	// Affects electron < 13.6.6
	app.on( 'web-contents-created', ( event, webContents ) => {

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
