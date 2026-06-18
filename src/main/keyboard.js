const { globalShortcut } = require( 'electron' )
const windows = require( './windows' )

const escapeAction = () => {

	windows.hideSettingsWindow()
	windows.hideChooserWindow( { focus: true } )

	keyboard.unregisterShortcut( 'Escape' )

}

const isRegistered = ( ...args ) => globalShortcut.isRegistered( ...args )

const registerEscape = ( action = keyboard.escapeAction ) => {

	if ( !globalShortcut.isRegistered( 'Escape' ) ) {

		globalShortcut.register( 'Escape', action )

	}

}

const registerShortcut = ( accelerator, fn ) => {

	const registered = globalShortcut.register( accelerator, fn )
	if ( !registered ) {

		// eslint-disable-next-line no-console
		console.warn( `[CrossOver] globalShortcut.register failed for: ${accelerator} (another app may have claimed this combo)` )

	}

	return registered

}

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
