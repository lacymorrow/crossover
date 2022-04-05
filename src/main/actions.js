const keyboard = require( './keyboard' )
const log = require( './log' )
const windows = require( './windows' )

const escape = () => {

	log.info( 'Escape event' )

	windows.hideChooserWindow()
	windows.hideSettingsWindow()

	keyboard.unregisterShortcut( 'Escape' )

}

const actions = {
	escape,
}

module.exports = actions
