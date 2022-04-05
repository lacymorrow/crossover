const electron = require( 'electron' )
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

	windows.center()
	reset.preferences()

	if ( !skipFullReset ) {

		// todo - circular dependency using:
		// init()
		// Using app.relaunch to cheat

		// or, to restart completely
		electron.app.relaunch()
		electron.app.exit()

		// ipcMain.emit( 'init', { triggeredByReset: true } )

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

// Temp until implemented in electron-preferences
const preferences = () => {

	const { defaults } = electronPreferences
	for ( const [ key, value ] of Object.entries( defaults ) ) {

		console.log( 'default', key, value )
		electronPreferences.value( key, value )

	}

}

const reset = {
	app,
	preference,
	preferences,
}

module.exports = reset
