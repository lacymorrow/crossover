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

		log.info( 'Loading IOHook...' )
		try {

			iohook.hook = await require( 'iohook' )

		} catch ( error ) {

			console.warn( 'IOHook failed to load, you may be using an unsupported architecture (Apple M)' )
			console.warn( error )

			iohook.hook = null

		}

	}

	return iohook.hook

}

const unregisterIOHook = () => {

	if ( iohook.hook ) {

		// reset any changes to the crosshair
		const opacity = Number.parseInt( preferences.value( 'crosshair.opacity' ), 10 ) / 100
		const oldCrosshairSize = Number.parseInt( preferences.value( 'crosshair.size' ), 10 )

		// if smaller/tilted; move to actual size
		set.rendererProperties( { '--crosshair-opacity': opacity.toString(),
			'--crosshair-width': `${oldCrosshairSize}px`,
			'--crosshair-height': `${oldCrosshairSize}px`,
			'--tilt-angle': '0deg',
		}, windows.win )

		// reset any changes to the prefs
		preferences.value( 'hidden.tilted', false )
		preferences.value( 'hidden.ADShidden', false )
		preferences.value( 'hidden.ADSed', false )

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

	if ( iohook.hook ) {

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

}

const hideOnMouse = async () => {

	const opacity = Number.parseInt( preferences.value( 'crosshair.opacity' ), 10 ) / 100
	const mouseButton = Number.parseInt( preferences.value( 'actions.hideOnMouse' ), 10 )
	const hideOnMouseToggle = checkboxTrue( preferences.value( 'actions.hideOnMouseToggle' ), 'hideOnMouseToggle' )

	log.info( 'Setting: Hide on Mouse ' + ( hideOnMouseToggle ? ' toggle' : 'hold' ) )
	await iohook.importIoHook()

	log.info( opacity )

	if ( hideOnMouseToggle ) {

		iohook.hook.on( 'mousedown', event => {

			const hidden = preferences.value( 'hidden.ADShidden' )

			if ( event.button === mouseButton ) {

				if ( hidden ) {

					set.rendererProperties( { '--crosshair-opacity': opacity.toString() }, windows.win )

				} else {

					set.rendererProperties( { '--crosshair-opacity': '0' }, windows.win )

				}

				preferences.value( 'hidden.ADShidden', !hidden )

			}

		} )

	} else if ( iohook.hook ) {

		// Register
		iohook.hook.on( 'mousedown', event => {

			if ( event.button === mouseButton ) {

				set.rendererProperties( { '--crosshair-opacity': '0' }, windows.win )

			}

		} )

		iohook.hook.on( 'mouseup', event => {

			if ( event.button === mouseButton ) {

				set.rendererProperties( { '--crosshair-opacity': opacity.toString() }, windows.win )

			}

		} )

	}

	if ( iohook.hook ) {

		// Register and start hook
		iohook.hook.start()

	}

}

const hideOnKey = async () => {

	const isEnabled = preferences.value( 'actions.hideOnKey' )

	log.info( 'Setting: Keyboard Hold/Toggle' )
	await iohook.importIoHook()

	log.info( `Key: ${isEnabled}` )

	if ( Object.prototype.hasOwnProperty.call( keycode, isEnabled ) ) {

		const key = keycode[isEnabled]

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

const resizeOnADS = async () => {

	const ADSSize = Number.parseInt( preferences.value( 'actions.ADSSize' ), 10 )
	const resizeOnADSOption = preferences.value( 'actions.resizeOnADS' )
	const oldCrosshairSize = Number.parseInt( preferences.value( 'crosshair.size' ), 10 )

	log.info( 'Setting: Resize on ADS ' + ( resizeOnADSOption === 'toggle' ? ' toggle' : 'hold' ) )
	await iohook.importIoHook()

	if ( resizeOnADSOption === 'toggle' ) {

		iohook.hook.on( 'mousedown', event => {

			if ( event.button === 2 ) {

				const ADSed = preferences.value( 'hidden.ADSed' )

				if ( ADSed ) {

					set.rendererProperties( {
						'--crosshair-width': `${ADSSize}px`,
						'--crosshair-height': `${ADSSize}px`,
					}, windows.win )

				} else {

					set.rendererProperties( {
						'--crosshair-width': `${oldCrosshairSize}px`,
						'--crosshair-height': `${oldCrosshairSize}px`,
					}, windows.win )

				}

				preferences.value( 'hidden.ADSed', !ADSed )

			}

		} )

	} else if ( resizeOnADSOption === 'hold' ) {

		iohook.hook.on( 'mousedown', event => {

			if ( event.button === 2 ) {

				set.rendererProperties( {
					'--crosshair-width': `${ADSSize}px`,
					'--crosshair-height': `${ADSSize}px`,
				}, windows.win )

			}

		} )

		iohook.hook.on( 'mouseup', event => {

			if ( event.button === 2 ) {

				set.rendererProperties( {
					'--crosshair-width': `${oldCrosshairSize}px`,
					'--crosshair-height': `${oldCrosshairSize}px`,
				}, windows.win )

			}

		} )

	}

	if ( resizeOnADS ) {

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
	resizeOnADS,
}

module.exports = iohook
