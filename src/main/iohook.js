
const log = require( './log.js' )

const importIoHook = async () => {

	// Dynamically require iohook
	// We do this in case it gets flagged by anti-cheat

	if ( !iohook.hook ) {

		log.info( 'Loading IOHook...' )
		iohook.hook = await require( 'iohook' )

	}

	return iohook.hook

}

const unregisterIOHook = () => {

	if ( iohook.hook ) {

		iohook.hook.unregisterAllShortcuts()
		iohook.hook.removeAllListeners( 'mousedown' )
		iohook.hook.removeAllListeners( 'mouseup' )
		iohook.hook.removeAllListeners( 'mousemove' )

	}

}

const iohook = {
	hook: null,
	importIoHook,
	unregisterIOHook,
}

module.exports = iohook
