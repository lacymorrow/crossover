const { app: electronApp, ipcMain } = require( 'electron' )
const log = require( './log' )
const sound = require( './sound' )
const windows = require( './windows' )
const Preferences = require( './preferences' )
const { is } = require( 'electron-util' )
const keyboard = require( './keyboard' )
const preferences = Preferences.init()
const app = skipFullReset => {

	// Sonic announcement
	sound.play( 'RESET' )

	// Close extra crosshairs
	windows.closeAllShadows()

	// Hides chooser and preferences
	keyboard.escapeAction()

	reset.allPreferences()

	if ( !skipFullReset ) {
		keyboard.unregisterShortcuts()

		// todo - circular dependency using:
		// init()
		// Using app.relaunch to cheat
		// or, to restart completely
		ipcMain.emit( 'init' )
		return

		if ( !is.development ) {

			electronApp.relaunch()
			electronApp.exit()

			return

		}


	}

}

const preference = key => {

	const defaults = Preferences.getDefaults()

	try {

		const [ groupId, id ] = key.split( '.' )
		const group = defaults[groupId]
		const defaultValue = group[id]

		log.info( `Setting default value ${defaultValue} for ${key}` )
		preferences.value( key, defaultValue )

	} catch ( error ) {

		log.warn( error )

	}

}

// Temp until implemented in electron-preferences
const allPreferences = () => {

	// defaults are all different: defaults.hidden.positionX, Preferences.defaults.hidden.positionX, Preferences.getDefaults().hidden.positionX

	for ( const [ key, value ] of Object.entries( Preferences.getDefaults() ) ) {

		preferences.value( key, value )

	}

}

const reset = {
	app,
	allPreferences,
	preference,
}

module.exports = reset
