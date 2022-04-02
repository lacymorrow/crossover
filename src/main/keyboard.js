const { globalShortcut } = require( 'electron' )

const isRegistered = ( ...args ) => globalShortcut.isRegistered( ...args )

const registerShortcut = ( ...args ) => globalShortcut.register( ...args )

const unregisterShortcut = ( ...args ) => globalShortcut.unregister( ...args )

const unregisterShortcuts = () => globalShortcut.unregisterAll()

const keyboard = {
	isRegistered,
	registerShortcut,
	unregisterShortcut,
	unregisterShortcuts,
}

module.exports = keyboard
