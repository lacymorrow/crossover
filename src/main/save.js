const fs = require( 'fs' )
const path = require( 'path' )
const { debounce } = require( '../config/utils' )
const log = require( './log' )
const preferences = require( './electron-preferences' )
const windows = require( './windows' )
const { SUPPORTED_IMAGE_FILE_TYPES } = require( '../config/config' )

const crosshair = value => {

	if ( value ) {

		log.info( 'Save crosshair:', value )
		preferences.value( 'crosshair.crosshair', value )

	}

}

// Save position
const position = boundsObj => {

	if ( !boundsObj ) {

		return

	}

	const { x, y } = boundsObj

	if ( !x || !y ) {

		return

	}

	log.info( 'Save XY:', x, y )
	preferences.value( 'hidden.positionX', x )
	preferences.value( 'hidden.positionY', y )

}

const save = { bounds, color, crosshair, custom, opacity, position, sight, size }

console.log( save )

module.exports = save
