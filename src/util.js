/* Utilities */

const debounce = ( func, delay ) => {

	let debounceTimer

	return function ( ...args ) {

		const context = this
		clearTimeout( debounceTimer )
		debounceTimer = setTimeout( () => func.apply( context, args ), delay )

	}

}

exports.debounce = debounce
