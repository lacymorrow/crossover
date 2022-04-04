const log = require( './log' )
const preferences = require( './electron-preferences' )
const set = require( './set' )
const windows = require( './windows' )
const register = require( './register' )
const ipc = require( './ipc' )
const crossover = require( './crossover' )

const init = async () => {

	log.info( 'Init' )

	// Preferences
	preferences.value( 'hidden.showSettings', false )

	// IPC
	ipc.init()

	// Sync Settings
	crossover.syncSettings()

	// App centered by default - set position if exists
	if ( preferences.value( 'hidden.positionX' ) !== null && typeof preferences.value( 'hidden.positionX' ) !== 'undefined' ) {

		set.position( preferences.value( 'hidden.positionX' ), preferences.value( 'hidden.positionY' ) )

	}

	// Set lock state, timeout makes it pretty
	setTimeout( () => {

		// Todo: We shouldn't need a timeout here
		// Keyboard shortcuts - delay fixes an unbreakable loop on reset, continually triggering resets
		crossover.registerKeyboardShortcuts()

		const locked = preferences.value( 'hidden.locked' )
		crossover.lockWindow( locked )

		// Show on first load if unlocked (unlocking shows already)
		// if locked we have to call show() if another window has focus
		if ( locked ) {

			windows.win.show()

		}

	}, 500 )

	// Spawn chooser window
	if ( !windows.chooserWindow ) {

		windows.chooserWindow = await windows.createChooser( preferences.value( 'crosshair.crosshair' ) )

	}

	// Focus
	windows.win.focus()

	// Window Events after windows are created
	register.events()

}

module.exports = init
