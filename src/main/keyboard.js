const { globalShortcut } = require( 'electron' )
const windows = require( './windows' )

const escapeAction = () => {

	windows.hideChooserWindow()
	windows.hideSettingsWindow()

	keyboard.unregisterShortcut( 'Escape' )

}

const isRegistered = ( ...args ) => globalShortcut.isRegistered( ...args )

const registerEscape = ( action = keyboard.escapeAction ) => {

	if ( !globalShortcut.isRegistered( 'Escape' ) ) {

		globalShortcut.register( 'Escape', action )

	}

}

const registerShortcut = ( ...args ) => globalShortcut.register( ...args )

const unregisterShortcut = ( ...args ) => globalShortcut.unregister( ...args )

const unregisterShortcuts = () => globalShortcut.unregisterAll()

const keyboard = {
	escapeAction,
	isRegistered,
	registerEscape,
	registerShortcut,
	unregisterShortcut,
	unregisterShortcuts,
}

module.exports = keyboard
