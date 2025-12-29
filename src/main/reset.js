const { ipcMain } = require( 'electron' )
const log = require( './log' )
const sound = require( './sound' )
const windows = require( './windows' )
const Preferences = require( './preferences' )
const keyboard = require( './keyboard' )
const accessibility = require( './accessibility' )
const preferences = Preferences.init()
const app = skipFullReset => {

	// Sonic announcement
	sound.play( 'RESET' )

	// Close extra crosshairs
	windows.closeAllShadows()

	// Hides chooser and preferences
	keyboard.escapeAction()

	reset.allPreferences()

	// Reset accessibility preferences
	accessibility.resetAccessibilityPreferences()

	if ( !skipFullReset ) {

		keyboard.unregisterShortcuts()

		// todo - circular dependency using:
		// init()
		// Using app.relaunch to cheat
		// or, to restart completely
		ipcMain.emit( 'init' )

		// if ( !is.development ) {

		// 	electronApp.relaunch()
		// 	electronApp.exit()

		// 	return

		// }

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

	if ( typeof preferences.resetToDefaults === 'function' ) {

		preferences.resetToDefaults()

	} else {

		// defaults are all different: defaults.crosshair.positionX, Preferences.defaults.crosshair.positionX, Preferences.getDefaults().crosshair.positionX

		for ( const [ key, value ] of Object.entries( Preferences.getDefaults() ) ) {

			preferences.value( key, value )

		}

	}

}

const reset = {
	app,
	allPreferences,
	preference,
}

module.exports = reset
