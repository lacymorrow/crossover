const { is } = require( 'electron-util' )
const EXIT_CODES = require( '../config/exit-codes' )
const { checkboxTrue } = require( '../config/utils' )
const crossover = require( './crossover' )
const preferences = require( './electron-preferences' )
const iohook = require( './iohook' )
const keyboard = require( './keyboard' )
const keyboardShortcuts = require( './keyboard-shortcuts' )
const log = require( './log' )
const reset = require( './reset' )
const save = require( './save' )
const windows = require( './windows' )

const app = () => {

	// Opening 2nd instance focuses app
	app.on( 'second-instance', async () => {

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

	app.on( 'activate', async () => {

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

const shortcuts = () => {

	// Register all shortcuts
	const { keybinds } = preferences.defaults
	const custom = preferences.value( 'keybinds' ) // Defaults
	for ( const shortcut of keyboardShortcuts() ) {

		// Custom shortcuts
		if ( custom[shortcut.action] === '' ) {

			log.info( `Clearing keybind for ${shortcut.action}` )

		} else if ( custom[shortcut.action] && keybinds[shortcut.action] && custom[shortcut.action] !== keybinds[shortcut.action] ) {

			// If a custom shortcut exists for this action
			log.info( `Custom keybind for ${shortcut.action}` )
			keyboard.registerShortcut( custom[shortcut.action], shortcut.fn )

		} else if ( keybinds[shortcut.action] ) {

			// Set default keybind
			keyboard.registerShortcut( keybinds[shortcut.action], shortcut.fn )

		} else {

			// Fallback to internal bind - THIS SHOULDNT HAPPEN
			// if it does you forgot to add a default keybind for this shortcut
			log.info( 'ERROR', shortcut )
			keyboard.registerShortcut( shortcut.keybind, shortcut.fn )

		}

	}

}

const startOnBoot = () => {

	// Start app on boot
	if ( !is.development && checkboxTrue( preferences.value( 'app.boot' ), 'boot' ) ) {

		app.setLoginItemSettings( {
			openAtLogin: true,
		} )

	} else {

		app.setLoginItemSettings( {
			openAtLogin: false,
		} )

	}

}

const register = {
	app,
	events,
	saveWindowBounds,
	shortcuts,
	startOnBoot,
}
module.exports = register
