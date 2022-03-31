/* eslint unicorn/prefer-module: 0 */
// Via https://github.com/reZach/secure-electron-template
const {
	contextBridge,
	ipcRenderer,
} = require( 'electron' )
const unhandled = require( 'electron-unhandled' )
const { is, debugInfo, openNewGitHubIssue } = require( 'electron-util' )
const { debounce } = require( '../config/utils.js' )
const { play, preload } = require( './lib/sounds.js' )

console.log( 'Dev:', is.development )
// Console.log( 'contextBridge:', contextBridge.internalContextBridge, contextBridge.internalContextBridge.contextIsolationEnabled )

const api = {
	debounce,
	isLinux: is.linux,
	isMacOs: is.macos,
	play,
	preload,
	unhandled,
	debugInfo,
	openNewGitHubIssue,
	send( channel, ...args ) {

		// Whitelist channels
		const validChannels = new Set( [ 'center_window', 'close_window', 'focus_window', 'save_custom_image', 'open_chooser', 'open_settings', 'quit' ] )

		if ( validChannels.has( channel ) ) {

			ipcRenderer.send( channel, ...args )

		}

	},

	receive( channel, func ) {

		const validChannels = new Set( [ 'add_class', 'notify', 'lock_window', 'preload_sounds', 'play_sound', 'set_color', 'set_crosshair', 'set_opacity', 'set_size', 'set_sight', 'tilt', 'untilt', 'update_available' ] )

		if ( validChannels.has( channel ) ) {

			// Deliberately strip event as it includes `sender`
			ipcRenderer.on( channel, ( event, ...args ) => func( ...args ) )

		}

	},

	invoke( channel, arg ) {

		console.log( 'preload', arg )

		const validChannels = new Set( [ 'invoke-test', 'get_bounds', 'play_sound' ] )

		if ( validChannels.has( channel ) ) {

			ipcRenderer.invoke( channel, arg )

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
