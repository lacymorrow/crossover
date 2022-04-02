const fs = require( 'fs' )
const path = require( 'path' )
const { debounce } = require( '../config/utils' )
const log = require( './log' )
const preferences = require( './electron-preferences' )
const windows = require( './windows' )
const { SUPPORTED_IMAGE_FILE_TYPES } = require( '../config/config' )

const crosshair = src => {

	if ( src ) {

		log.info( `Set crosshair: ${src}` )
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

const color = ( color, targetWindow = windows.win ) => {

	targetWindow.webContents.send( 'set_color', color )

}

const opacity = ( opacity, targetWindow = windows.win ) => {

	targetWindow.webContents.send( 'set_opacity', opacity )

}

const sight = ( sight, targetWindow = windows.win ) => {

	targetWindow.webContents.send( 'set_sight', sight )

}

const size = ( size, targetWindow = windows.win ) => {

	targetWindow.webContents.send( 'set_size', size )

}

// Set position
const position = ( posX, posY, targetWindow = windows.win ) => {

	if ( posX === null || posY === null || typeof posX === 'undefined' || typeof posY === 'undefined' ) {

		return

	}

	targetWindow.setBounds( { x: posX, y: posY } )

	if ( targetWindow === windows.win ) {

		log.info( 'Set XY:', posX, posY )
		preferences.value( 'hidden.positionX', posX )
		preferences.value( 'hidden.positionY', posY )

	}

}

const bounds = debounce( win => {

	const winBounds = win.getBounds()
	log.info( `Set winBounds: ${winBounds.x}, ${winBounds.y}` )
	preferences.value( 'hidden.positionX', winBounds.x )
	preferences.value( 'hidden.positionY', winBounds.y )

}, 1000 )

const set = { bounds, color, crosshair, custom, opacity, position, sight, size }

console.log( set )

module.exports = set
