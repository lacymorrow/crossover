const keycode = require( '../config/keycode.js' )
const { checkboxTrue } = require( '../config/utils.js' )
const preferences = require( './preferences' ).init()
const log = require( './log.js' )
const set = require( './set.js' )
const windows = require( './windows.js' )

const importIoHook = async () => {

	// Dynamically require iohook
	// We do this in case it gets flagged by anti-cheat

	if ( !iohook.hook ) {

		log.info( 'Loading IOHook…' )
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

const followMouse = async () => {

	const { width, height } = windows.win.getBounds()

	// Prevent saving bounds
	// windows.win.removeAllListeners( 'move' )

	log.info( 'Setting: Mouse Follow' )
	await iohook.importIoHook()
	iohook.hook.removeAllListeners( 'mousemove' )

	// Register
	iohook.hook.on( 'mousemove', event => {

		// Can't set fractional values
		windows.win.setBounds( {
			x: event.x - Math.round( width / 2 ),
			y: event.y - Math.round( height / 2 ),
		} )

	} )

	// Start hook
	iohook.hook.start()

}

const hideOnMouse = async () => {

	log.info( 'Setting: Mouse Hide' )
	await iohook.importIoHook()

	const mouseButton = Number.parseInt( preferences.value( 'actions.hideOnMouse' ), 10 )

	// Register
	iohook.hook.on( 'mousedown', event => {

		if ( event.button === mouseButton ) {

			windows.hideWindow()

		}

	} )

	iohook.hook.on( 'mouseup', event => {

		if ( event.button === mouseButton ) {

			windows.showWindow()

		}

	} )

	// Register and start hook
	iohook.hook.start()

}

const hideOnKey = async () => {

	log.info( 'Setting: Keyboard Hide' )
	await iohook.importIoHook()

	const hideOnKey = preferences.value( 'actions.hideOnKey' )

	if ( Object.prototype.hasOwnProperty.call( keycode, hideOnKey ) ) {

		const key = keycode[hideOnKey]

		// Register
		iohook.hook.registerShortcut(
			[ key ],
			_ => {

				windows.hideWindow()

			},
			_ => {

				windows.showWindow()

			},
		)

		// Register and start hook
		iohook.hook.start()

	}

}

const tiltCrosshair = angle => {

	if ( angle && windows.win ) {

		set.rendererProperties( { '--tilt-angle': `${angle}deg` }, windows.win )

	} else {

		set.rendererProperties( { '--tilt-angle': '0deg' }, windows.win )

	}

}

const tilt = async () => {

	let leftKey
	let rightKey
	const tiltAngle = Number.parseInt( preferences.value( 'actions.tiltAngle' ), 10 )
	const tiltToggle = checkboxTrue( preferences.value( 'actions.tiltToggle' ), 'tiltToggle' )
	const tiltLeft = preferences.value( 'actions.tiltLeft' )
	const tiltRight = preferences.value( 'actions.tiltRight' )

	log.info( 'Setting: Tilt' )
	await iohook.importIoHook()

	if ( Object.prototype.hasOwnProperty.call( keycode, tiltLeft ) ) {

		leftKey = Number.parseInt( keycode[tiltLeft], 10 )

		if ( tiltToggle ) {

			iohook.hook.registerShortcut(
				[ leftKey ],
				_ => {

					const tilted = preferences.value( 'hidden.tilted' )
					if ( tilted ) {

						tiltCrosshair( 0 )

					} else {

						tiltCrosshair( tiltAngle * -1 )

					}

					preferences.value( 'hidden.tilted', !tilted )

				},
			)

		} else {

			iohook.hook.registerShortcut(
				[ leftKey ],
				_ => {

					tiltCrosshair( tiltAngle * -1 )

				},
				_ => {

					tiltCrosshair( 0 )

				},
			)

		}

	}

	if ( Object.prototype.hasOwnProperty.call( keycode, tiltRight ) ) {

		rightKey = Number.parseInt( keycode[tiltRight], 10 )

		if ( tiltToggle ) {

			iohook.hook.registerShortcut(
				[ rightKey ],
				_ => {

					const tilted = preferences.value( 'hidden.tilted' )
					if ( tilted ) {

						tiltCrosshair( 0 )

					} else {

						tiltCrosshair( tiltAngle )

					}

					preferences.value( 'hidden.tilted', !tilted )

				},
			)

		} else {

			iohook.hook.registerShortcut(
				[ rightKey ],
				_ => {

					tiltCrosshair( tiltAngle )

				},
				_ => {

					tiltCrosshair( 0 )

				},
			)

		}

	}

	if ( leftKey || rightKey ) {

		// Register and start hook
		iohook.hook.start()

	}

}

const iohook = {
	hook: null,
	importIoHook,
	unregisterIOHook,
	followMouse,
	hideOnKey,
	hideOnMouse,
	tilt,
}

module.exports = iohook
