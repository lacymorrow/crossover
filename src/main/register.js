const { app: electronApp } = require( 'electron' )
const { is } = require( 'electron-util' )
const EXIT_CODES = require( '../config/exit-codes' )
const crossover = require( './crossover' )
const preferences = require( './electron-preferences' )
const iohook = require( './iohook' )
const keyboard = require( './keyboard' )
const reset = require( './reset' )
const save = require( './save' )
const windows = require( './windows' )

const app = () => {

	// Opening 2nd instance focuses app
	electronApp.on( 'second-instance', async () => {

		if ( windows.win ) {

			crossover.initShadowWindow()

			if ( windows.win.isMinimized() ) {

				windows.win.restore()

			}

			windows.win.show()

			crossover.toggleWindowLock( false )

		} else {

			await windows.init()

		}

	} )

	electronApp.on( 'will-quit', () => {

		// Unregister all shortcuts.
		iohook.unregisterIOHook()
		keyboard.unregisterShortcuts()

	} )

	// Sending a `SIGINT` (e.g: Ctrl-C) to an Electron electronApp that registers
	// a `beforeunload` window event handler results in a disconnected white
	// browser window in GNU/Linux and macOS.
	// The `before-quit` Electron event is triggered in `SIGINT`, so we can
	// make use of it to ensure the browser window is completely destroyed.
	// See https://github.com/electron/electron/issues/5273
	electronApp.on( 'before-quit', () => {

		electronApp.releaseSingleInstanceLock()
		process.exit( EXIT_CODES.SUCCESS )

	} )

	electronApp.on( 'window-all-closed', electronApp.quit )

	electronApp.on( 'activate', async () => {

		// Will return current window if exists
		await windows.init()

	} )

}

const events = () => {

	// Sync preferences to renderer
	preferences.on( 'save', options => {

		console.log( options.app )
		crossover.syncSettings( options )

	} )

	// Sync preferences to renderer
	preferences.on( 'click', key => {

		switch ( key ) {

			case 'chooseCrosshair':
				crossover.openChooserWindow()
				break
			case 'resetPreferences':
				reset.preferences()
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
		register.events()
		windows.win.show()

	} )

	// Close windows if clicked away (mac only)
	if ( !is.development ) {

		windows.chooserWindow.on( 'blur', () => {

			windows.hideChooserWindow()

		} )

	}

}

const saveWindowBounds = () => {

	windows.win.on( 'move', () => {

		save.position( windows.win.getBounds() )

	} )

}

const register = {
	app,
	events,
	saveWindowBounds,
}
module.exports = register
