const keyboard = require( './keyboard' )
const windows = require( './windows' )

const escape = () => {

	// log.info( 'Escape event' )

	windows.hideChooserWindow()
	windows.hideSettingsWindow()

	// TODO: circular dep - when using keyboard
	// globalShortcut.unregister( 'Escape' )
	keyboard.unregisterShortcut( 'Escape' )

}

const actions = {
	escape,
}

module.exports = actions
