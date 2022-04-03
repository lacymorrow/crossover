const { globalShortcut } = require( 'electron' )
const actions = require( './actions' )
const electronPreferences = require( './electron-preferences' )
const iohook = require( './iohook' )
const log = require( './log' )
const sound = require( './sound' )
const windows = require( './windows' )

const app = skipSetup => {

	sound.play( 'RESET' )

	// Close extra crosshairs
	windows.closeAllShadows()

	// Hides chooser and preferences
	actions.escapeAction()

	windows.center()
	preferences()

	if ( !skipSetup ) {

		iohook.unregisterIOHook()

		globalShortcut.unregisterAll()

		// IpcMain.removeAllListeners()

		windows.unregister()

		// crossover.setupApp( true )

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

		electronPreferences.value( key, value )

	}

}

const reset = { app, preference, preferences }
module.exports = reset
