const { uIOhook, UiohookKey } = require( 'uiohook-napi' );
const { checkboxTrue } = require( '../config/utils.js' );
const preferences = require( './preferences' ).init();
const log = require( './log.js' );
const set = require( './set.js' );
const windows = require( './windows.js' );

// Keep track of registered shortcuts to remove them later
const registeredShortcuts = [];

const unregisterIOHook = () => {
	// Reset any changes to the crosshair
	const opacity = Number.parseInt( preferences.value( 'crosshair.opacity' ), 10 ) / 100;
	const oldCrosshairSize = Number.parseInt( preferences.value( 'crosshair.size' ), 10 );

	// If smaller/tilted; move to actual size
	set.rendererProperties( {
		'--crosshair-opacity': opacity.toString(),
		'--crosshair-width': `${oldCrosshairSize}px`,
		'--crosshair-height': `${oldCrosshairSize}px`,
		'--tilt-angle': '0deg',
	}, windows.win );

	// Reset any changes to the prefs
	preferences.value( 'hidden.tilted', false );
	preferences.value( 'hidden.ADShidden', false );
	preferences.value( 'hidden.ADSed', false );

	// Stop and remove all listeners
	uIOhook.stop();
	registeredShortcuts.forEach( ( { event, listener } ) => {
		uIOhook.off( event, listener );
	} );
	registeredShortcuts.length = 0; // Clear the array
};

const registerShortcut = ( keys, keyDownCallback, keyUpCallback ) => {
	const pressed = new Set();
	const keyCodes = keys.map( key => UiohookKey[key] || key );

	const keyDownListener = e => {
		if ( keyCodes.includes( e.keycode ) ) {
			pressed.add( e.keycode );
			if ( pressed.size === keyCodes.length ) {
				keyDownCallback( e );
			}
		}
	};
	uIOhook.on( 'keydown', keyDownListener );
	registeredShortcuts.push( { event: 'keydown', listener: keyDownListener } );

	if ( keyUpCallback ) {
		const keyUpListener = e => {
			if ( keyCodes.includes( e.keycode ) ) {
				if ( pressed.size === keyCodes.length ) {
					keyUpCallback( e );
				}
				pressed.delete( e.keycode );
			}
		};
		uIOhook.on( 'keyup', keyUpListener );
		registeredShortcuts.push( { event: 'keyup', listener: keyUpListener } );
	}
};


const followMouse = () => {
	const { width, height } = windows.win.getBounds();
	log.info( 'Setting: Mouse Follow' );

	const listener = event => {
		windows.win.setBounds( {
			x: event.x - Math.round( width / 2 ),
			y: event.y - Math.round( height / 2 ),
		} );
	};

	uIOhook.on( 'mousemove', listener );
	registeredShortcuts.push( { event: 'mousemove', listener } );
	uIOhook.start();
};

const hideOnMouse = () => {
	const opacity = Number.parseInt( preferences.value( 'crosshair.opacity' ), 10 ) / 100;
	const mouseButton = Number.parseInt( preferences.value( 'actions.hideOnMouse' ), 10 );
	const hideOnMouseToggle = checkboxTrue( preferences.value( 'actions.hideOnMouseToggle' ), 'hideOnMouseToggle' );

	log.info( 'Setting: Hide on Mouse ' + ( hideOnMouseToggle ? 'toggle' : 'hold' ) );

	if ( hideOnMouseToggle ) {
		const listener = event => {
			const hidden = preferences.value( 'hidden.ADShidden' );
			if ( event.button === mouseButton ) {
				if ( hidden ) {
					set.rendererProperties( { '--crosshair-opacity': opacity.toString() }, windows.win );
				} else {
					set.rendererProperties( { '--crosshair-opacity': '0' }, windows.win );
				}
				preferences.value( 'hidden.ADShidden', !hidden );
			}
		};
		uIOhook.on( 'mousedown', listener );
		registeredShortcuts.push( { event: 'mousedown', listener } );
	} else {
		const mouseDownListener = event => {
			if ( event.button === mouseButton ) {
				set.rendererProperties( { '--crosshair-opacity': '0' }, windows.win );
			}
		};
		uIOhook.on( 'mousedown', mouseDownListener );
		registeredShortcuts.push( { event: 'mousedown', listener: mouseDownListener } );

		const mouseUpListener = event => {
			if ( event.button === mouseButton ) {
				set.rendererProperties( { '--crosshair-opacity': opacity.toString() }, windows.win );
			}
		};
		uIOhook.on( 'mouseup', mouseUpListener );
		registeredShortcuts.push( { event: 'mouseup', listener: mouseUpListener } );
	}
	uIOhook.start();
};

const hideOnKey = () => {
	const isEnabled = preferences.value( 'actions.hideOnKey' );
	log.info( 'Setting: Keyboard Hold/Toggle' );

	if ( UiohookKey[isEnabled] ) {
		registerShortcut(
			[ isEnabled ],
			() => windows.hideWindow(),
			() => windows.showWindow()
		);
		uIOhook.start();
	}
};

const tiltCrosshair = angle => {
	if ( angle && windows.win ) {
		set.rendererProperties( { '--tilt-angle': `${angle}deg` }, windows.win );
	} else {
		set.rendererProperties( { '--tilt-angle': '0deg' }, windows.win );
	}
};

const tilt = () => {
	const tiltAngle = Number.parseInt( preferences.value( 'actions.tiltAngle' ), 10 );
	const tiltToggle = checkboxTrue( preferences.value( 'actions.tiltToggle' ), 'tiltToggle' );
	const tiltLeft = preferences.value( 'actions.tiltLeft' );
	const tiltRight = preferences.value( 'actions.tiltRight' );

	log.info( 'Setting: Tilt' );

	if ( UiohookKey[tiltLeft] ) {
		if ( tiltToggle ) {
			registerShortcut( [ tiltLeft ], () => {
				const tilted = preferences.value( 'hidden.tilted' );
				if ( tilted ) {
					tiltCrosshair( 0 );
				} else {
					tiltCrosshair( tiltAngle * -1 );
				}
				preferences.value( 'hidden.tilted', !tilted );
			} );
		} else {
			registerShortcut(
				[ tiltLeft ],
				() => tiltCrosshair( tiltAngle * -1 ),
				() => tiltCrosshair( 0 )
			);
		}
	}

	if ( UiohookKey[tiltRight] ) {
		if ( tiltToggle ) {
			registerShortcut( [ tiltRight ], () => {
				const tilted = preferences.value( 'hidden.tilted' );
				if ( tilted ) {
					tiltCrosshair( 0 );
				} else {
					tiltCrosshair( tiltAngle );
				}
				preferences.value( 'hidden.tilted', !tilted );
			} );
		} else {
			registerShortcut(
				[ tiltRight ],
				() => tiltCrosshair( tiltAngle ),
				() => tiltCrosshair( 0 )
			);
		}
	}
	uIOhook.start();
};


const resizeOnADS = () => {
	const ads = preferences.value( 'actions.resizeOnADS' );
	const adsSize = Number.parseInt( preferences.value( 'actions.resizeOnADSSize' ), 10 );
	const adsToggle = checkboxTrue( preferences.value( 'actions.resizeOnADSToggle' ), 'resizeOnADSToggle' );
	const opacity = Number.parseInt( preferences.value( 'crosshair.opacity' ), 10 ) / 100;
	const oldCrosshairSize = Number.parseInt( preferences.value( 'crosshair.size' ), 10 );
	const newCrosshairSize = adsSize;

	log.info( 'Setting: ADS Resize' );

	if ( adsToggle ) {
		const listener = event => {
			if ( event.button === Number.parseInt( ads, 10 ) ) {
				const adsed = preferences.value( 'hidden.ADSed' );
				if ( adsed ) {
					set.rendererProperties( {
						'--crosshair-width': `${oldCrosshairSize}px`,
						'--crosshair-height': `${oldCrosshairSize}px`,
					}, windows.win );
				} else {
					set.rendererProperties( {
						'--crosshair-width': `${newCrosshairSize}px`,
						'--crosshair-height': `${newCrosshairSize}px`,
					}, windows.win );
				}
				preferences.value( 'hidden.ADSed', !adsed );
			}
		};
		uIOhook.on( 'mousedown', listener );
		registeredShortcuts.push( { event: 'mousedown', listener } );
	} else {
		const mouseDownListener = event => {
			if ( event.button === Number.parseInt( ads, 10 ) ) {
				set.rendererProperties( {
					'--crosshair-width': `${newCrosshairSize}px`,
					'--crosshair-height': `${newCrosshairSize}px`,
				}, windows.win );
			}
		};
		uIOhook.on( 'mousedown', mouseDownListener );
		registeredShortcuts.push( { event: 'mousedown', listener: mouseDownListener } );

		const mouseUpListener = event => {
			if ( event.button === Number.parseInt( ads, 10 ) ) {
				set.rendererProperties( {
					'--crosshair-width': `${oldCrosshairSize}px`,
					'--crosshair-height': `${oldCrosshairSize}px`,
					'--crosshair-opacity': opacity.toString(),
				}, windows.win );
			}
		};
		uIOhook.on( 'mouseup', mouseUpListener );
		registeredShortcuts.push( { event: 'mouseup', listener: mouseUpListener } );
	}
	uIOhook.start();
};

const iohook = {
	unregisterIOHook,
	followMouse,
	hideOnMouse,
	hideOnKey,
	tilt,
	resizeOnADS,
};

module.exports = iohook;
