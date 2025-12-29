const log = require( './log.js' )
const notification = require( './notification' )
const { checkboxTrue } = require( '../config/utils.js' )
const preferences = require( './preferences' ).init()
const set = require( './set.js' )
const windows = require( './windows.js' )
const accessibility = require( './accessibility.js' )

let uIOhook
let UiohookKey = {}
let iohookLoadError = null

try {

	( { uIOhook, UiohookKey } = require( 'uiohook-napi' ) )

} catch ( error ) {

	iohookLoadError = error
	log.error( 'Failed to load uiohook-napi native module', error )

}

const getIOHookHint = () => {

	if ( process.platform === 'linux' ) {

		return 'Install the libxkbcommon-x11-0 package (sudo apt install libxkbcommon-x11-0) and restart CrossOver.'

	}

	if ( process.platform === 'win32' ) {

		return 'Repair or reinstall CrossOver to restore the input hook.'

	}

	return 'Reinstall CrossOver or run npm rebuild uiohook-napi.'

}

let iohookNotificationShown = false

const ensureIOHookAvailable = action => {

	if ( uIOhook ) {

		return true

	}

	log.error( `Skipping "${action}" because the input hook failed to load.`, iohookLoadError )

	if ( !iohookNotificationShown ) {

		notification( {
			title: 'Input controls unavailable',
			body: `CrossOver could not load the system hook module required for ${action}. ${getIOHookHint()}`,
		} )
		iohookNotificationShown = true

	}

	return false

}

// Keep track of registered shortcuts to remove them later
const registeredShortcuts = []

const unregisterIOHook = () => {

	// Reset any changes to the crosshair
	const opacity = ( () => {

		const v = Number.parseInt( preferences.value( 'crosshair.opacity' ), 10 )

		return Number.isFinite( v ) ? v / 100 : 1 // default to fully opaque

	} )()
	const oldCrosshairSize = Number.parseInt( preferences.value( 'crosshair.size' ), 10 )

	// If smaller/tilted; move to actual size
	set.rendererProperties( {
		'--crosshair-opacity': opacity.toString(),
		'--crosshair-width': `${oldCrosshairSize}px`,
		'--crosshair-height': `${oldCrosshairSize}px`,
		'--tilt-angle': '0deg',
	}, windows.win )

	// Reset any changes to the prefs
	preferences.value( 'hidden.tilted', false )
	preferences.value( 'hidden.ADShidden', false )
	preferences.value( 'hidden.ADSed', false )

	// Stop and remove all listeners
	if ( uIOhook ) {

		uIOhook.stop()
		registeredShortcuts.forEach( ( { event, listener } ) => {

			uIOhook.off( event, listener )

		} )

	}

	registeredShortcuts.length = 0 // Clear the array

}

const registerShortcut = ( keys, keyDownCallback, keyUpCallback ) => {

	if ( !ensureIOHookAvailable( 'registering shortcuts' ) ) {

		return

	}

	const pressed = new Set()
	const keyCodes = keys.map( key => UiohookKey[key] || key )

	const keyDownListener = e => {

		if ( keyCodes.includes( e.keycode ) ) {

			pressed.add( e.keycode )
			if ( pressed.size === keyCodes.length ) {

				keyDownCallback( e )

			}

		}

	}

	uIOhook.on( 'keydown', keyDownListener )
	registeredShortcuts.push( { event: 'keydown', listener: keyDownListener } )

	if ( keyUpCallback ) {

		const keyUpListener = e => {

			if ( keyCodes.includes( e.keycode ) ) {

				if ( pressed.size === keyCodes.length ) {

					keyUpCallback( e )

				}

				pressed.delete( e.keycode )

			}

		}

		uIOhook.on( 'keyup', keyUpListener )
		registeredShortcuts.push( { event: 'keyup', listener: keyUpListener } )

	}

}

const followMouse = async () => {

	if ( !ensureIOHookAvailable( 'Follow Mouse' ) ) {

		return

	}

	// Check accessibility permissions before starting
	if ( !accessibility.checkAccessibilityPermissions() ) {

		log.warn( 'Mouse follow requires accessibility permissions' )

		// Show user-friendly notification instead of crashing
		accessibility.showAccessibilityDisabledNotification()

		// Try to request permissions
		const granted = await accessibility.requestAccessibilityPermissions()
		if ( !granted ) {

			log.info( 'Mouse follow disabled - accessibility permissions not granted' )

			return

		}

	}

	const { width, height } = windows.win.getBounds()
	log.info( 'Setting: Mouse Follow' )

	const listener = event => {

		windows.win.setBounds( {
			x: event.x - Math.round( width / 2 ),
			y: event.y - Math.round( height / 2 ),
		} )

	}

	try {

		uIOhook.on( 'mousemove', listener )
		registeredShortcuts.push( { event: 'mousemove', listener } )
		uIOhook.start()

	} catch ( error ) {

		log.error( 'Failed to start mouse follow:', error )

		// If we get the accessibility error, handle it gracefully
		if ( error.message && error.message.includes( 'Accessibility API is disabled' ) ) {

			accessibility.showAccessibilityDisabledNotification()

		}

	}

}

const hideOnMouse = async () => {

	if ( !ensureIOHookAvailable( 'Hide on Mouse' ) ) {

		return

	}

	// Check accessibility permissions before starting
	if ( !accessibility.checkAccessibilityPermissions() ) {

		log.warn( 'Hide on mouse requires accessibility permissions' )
		accessibility.showAccessibilityDisabledNotification()

		return

	}

	const opacity = Number.parseInt( preferences.value( 'crosshair.opacity' ), 10 ) / 100
	const mouseButton = Number.parseInt( preferences.value( 'actions.hideOnMouse' ), 10 )
	const hideOnMouseToggle = checkboxTrue( preferences.value( 'actions.hideOnMouseToggle' ), 'hideOnMouseToggle' )

	log.info( 'Setting: Hide on Mouse ' + ( hideOnMouseToggle ? 'toggle' : 'hold' ) )

	if ( hideOnMouseToggle ) {

		const listener = event => {

			const hidden = preferences.value( 'hidden.ADShidden' )
			if ( event.button === mouseButton ) {

				if ( hidden ) {

					set.rendererProperties( { '--crosshair-opacity': opacity.toString() }, windows.win )

				} else {

					set.rendererProperties( { '--crosshair-opacity': '0' }, windows.win )

				}

				preferences.value( 'hidden.ADShidden', !hidden )

			}

		}

		uIOhook.on( 'mousedown', listener )
		registeredShortcuts.push( { event: 'mousedown', listener } )

	} else {

		const mouseDownListener = event => {

			if ( event.button === mouseButton ) {

				set.rendererProperties( { '--crosshair-opacity': '0' }, windows.win )

			}

		}

		uIOhook.on( 'mousedown', mouseDownListener )
		registeredShortcuts.push( { event: 'mousedown', listener: mouseDownListener } )

		const mouseUpListener = event => {

			if ( event.button === mouseButton ) {

				set.rendererProperties( { '--crosshair-opacity': opacity.toString() }, windows.win )

			}

		}

		uIOhook.on( 'mouseup', mouseUpListener )
		registeredShortcuts.push( { event: 'mouseup', listener: mouseUpListener } )

	}

	uIOhook.start()

}

const hideOnKey = async () => {

	if ( !ensureIOHookAvailable( 'Hide on Key' ) ) {

		return

	}

	// Check accessibility permissions before starting
	if ( !accessibility.checkAccessibilityPermissions() ) {

		log.warn( 'Hide on key requires accessibility permissions' )
		accessibility.showAccessibilityDisabledNotification()

		return

	}

	const isEnabled = preferences.value( 'actions.hideOnKey' )
	log.info( 'Setting: Keyboard Hold/Toggle' )

	if ( UiohookKey[isEnabled] ) {

		registerShortcut(
			[ isEnabled ],
			() => windows.hideWindow(),
			() => windows.showWindow(),
		)
		uIOhook.start()

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

	if ( !ensureIOHookAvailable( 'Tilt controls' ) ) {

		return

	}

	// Check accessibility permissions before starting
	if ( !accessibility.checkAccessibilityPermissions() ) {

		log.warn( 'Tilt controls require accessibility permissions' )
		accessibility.showAccessibilityDisabledNotification()

		return

	}

	const tiltAngle = Number.parseInt( preferences.value( 'actions.tiltAngle' ), 10 )
	const tiltToggle = checkboxTrue( preferences.value( 'actions.tiltToggle' ), 'tiltToggle' )
	const tiltLeft = preferences.value( 'actions.tiltLeft' )
	const tiltRight = preferences.value( 'actions.tiltRight' )

	log.info( 'Setting: Tilt' )

	if ( UiohookKey[tiltLeft] ) {

		if ( tiltToggle ) {

			registerShortcut( [ tiltLeft ], () => {

				const tilted = preferences.value( 'hidden.tilted' )
				if ( tilted ) {

					tiltCrosshair( 0 )

				} else {

					tiltCrosshair( tiltAngle * -1 )

				}

				preferences.value( 'hidden.tilted', !tilted )

			} )

		} else {

			registerShortcut(
				[ tiltLeft ],
				() => tiltCrosshair( tiltAngle * -1 ),
				() => tiltCrosshair( 0 ),
			)

		}

	}

	if ( UiohookKey[tiltRight] ) {

		if ( tiltToggle ) {

			registerShortcut( [ tiltRight ], () => {

				const tilted = preferences.value( 'hidden.tilted' )
				if ( tilted ) {

					tiltCrosshair( 0 )

				} else {

					tiltCrosshair( tiltAngle )

				}

				preferences.value( 'hidden.tilted', !tilted )

			} )

		} else {

			registerShortcut(
				[ tiltRight ],
				() => tiltCrosshair( tiltAngle ),
				() => tiltCrosshair( 0 ),
			)

		}

	}

	uIOhook.start()

}

const resizeOnADS = async () => {

	if ( !ensureIOHookAvailable( 'ADS resize' ) ) {

		return

	}

	// Check accessibility permissions before starting
	if ( !accessibility.checkAccessibilityPermissions() ) {

		log.warn( 'ADS resize requires accessibility permissions' )
		accessibility.showAccessibilityDisabledNotification()

		return

	}

	const ads = preferences.value( 'actions.resizeOnADS' )
	const adsSize = Number.parseInt( preferences.value( 'actions.resizeOnADSSize' ), 10 )
	const adsToggle = checkboxTrue( preferences.value( 'actions.resizeOnADSToggle' ), 'resizeOnADSToggle' )
	const opacity = Number.parseInt( preferences.value( 'crosshair.opacity' ), 10 ) / 100
	const oldCrosshairSize = Number.parseInt( preferences.value( 'crosshair.size' ), 10 )
	const newCrosshairSize = adsSize

	log.info( 'Setting: ADS Resize' )

	if ( adsToggle ) {

		const listener = event => {

			if ( event.button === Number.parseInt( ads, 10 ) ) {

				const adsed = preferences.value( 'hidden.ADSed' )
				if ( adsed ) {

					set.rendererProperties( {
						'--crosshair-width': `${oldCrosshairSize}px`,
						'--crosshair-height': `${oldCrosshairSize}px`,
					}, windows.win )

				} else {

					set.rendererProperties( {
						'--crosshair-width': `${newCrosshairSize}px`,
						'--crosshair-height': `${newCrosshairSize}px`,
					}, windows.win )

				}

				preferences.value( 'hidden.ADSed', !adsed )

			}

		}

		uIOhook.on( 'mousedown', listener )
		registeredShortcuts.push( { event: 'mousedown', listener } )

	} else {

		const mouseDownListener = event => {

			if ( event.button === Number.parseInt( ads, 10 ) ) {

				set.rendererProperties( {
					'--crosshair-width': `${newCrosshairSize}px`,
					'--crosshair-height': `${newCrosshairSize}px`,
				}, windows.win )

			}

		}

		uIOhook.on( 'mousedown', mouseDownListener )
		registeredShortcuts.push( { event: 'mousedown', listener: mouseDownListener } )

		const mouseUpListener = event => {

			if ( event.button === Number.parseInt( ads, 10 ) ) {

				set.rendererProperties( {
					'--crosshair-width': `${oldCrosshairSize}px`,
					'--crosshair-height': `${oldCrosshairSize}px`,
					'--crosshair-opacity': opacity.toString(),
				}, windows.win )

			}

		}

		uIOhook.on( 'mouseup', mouseUpListener )
		registeredShortcuts.push( { event: 'mouseup', listener: mouseUpListener } )

	}

	uIOhook.start()

}

const iohook = {
	unregisterIOHook,
	followMouse,
	hideOnMouse,
	hideOnKey,
	tilt,
	resizeOnADS,
}

module.exports = iohook
