const { globalShortcut } = require( 'electron' )

const isRegistered = ( ...args ) => globalShortcut.isRegistered( ...args )

const registerShortcut = ( ...args ) => globalShortcut.register( ...args )

const unregisterShortcuts = () => globalShortcut.unregisterAll()

const keyboard = {
	isRegistered,
	registerShortcut,
	unregisterShortcuts,
}

module.exports = keyboard
