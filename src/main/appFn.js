const { app, globalShortcut } = require( 'electron' )
const EXIT_CODES = require( '../config/exit-codes' )
const iohook = require( './iohook' )
const windows = require( './windows' )

const on = () => {

	// Opening 2nd instance focuses app
	app.on( 'second-instance', async () => {

		if ( windows.win ) {

			setupShadowWindow( await windows.createShadow() )

			if ( windows.win.isMinimized() ) {

				windows.win.restore()

			}

			windows.win.show()

			toggleWindowLock( false )

		} else {

			await windows.init()

		}

	} )

	app.on( 'will-quit', () => {

		// Unregister all shortcuts.
		iohook.unregisterIOHook()
		globalShortcut.unregisterAll()

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

	app.on( 'activate', async () => {

		windows.init()

	} )

}

const appFn = {
	on,
}

module.exports = appFn
