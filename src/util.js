/* Utilities */

const debounce = ( func, delay ) => {

	let debounceTimer

	return function ( ...args ) {

		const context = this
		clearTimeout( debounceTimer )
		debounceTimer = setTimeout( () => func.apply( context, args ), delay )

	}

}

// Title Case and spacing
function prettyFilename( string ) {

	// Remove path
	string = string.split( '/' ).pop()

	// Remove extension
	string = string.split( '.' ).shift()

	string = string
		.split( '-' )
		.map( w => w[0].toUpperCase() + w.slice( 1 ).toLowerCase() )
		.join( ' ' )

	return string

}

exports.prettyFilename = prettyFilename
exports.debounce = debounce
