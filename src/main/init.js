const log = require( './log' )
const preferences = require( './electron-preferences' )
const set = require( './set' )
const windows = require( './windows' )
const register = require( './register' )
const ipc = require( './ipc' )
const crossover = require( './crossover' )
const { checkboxTrue } = require( '../config/utils' )
const { ipcMain } = require( 'electron' )

const init = async () => {

	log.info( 'Init' )

	// Cleanup (if reset)
	ipcMain.removeAllListeners()

	// Reset some preferences
	preferences.value( 'hidden.showSettings', false )
	preferences.value( 'hidden.tilted', false )

	// Start unlocked?
	if ( checkboxTrue( preferences.value( 'app.startUnlocked' ), 'startUnlocked' ) ) {

		preferences.value( 'hidden.locked', false )

	}

	// IPC
	ipc.init()

	// Sync Settings
	crossover.syncSettings()

	// App centered by default - set position if exists
	if ( preferences.value( 'hidden.positionX' ) !== null && typeof preferences.value( 'hidden.positionX' ) !== 'undefined' ) {

		// Todo: do not set invalid bounds
		set.position( preferences.value( 'hidden.positionX' ), preferences.value( 'hidden.positionY' ) )

	}

	// Set lock state, timeout makes it pretty
	setTimeout( () => {

		// Todo: We shouldn't need a timeout here
		// Keyboard shortcuts - delay fixes an unbreakable loop on reset, continually triggering resets
		crossover.registerKeyboardShortcuts()

		// Show or hide window
		crossover.lockWindow( preferences.value( 'hidden.locked' ) )

	}, 500 )

	// Spawn chooser window (if resetting it may exist)
	await windows.createChooser( preferences.value( 'crosshair.crosshair' ) )

	// Window Events after windows are created
	register.events()

	ipcMain.on( 'init', ( _event, arg ) => {

		init( arg )

	} )

}

module.exports = init
