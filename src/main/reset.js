const { app: electronApp, ipcMain } = require( 'electron' )
const actions = require( './actions' )
const log = require( './log' )
const electronPreferences = require( './electron-preferences' )
const sound = require( './sound' )
const windows = require( './windows' )

const app = skipFullReset => {

	sound.play( 'RESET' )

	// Close extra crosshairs
	windows.closeAllShadows()

	// Hides chooser and preferences
	actions.escape()

	if ( !skipFullReset ) {

		// todo - circular dependency using:
		// init()
		// Using app.relaunch to cheat

		// or, to restart completely
		// electronApp.relaunch()
		// electronApp.exit()

		ipcMain.emit( 'init' )

	}

}

const preference = key => {

	try {

		const [ groupId, id ] = key.split( '.' )
		const group = electronPreferences.defaults[groupId]
		const defaultValue = group[id]

		log.info( `Setting default value ${defaultValue} for ${key}` )
		electronPreferences.value( key, defaultValue )

	} catch ( error ) {

		log.warn( error )

	}

}

const reset = {
	app,
	preference,
}

module.exports = reset
