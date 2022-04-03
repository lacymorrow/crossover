const fs = require( 'fs' )
const path = require( 'path' )
const log = require( './log' )
const save = require( './save' )
const windows = require( './windows' )
const { SUPPORTED_IMAGE_FILE_TYPES } = require( '../config/config' )
const { is } = require( 'electron-util' )
const { app } = require( 'electron' )
const preferences = require( './electron-preferences' )
const { checkboxTrue } = require( '../config/utils' )

const crosshair = src => {

	if ( src ) {

		windows.hideChooserWindow()
		windows.win.webContents.send( 'set_crosshair', src ) // Pass to renderer
		for ( const currentWindow of windows.shadowWindows ) {

			currentWindow.webContents.send( 'set_crosshair', src )

		}

		save.crosshair( src )

	} else {

		log.info( 'Not setting null crosshair.' )

	}

}

const custom = src => {

	// Is it a file and does it have a supported extension?
	if ( fs.lstatSync( src ).isFile() && SUPPORTED_IMAGE_FILE_TYPES.includes( path.extname( src ) ) ) {

		crosshair( src )

	}

}

// Crosshair size
const size = ( size, targetWindow = windows.win ) => {

	targetWindow.webContents.send( 'set_size', size )

}

// Crosshair opacity
const opacity = ( opacity, targetWindow = windows.win ) => {

	targetWindow.webContents.send( 'set_opacity', opacity )

}

// Reticle/sight
const sight = ( sight, targetWindow = windows.win ) => {

	targetWindow.webContents.send( 'set_sight', sight )

}

// Reticle color
const color = ( color, targetWindow = windows.win ) => {

	targetWindow.webContents.send( 'set_color', color )

}

// Set position
const position = ( posX, posY, targetWindow = windows.win ) => {

	if ( posX === null || posY === null || typeof posX === 'undefined' || typeof posY === 'undefined' ) {

		return

	}

	const bounds = { x: posX, y: posY }

	targetWindow.setBounds( bounds )

	if ( targetWindow === windows.win ) {

		save.position( bounds )

	}

}

const startOnBoot = () => {

	// Start app on boot
	if ( !is.development && checkboxTrue( preferences.value( 'app.boot' ), 'boot' ) ) {

		app.setLoginItemSettings( {
			openAtLogin: true,
		} )

	} else {

		app.setLoginItemSettings( {
			openAtLogin: false,
		} )

	}

}

const set = { color, crosshair, custom, opacity, position, sight, size, startOnBoot }

module.exports = set
