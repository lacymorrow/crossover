const { debounce } = require( '../config/utils' )
const log = require( './log' )
const preferences = require( './electron-preferences' )

const crosshair = value => {

	if ( value ) {

		log.info( 'Save crosshair:', value )
		preferences.value( 'crosshair.crosshair', value )

	}

}

// Save position
const position = debounce( bounds => {

	if ( !bounds ) {

		return

	}

	const { x, y } = bounds

	if ( !x || !y ) {

		return

	}

	log.info( `Save position: ${x}, ${y}` )
	preferences.value( 'hidden.positionX', x )
	preferences.value( 'hidden.positionY', y )

}, 500 )

const save = { crosshair, position }

module.exports = save
