const config = require( '../config/config' )

const { debounce } = require( '../config/utils' )
const log = require( './log' )
const preferences = require( './preferences' ).init()

const crosshair = value => {

	if ( value ) {

		log.info( 'Save crosshair:', value )
		preferences.value( 'crosshair.crosshair', value )

	}

}

// Save position
const position = bounds => {

	if ( !bounds ) {

		return

	}

	const { x, y } = bounds

	if ( !x || !y ) {

		return

	}

	log.info( `Save position: ${x}, ${y}` )
	preferences.value( 'crosshair.positionX', x )
	preferences.value( 'crosshair.positionY', y )

}

const positionDebounced = debounce( bounds => position( bounds ), config.DEFAULT_DEBOUNCE || 200 )

const save = { crosshair, position: positionDebounced }

module.exports = save
