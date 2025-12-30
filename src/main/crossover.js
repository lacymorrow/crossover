const { globalShortcut, nativeTheme, shell, app } = require( 'electron' )
const { SHADOW_WINDOW_OFFSET, DEFAULT_THEME, SETTINGS_WINDOW_DEVTOOLS, APP_BACKGROUND_OPACITY } = require( '../config/config' )
const { checkboxTrue, hexToRgbA } = require( '../config/utils' )
const dock = require( './dock' )
const iohook = require( './iohook' )
const keyboard = require( './keyboard' )
const log = require( './log' )
const save = require( './save' )
const set = require( './set' )
const sound = require( './sound' )
const windows = require( './windows' )
const reset = require( './reset' )
const Preferences = require( './preferences' )
const { getWindowBoundsCentered } = require( './util' )
const preferences = Preferences.init()

let previousPreferences = preferences.preferences

const quit = () => app.quit()

const changeCrosshair = src => windows.each( win => set.crosshair( src, win ) )

const keyboardShortcuts = () => {

	/* Default accelerator */
	const accelerator = 'Control+Shift+Alt'

	return [

		// Duplicate main window
		{

			action: 'duplicate',
			keybind: `${accelerator}+D`,
			async fn() {

				await crossover.initShadowWindow()

			},
		},

		// Toggle CrossOver
		{
			action: 'lock',
			keybind: `${accelerator}+X`,
			fn() {

				crossover.toggleWindowLock()

			},
		},

		// Center CrossOver
		{
			action: 'center',
			keybind: `${accelerator}+C`,
			fn() {

				sound.play( 'CENTER' )
				windows.center()

			},
		},

		// Move CrossOver to next monitor
		{
			action: 'changeDisplay',
			keybind: `${accelerator}+M`,
			fn() {

				windows.moveToNextDisplay()

			},
		},

		// Hide CrossOver
		{
			action: 'hide',
			keybind: `${accelerator}+H`,
			fn() {

				if ( preferences.value( 'hidden.locked' ) ) {

					windows.showHideWindow()

				}

			},
		},

		// Toggle Reticle
		{
			action: 'hideReticle',
			keybind: `${accelerator}+S`,
			fn() {

				if ( preferences.value( 'hidden.locked' ) ) {

					const hidden = !preferences.value( 'hidden.reticleHidden' )
					preferences.value( 'hidden.reticleHidden', hidden )
					log.info( `Reticle hidden: ${hidden}` )
					syncSettings()

				}

			},
		},

		// Quit CrossOver
		{
			action: 'quit',
			keybind: `${accelerator}+Q`,
			fn() {

				crossover.quit()

			},
		},

		// Focus next window
		{
			action: 'nextWindow',
			keybind: `${accelerator}+O`,
			fn() {

				windows.nextWindow()

			},
		},

		// Reset CrossOver
		{
			action: 'reset',
			keybind: `${accelerator}+R`,
			fn() {

				reset.app()

			},
		},

		// Single pixel movement
		{
			action: 'moveUp',
			keybind: `${accelerator}+Up`,
			fn() {

				windows.moveWindow( { direction: 'up' } )

			},
		},
		{
			action: 'moveDown',
			keybind: `${accelerator}+Down`,
			fn() {

				windows.moveWindow( { direction: 'down' } )

			},
		},
		{
			action: 'moveLeft',
			keybind: `${accelerator}+Left`,
			fn() {

				windows.moveWindow( { direction: 'left' } )

			},
		},
		{
			action: 'moveRight',
			keybind: `${accelerator}+Right`,
			fn() {

				windows.moveWindow( { direction: 'right' } )

			},
		},
	]

}

const registerKeyboardShortcuts = () => {

	// Register all shortcuts
	const { keybinds } = Preferences.getDefaults()
	const custom = preferences.value( 'keybinds' ) // Defaults
	for ( const shortcut of keyboardShortcuts() ) {

		// Custom shortcuts
		if ( custom[shortcut.action] === '' ) {

			log.info( `Clearing keybind for ${shortcut.action}` )

		} else if ( custom[shortcut.action] && keybinds[shortcut.action] && custom[shortcut.action] !== keybinds[shortcut.action] ) {

			// If a custom shortcut exists for this action
			log.info( `Custom keybind for ${shortcut.action}` )
			keyboard.registerShortcut( custom[shortcut.action], shortcut.fn )

		} else if ( keybinds[shortcut.action] ) {

			// Set default keybind
			keyboard.registerShortcut( keybinds[shortcut.action], shortcut.fn )

		} else {

			// Fallback to internal bind - THIS SHOULDNT HAPPEN
			// if it does you forgot to add a default keybind for this shortcut
			log.info( 'ERROR - you likely forgot to add a default keybind for this shortcut: ', shortcut )
			keyboard.registerShortcut( shortcut.keybind, shortcut.fn )

		}

	}

}

// Allows dragging and setting options
const lockWindow = ( lock, targetWindow = windows.win ) => {

	if ( !targetWindow || targetWindow.isDestroyed() ) {

		return

	}

	log.info( `Locked: ${lock}` )

	/* Actions */
	const followMouse = checkboxTrue( preferences.value( 'actions.followMouse' ), 'followMouse' )
	const hideOnMouse = Number.parseInt( preferences.value( 'actions.hideOnMouse' ), 10 )
	const hideOnKey = preferences.value( 'actions.hideOnKey' )
	const tilt = checkboxTrue( preferences.value( 'actions.tiltEnable' ), 'tiltEnable' )
	const resizeOnADS = preferences.value( 'actions.resizeOnADS' )

	/* DO STUFF */
	windows.hideSettingsWindow()
	windows.hideChooserWindow()
	targetWindow.closable = !lock
	targetWindow.setFocusable( !lock )
	targetWindow.webContents.send( 'lock_window', lock )
	targetWindow.setIgnoreMouseEvents( lock )

	if ( lock ) {

		// Don't save bounds when locked
		if ( targetWindow === windows.win ) {

			targetWindow.removeAllListeners( 'move' )

		}

		iohook.unregisterIOHook()

		if ( followMouse ) {

			iohook.followMouse()

		}

		if ( hideOnKey ) {

			iohook.hideOnKey()

		}

		if ( hideOnMouse !== -1 ) {

			iohook.hideOnMouse()

		}

		if ( tilt && ( preferences.value( 'actions.tiltLeft' ) || preferences.value( 'actions.tiltRight' ) ) ) {

			iohook.tilt()

		}

		if ( resizeOnADS !== 'off' ) {

			iohook.resizeOnADS()

		}

	} else {

		/* Unlock */

		// If followMouse, reset position
		if ( followMouse ) {

			crossover.resetPosition()

		}

		// Unregister
		iohook.unregisterIOHook()

		// Enable saving bounds
		if ( targetWindow === windows.win ) {

			registerSaveWindowBounds()

		}

	}

	dock.setVisible( !lock )

	preferences.value( 'hidden.locked', lock )

}

const resetPosition = () => {

	// App centered by default - set position if exists
	if ( preferences.value( 'crosshair.positionX' ) !== null && typeof preferences.value( 'crosshair.positionX' ) !== 'undefined' && preferences.value( 'crosshair.positionY' ) ) {

		set.position( preferences.value( 'crosshair.positionX' ), preferences.value( 'crosshair.positionY' ) )

	}

}

const syncSettings = ( options = preferences.preferences ) => {

	log.info( 'Sync options' )

	// Set app size
	set.appSize( options.app.appSize )

	// Properties to apply to renderer every sync
	const properties = {
		'--crosshair-width': `${options.crosshair.size}px`,
		'--crosshair-height': `${options.crosshair.size}px`,
		'--crosshair-opacity': ( options.crosshair.opacity || 100 ) / 100,
		'--reticle-fill-color': options.crosshair.color,
		'--reticle-scale': options.crosshair.reticleScale,
		'--tilt-angle': options.actions.tiltAngle,
		'--app-bg-color': 'unset',
		'--app-highlight-color': 'unset',
		'--svg-fill-color': 'unset',
		'--svg-stroke-color': 'unset',
		'--svg-stroke-width': 'unset',
		'--circle-radius': 15,
		'--circle-thickness': options.crosshair.circleThickness,
	}

	// App color is set

	if ( options.app.appHighlightColor.charAt( 0 ) === '#' ) {

		properties['--app-highlight-color'] = options.app.appHighlightColor

	}

	if ( options.app.appBgColor.charAt( 0 ) === '#' ) {

		properties['--app-bg-color'] = hexToRgbA( options.app.appBgColor, APP_BACKGROUND_OPACITY )

	}

	// SVG customizations enabled
	if ( checkboxTrue( options.crosshair.svgCustomization, 'svgCustomization' ) ) {

		properties['--svg-fill-color'] = options.crosshair.fillColor
		properties['--svg-stroke-color'] = options.crosshair.strokeColor
		properties['--svg-stroke-width'] = options.crosshair.strokeWidth

	}

	// If theme changed...
	if ( nativeTheme.themeSource !== options.app.theme ) {

		log.info( `Theme changed: ${options.app.theme}` )

		// Change app bg
		const THEME_VALUES = [
			'light', 'dark', 'system',
		]
		const theme = THEME_VALUES.includes( options.app.theme ) ? options.app.theme : DEFAULT_THEME
		nativeTheme.themeSource = theme
		properties['--app-bg-color'] = 'unset'
		properties['--app-highlight-color'] = 'unset'
		preferences.value( 'app.appBgColor', 'unset' )
		preferences.value( 'app.appHighlightColor', 'unset' )

		// Themesource is either light or dark, to prevent triggering this on every sync...
		if ( options.app.theme === 'system' ) {

			preferences.value( 'app.theme', nativeTheme.themeSource )

		}

	}

	// Set settings for every window
	windows.each( win => {

		set.crosshair( options.crosshair?.crosshair, win )
		set.reticle( options.hidden?.reticleHidden ? 'off' : options.crosshair?.reticle, win )
		set.rendererProperties( properties, win )

	} )

	set.startOnBoot()

	// Reset all custom shortcuts
	const escapeActive = globalShortcut.isRegistered( 'Escape' )
	globalShortcut.unregisterAll()
	if ( escapeActive ) {

		keyboard.registerShortcut( 'Escape', keyboard.escapeAction )

	}

	registerKeyboardShortcuts()

	previousPreferences = options

}

const initShadowWindow = async () => {

	log.info( 'Trying to create shadow window...' )

	if ( preferences.value( 'hidden.locked' ) ) {

		return

	}

	// Create
	const shadow = await windows.createShadow()

	// Setup
	shadow.webContents.send( 'add_class', 'shadow' )

	// Sync Preferences
	shadow.webContents.send( 'set_crosshair', preferences.value( 'crosshair.crosshair' ) )

	const properties = {
		// No app-color for shadow windows
		// No crosshair scaling for shadow windows
		// No resizing for shadow windows
		'--crosshair-width': `${previousPreferences.crosshair?.size}px`,
		'--crosshair-height': `${previousPreferences.crosshair?.size}px`,
		'--crosshair-opacity': ( previousPreferences.crosshair?.opacity || 100 ) / 100,
		'--reticle-fill-color': previousPreferences.crosshair?.color,
		'--reticle-scale': previousPreferences.crosshair?.reticleScale,
		'--tilt-angle': previousPreferences.actions?.tiltAngle,
		'--svg-fill-color': 'unset',
		'--svg-stroke-color': 'unset',
		'--svg-stroke-width': 'unset',
		'--circle-radius': 15,
		'--circle-thickness': previousPreferences.crosshair?.circleThickness,
	}

	if ( checkboxTrue( previousPreferences.crosshair?.svgCustomization, 'svgCustomization' ) ) {

		properties['--svg-fill-color'] = previousPreferences.crosshair?.fillColor
		properties['--svg-stroke-color'] = previousPreferences.crosshair?.strokeColor
		properties['--svg-stroke-width'] = previousPreferences.crosshair?.strokeWidth

	}

	set.crosshair( previousPreferences.crosshair?.crosshair, shadow )
	set.reticle( preferences.value( 'hidden.reticleHidden' ) ? 'off' : previousPreferences.crosshair?.reticle, shadow )
	set.rendererProperties( properties, shadow )

	if ( preferences.value( 'crosshair.positionX' ) > -1 ) {

		// Offset position slightly
		set.position( preferences.value( 'crosshair.positionX' ) + ( windows.shadowWindows.size * SHADOW_WINDOW_OFFSET ), preferences.value( 'crosshair.positionY' ) + ( windows.shadowWindows.size * SHADOW_WINDOW_OFFSET ), shadow )

	}

	lockWindow( preferences.value( 'hidden.locked' ), shadow )

	return shadow

}

const openChooserWindow = async () => {

	// Don't do anything if locked
	if ( preferences.value( 'hidden.locked' ) ) {

		return

	}

	windows.hideSettingsWindow()

	// await windows.createChooser()
	if ( !windows.chooserWindow ) {

		await windows.createChooser()

	}

	windows.chooserWindow.show()

	// Create shortcut to close chooser
	keyboard.registerEscape()

	// Open window 1px past the bottom of the app, offset 50% to the right
	// Mac opens above app because it's a child window
	const mainBounds = windows.win.getBounds()
	const newBounds = { x: mainBounds.x + ( mainBounds.width / 2 ), y: mainBounds.y + mainBounds.height + 1 }
	windows.safeSetBounds( windows.chooserWindow, newBounds )

}

const openSettingsWindow = async () => {

	// Don't do anything if locked
	if ( preferences.value( 'hidden.locked' ) ) {

		return

	}

	// If already open...
	if ( preferences.value( 'hidden.showSettings' ) && windows.preferencesWindow ) {

		// window already centered, we close it
		const bounds = windows.preferencesWindow.getBounds()
		const centered = getWindowBoundsCentered( { window: windows.preferencesWindow, useFullBounds: true } )
		if ( centered.x === bounds.x && centered.y === bounds.y ) {

			// we want to close
			return keyboard.escapeAction()

		}

		// center and bring to front
		return windows.center( { targetWindow: windows.preferencesWindow, focus: true } )

	}

	windows.hideChooserWindow()

	// Create shortcut to close window
	keyboard.registerEscape()

	windows.preferencesWindow = preferences.show()

	// Set events on preferences window
	if ( windows.preferencesWindow ) {

		// Hide window when clicked away
		windows.preferencesWindow.on( 'blur', () => {

			if ( !SETTINGS_WINDOW_DEVTOOLS ) {

				windows.hideSettingsWindow()

			}

		} )

		// Force opening URLs in the default browser (remember to use `target="_blank"`)
		windows.preferencesWindow.webContents.setWindowOpenHandler( details => {

			shell.openExternal( details.url )

			return { action: 'deny' }

		} )

		// Track window state
		windows.preferencesWindow.on( 'closed', () => {

			preferences.value( 'hidden.showSettings', false )
			windows.preferencesWindow = null

		} )

		const mainBounds = windows.win.getBounds()
		const newBounds = { x: mainBounds.x + mainBounds.width + 1, y: mainBounds.y + mainBounds.height + 1 }
		windows.safeSetBounds( windows.preferencesWindow, newBounds )

		// Keep settings on top of everything else
		// Values include normal, floating, torn-off-menu, modal-panel, main-menu, status, pop-up-menu, screen-saver
		// windows.preferencesWindow.setVisibleOnAllWorkspaces( true, { visibleOnFullScreen: true } )
		// windows.preferencesWindow.setAlwaysOnTop( true, 'screen-saver' )
		windows.preferencesWindow.focus()

		preferences.value( 'hidden.showSettings', true )

	}

}

const registerSaveWindowBounds = () => {

	windows.win.on( 'move', () => {

		save.position( windows.win.getBounds() )

	} )

}

const toggleWindowLock = ( lock = !preferences.value( 'hidden.locked' ) ) => {

	sound.play( lock ? 'LOCK' : 'UNLOCK' )

	windows.each( ( win => lockWindow( lock, win ) ) )

}

const crossover = {
	changeCrosshair,
	initShadowWindow,
	lockWindow,
	openChooserWindow,
	openSettingsWindow,
	previousPreferences,
	quit,
	registerKeyboardShortcuts,
	resetPosition,
	syncSettings,
	toggleWindowLock,
}
module.exports = crossover
