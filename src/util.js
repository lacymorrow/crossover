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
function prettyFilename( str ) {

	// Remove path
	str = str.split('/').pop()

	// Remove extension
	str = str.split('.').shift()

	str = str
		.split( '-' )
		.map( w => w[0].toUpperCase() + w.substr( 1 ).toLowerCase() )
		.join( ' ' )

	return str

}

exports.prettyFilename = prettyFilename
exports.debounce = debounce
