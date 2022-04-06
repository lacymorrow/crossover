// Via https://github.com/reZach/secure-electron-template
const {
	contextBridge,
	ipcRenderer,
} = require( 'electron' )
const unhandled = require( 'electron-unhandled' )
const { debounce } = require( '../config/utils.js' )
const { play, preload } = require( './lib/sounds.js' )

console.log( 'Dev:', process?.env?.development )
// Console.log( 'contextBridge:', contextBridge.internalContextBridge, contextBridge.internalContextBridge.contextIsolationEnabled )

const api = {
	debounce,
	isMacOs: navigator.userAgent.indexOf( 'Mac' ) !== -1,
	isWindows: navigator.userAgent.indexOf( 'Win' ) !== -1,
	play,
	preload,
	unhandled,
	send( channel, ...args ) {

		// Whitelist channels
		const validChannels = new Set( [ 'center_window', 'close_window', 'focus_window', 'save_custom_image', 'open_chooser', 'open_settings', 'quit' ] )

		if ( validChannels.has( channel ) ) {

			ipcRenderer.send( channel, ...args )

		} else {

			console.warn( `Renderer refused to send IPC message on ${channel}` )

		}

	},

	receive( channel, func ) {

		const validChannels = new Set( [ 'add_class', 'notify', 'lock_window', 'preload_sounds', 'play_sound', 'set_crosshair', 'set_info_icon', 'set_properties', 'set_reticle' ] )

		if ( validChannels.has( channel ) ) {

			// Deliberately strip event as it includes `sender`
			ipcRenderer.on( channel, ( event, ...args ) => func( ...args ) )

		} else {

			console.warn( `Renderer refused to receive IPC message on ${channel}` )

		}

	},

	invoke( channel, arg ) {

		console.log( 'preload', arg )

		const validChannels = new Set( [ 'invoke_test', 'get_bounds', 'play_sound' ] )

		if ( validChannels.has( channel ) ) {

			ipcRenderer.invoke( channel, arg )

		} else {

			console.warn( `Renderer refused to invoke IPC message on ${channel}` )

		}

	},

}

// Spectron issue: https://github.com/electron-userland/spectron/issues/693
// if ( contextBridge.internalContextBridge && contextBridge.internalContextBridge.contextIsolationEnabled ) {

// 	/**
//      * The "Main World" is the JavaScript context that your main renderer code runs in.
//      * By default, the page you load in your renderer executes code in this world.
//      *
//      * @see https://www.electronjs.org/docs/api/context-bridge
//      */
// 	contextBridge.exposeInMainWorld( 'crossover', api )

// } else {

// 	// DeepFreeze from https://github.com/electron-userland/spectron/issues/693#issuecomment-748482545
// 	window.crossover = deepFreeze( api )
// 	window.testing = true
// 	// Github.com/electron-userland/spectron#node-integration
// 	// window.electronRequire = require

// }

contextBridge.exposeInMainWorld( 'crossover', api )
