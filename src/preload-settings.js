// Via https://github.com/reZach/secure-electron-template

const path = require( 'path' )

const {
	ipcRenderer
} = require( 'electron' )

window.crossover = {
	path,
	send: ( channel, data ) => {

		// Whitelist channels
		const validChannels = new Set( [ 'log', 'save_crosshair', 'save_custom_image', 'close_chooser', 'get_crosshairs' ] )

		if ( validChannels.has( channel ) ) {

			ipcRenderer.send( channel, data )

		}

	},

	receive: ( channel, func ) => {

		const validChannels = new Set( [ 'load_crosshairs' ] )

		if ( validChannels.has( channel ) ) {

			// Deliberately strip event as it includes `sender`
			ipcRenderer.on( channel, ( event, ...args ) => func( ...args ) )

		}

	}

}
