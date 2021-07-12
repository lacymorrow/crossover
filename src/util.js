/* Utilities */

const debounce = ( func, delay ) => {

	let debounceTimer

	return function ( ...args ) {

		clearTimeout( debounceTimer )

		// Pass { abort: true } to cancel
		if ( args[0] && args[0].abort ) {

			return

		}

		const context = this
		debounceTimer = setTimeout( () => func.apply( context, args ), delay )

	}

}

const checkboxTrue = ( value, key ) => {

	return ( typeof value === 'object' && value.includes( key ) )

}

/* eslint-disable no-prototype-builtins */
/**
* Recursively Object.freeze() on objects and functions
* @see https://github.com/substack/deep-freeze
* @param o Object on which to lock the attributes
*/
function deepFreeze( o ) {

	Object.freeze( o )

	Object.getOwnPropertyNames( o ).forEach( prop => {

		if ( o.hasOwnProperty( prop ) &&
    o[prop] !== null &&
    ( typeof o[prop] === 'object' || typeof o[prop] === 'function' ) &&
    !Object.isFrozen( o[prop] ) ) {

			deepFreeze( o[prop] )

		}

	} )

	return o

}

/* eslint-enable */

exports.checkboxTrue = checkboxTrue
exports.debounce = debounce
exports.deepFreeze = deepFreeze
