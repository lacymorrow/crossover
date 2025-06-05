 

const { DEBOUNCE_DELAY } = require( './config' )

/* Utilities */
const debounce = ( func, delay = DEBOUNCE_DELAY ) => {

	let debounceTimer

	return function ( ...args ) {

		clearTimeout( debounceTimer )

		// Pass { abort: true } to cancel
		if ( args[0] && args[0].abort ) {

			return

		}

		debounceTimer = setTimeout( () => func.apply( this, args ), delay )

	}

}

// checkboxTrue( preferences.value( 'actions.followMouse' ), 'followMouse' )
const checkboxTrue = ( value, key ) => ( typeof value === 'object' && value.includes( key ) )

/**
 * Check for libappindicator1 support before creating tray icon
 */
const checkLinuxTraySupport = cb => {

	const cp = require( 'child_process' )

	// Check that we're on Ubuntu (or another debian system) and that we have
	// libappindicator1. If WebTorrent was installed from the deb file, we should
	// always have it. If it was installed from the zip file, we might not.
	cp.exec( 'dpkg --get-selections libappindicator1', ( error, stdout ) => {

		if ( error ) {

			return cb( false )

		}

		// Unfortunately there's no cleaner way, as far as I can tell, to check
		// whether a debian package is installed:
		cb( stdout.endsWith( '\tinstall\n' ) )

	} )

}

 
/**
 * Recursively Object.freeze() on objects and functions
 * @see https://github.com/substack/deep-freeze
 * @param o Object on which to lock the attributes
 */
const deepFreeze = o => {

	Object.freeze( o )

	for ( const prop of Object.getOwnPropertyNames( o ) ) {

		if ( o.hasOwnProperty( prop )
			&& o[prop] !== null
			&& ( typeof o[prop] === 'object' || typeof o[prop] === 'function' )
			&& !Object.isFrozen( o[prop] ) ) {

			deepFreeze( o[prop] )

		}

	}

	return o

}

const hexToRgbA = ( hex, alpha ) => {

	let c
	if ( /^#([A-Fa-f0-9]{3}){1,2}$/.test( hex ) ) {

		c = hex.substring( 1 ).split( '' )
		if ( c.length === 3 ) {

			c = [
				c[0], c[0], c[1], c[1], c[2], c[2],
			]

		}

		c = '0x' + c.join( '' )

		return `rgba(${[
			( c >> 16 ) & 255, ( c >> 8 ) & 255, c & 255,
		].join( ',' )}, ${alpha})`

	}

	// throw new Error( 'Bad Hex' )
	console.warn( 'Bad Hex' )

	return hex // return original

}

 

module.exports = {
	checkboxTrue,
	checkLinuxTraySupport,
	debounce,
	deepFreeze,
	hexToRgbA,
}
