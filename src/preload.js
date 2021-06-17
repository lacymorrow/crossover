// Via https://github.com/reZach/secure-electron-template
const {
	contextBridge,
	ipcRenderer
} = require( 'electron' )
const { is } = require( 'electron-util' )
const { debounce, deepFreeze } = require( './util.js' )

console.log( 'Dev:', is.development )
console.log( 'contextBridge:', contextBridge.internalContextBridge && contextBridge.internalContextBridge.contextIsolationEnabled )

const api = {
	debounce,
	isLinux: is.linux,
	isMacOs: is.macos,
	send: ( channel, data ) => {

		// Whitelist channels
		const validChannels = new Set( [ 'open_settings', 'center_window', 'close_window', 'open_chooser', 'save_custom_image', 'quit' ] )

		if ( validChannels.has( channel ) ) {

			ipcRenderer.send( channel, data )

		}

	},

	receive: ( channel, func ) => {

		const validChannels = new Set( [ 'set_color', 'set_crosshair', 'set_custom_image', 'set_opacity', 'set_size', 'set_sight', 'lock_window', 'add_class' ] )

		if ( validChannels.has( channel ) ) {

			// Deliberately strip event as it includes `sender`
			ipcRenderer.on( channel, ( event, ...args ) => func( ...args ) )

		}

	}
}

// Spectron issue: https://github.com/electron-userland/spectron/issues/693
if ( contextBridge.internalContextBridge && contextBridge.internalContextBridge.contextIsolationEnabled ) {

	/**
     * The "Main World" is the JavaScript context that your main renderer code runs in.
     * By default, the page you load in your renderer executes code in this world.
     *
     * @see https://www.electronjs.org/docs/api/context-bridge
     */
	contextBridge.exposeInMainWorld( 'crossover', api )

} else {

	// DeepFreeze from https://github.com/electron-userland/spectron/issues/693#issuecomment-748482545
	window.crossover = deepFreeze( api )
	window.testing = true
	// Github.com/electron-userland/spectron#node-integration
	// window.electronRequire = require

}
