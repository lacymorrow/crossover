// Via https://github.com/reZach/secure-electron-template
const {
	contextBridge,
	ipcRenderer
} = require( 'electron' )
const { is } = require( 'electron-util' )
const { debounce } = require( './util' )

const api = {
	debounce,
	isMacOs: is.macos,
	send: ( channel, data ) => {

		// Whitelist channels
		const validChannels = new Set( [ 'save_color', 'save_opacity', 'save_size', 'save_sight', 'center_window', 'open_chooser', 'save_custom_image' ] )

		if ( validChannels.has( channel ) ) {

			ipcRenderer.send( channel, data )

		}

	},

	receive: ( channel, func ) => {

		const validChannels = new Set( [ 'load_color', 'set_crosshair', 'set_custom_image', 'set_opacity', 'set_size', 'set_sight', 'lock_window' ] )

		if ( validChannels.has( channel ) ) {

			// Deliberately strip event as it includes `sender`
			ipcRenderer.on( channel, ( event, ...args ) => func( ...args ) )

		}

	}
}

// Spectron issue: https://github.com/electron-userland/spectron/issues/693
if ( !process.env.NODE_ENV === 'test' ) {

	/**
   * The "Main World" is the JavaScript context that your main renderer code runs in.
   * By default, the page you load in your renderer executes code in this world.
   *
   * @see https://www.electronjs.org/docs/api/context-bridge
   */
	contextBridge.exposeInMainWorld( 'crossover', api )

} else {

	/**
   * Recursively Object.freeze() on objects and functions
   * @see https://github.com/substack/deep-freeze
   * @param o Object on which to lock the attributes
   */
	function deepFreeze( o ) {

		Object.freeze( o )

		Object.getOwnPropertyNames( o ).forEach( prop => {

			if ( o.hasOwnProperty( prop ) &&
        o[prop] !== null &&
        ( typeof o[prop] === 'object' || typeof o[prop] === 'function' ) &&
        !Object.isFrozen( o[prop] ) ) {

				deepFreeze( o[prop] )

			}

		} )

		return o

	}

	deepFreeze( api )

	// Github.com/electron-userland/spectron#node-integration
	window.electronRequire = require

	window.crossover = api

	window.testing = true

}
