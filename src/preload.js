// Via https://github.com/reZach/secure-electron-template
const {
	contextBridge,
	ipcRenderer
} = require( 'electron' )
const { is } = require( 'electron-util' )
const { debounce } = require( './util' )

contextBridge.exposeInMainWorld( 'crossover', {
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
} )
