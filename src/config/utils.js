/* Utilities */
const debounce = ( func, delay ) => {

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

// checkboxTrue( preferences.value( 'mouse.followMouse' ), 'followMouse' )
const checkboxTrue = ( value, key ) => ( typeof value === 'object' && value.includes( key ) )

/* eslint-disable no-prototype-builtins */
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

/* eslint-enable */

module.exports = {
	checkboxTrue,
	checkLinuxTraySupport,
	debounce,
	deepFreeze,
}
