const { globalShortcut, nativeTheme, shell, app } = require( 'electron' )
const { is, getWindowBoundsCentered } = require( 'electron-util' )
const { SHADOW_WINDOW_OFFSET, DEFAULT_THEME, APP_HEIGHT, SETTINGS_WINDOW_DEVTOOLS } = require( '../config/config' )
const actions = require( './actions' )
const dock = require( './dock' )
// const init = require( './init' )
const iohook = require( './iohook' )
const keyboard = require( './keyboard' )
const log = require( './log' )
const preferences = require( './electron-preferences' )
const save = require( './save' )
const set = require( './set' )
const sound = require( './sound' )
const windows = require( './windows' )
const { checkboxTrue } = require( '../config/utils' )
const reset = require( './reset' )

let previousPreferences = preferences.preferences

const quit = () => app.quit()

const centerWindow = options => {

	options = { targetWindow: windows.getActiveWindow(), ...options }

	windows.center( options )

	options.targetWindow.show()

	// Save game
	if ( options.targetWindow === windows.win ) {

		save.position( windows.win.getBounds() )

	}

}

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

				windows.center()

			},
		},

		// Hide CrossOver
		{
			action: 'hide',
			keybind: `${accelerator}+H`,
			fn() {

				windows.showHideWindow()

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
	const { keybinds } = preferences.defaults
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
			log.info( 'ERROR', shortcut )
			keyboard.registerShortcut( shortcut.keybind, shortcut.fn )

		}

	}

}

// Allows dragging and setting options
const lockWindow = ( lock, targetWindow = windows.win ) => {

	log.info( `Locked: ${lock}` )

	windows.hideChooserWindow()
	windows.hideSettingsWindow()
	targetWindow.closable = !lock
	targetWindow.setFocusable( !lock )
	targetWindow.setIgnoreMouseEvents( lock )
	targetWindow.webContents.send( 'lock_window', lock )

	if ( lock ) {

		// Don't save bounds when locked
		if ( targetWindow === windows.win ) {

			targetWindow.removeAllListeners( 'move' )

		}

		/* Actions */
		const followMouse = checkboxTrue( preferences.value( 'mouse.followMouse' ), 'followMouse' )
		const hideOnMouse = Number.parseInt( preferences.value( 'mouse.hideOnMouse' ), 10 )
		const hideOnKey = preferences.value( 'mouse.hideOnKey' )
		const tilt = checkboxTrue( preferences.value( 'mouse.tiltEnable' ), 'tiltEnable' )

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

		if ( tilt && ( preferences.value( 'mouse.tiltLeft' ) || preferences.value( 'mouse.tiltRight' ) ) ) {

			iohook.tilt()

		}

		// Values include normal, floating, torn-off-menu, modal-panel, main-menu, status, pop-up-menu, screen-saver
		targetWindow.setAlwaysOnTop( true, 'screen-saver' )

	} else {

		/* Unlock */

		// Unregister
		iohook.unregisterIOHook()

		// Enable saving bounds
		if ( targetWindow === windows.win ) {

			registerSaveWindowBounds()

		}

		// Allow dragging to Window on Mac
		targetWindow.setAlwaysOnTop( true, 'modal-panel' )

	}

	// Bring window to front
	targetWindow.show()

	dock.setVisible( !lock )

	preferences.value( 'hidden.locked', lock )

}

const syncSettings = ( options = preferences.preferences ) => {

	log.info( 'Sync options' )

	// Properties to apply to renderer

	const properties = {
		'--crosshair-width': `${options.crosshair?.size}px`,
		'--crosshair-height': `${options.crosshair?.size}px`,
		'--crosshair-opacity': ( options.crosshair?.opacity || 100 ) / 100,
		'--reticle-fill-color': options.crosshair?.color,
		'--reticle-scale': options.crosshair?.reticleScale,
		'--tilt-angle': options.mouse?.tiltAngle,
		'--svg-fill-color': 'inherit',
		'--svg-stroke-color': 'inherit',
		'--svg-stroke-width': 'inherit',
	}

	if ( !checkboxTrue( options.crosshair?.svgCustomization, 'svgCustomization' ) ) {

		properties['--svg-fill-color'] = options.crosshair?.fillColor
		properties['--svg-stroke-color'] = options.crosshair?.strokeColor
		properties['--svg-stroke-width'] = options.crosshair?.strokeWidth

	}

	if ( previousPreferences.app?.theme !== options.app?.theme ) {

		const THEME_VALUES = [ 'light', 'dark', 'system' ]
		const theme = THEME_VALUES.includes( options.app.theme ) ? options.app.theme : DEFAULT_THEME
		const bgColor = theme === 'dark' ? '#FFF' : '#000'
		nativeTheme.themeSource = theme
		properties['--app-bg-color'] = bgColor
		preferences.value( 'app.appColor', bgColor )

	}

	// Set settings for every window
	windows.each( win => {

		set.crosshair( options.crosshair?.crosshair, win )
		set.reticle( options.crosshair?.reticle, win )
		set.rendererProperties( properties, win )

	} )

	set.startOnBoot()

	// Reset all custom shortcuts
	const escapeActive = globalShortcut.isRegistered( 'Escape' )
	globalShortcut.unregisterAll()
	if ( escapeActive ) {

		keyboard.registerShortcut( 'Escape', actions.escape )

	}

	registerKeyboardShortcuts()

	previousPreferences = options

}

const initShadowWindow = async () => {

	// Create
	const shadow = await windows.createShadow()

	// Setup
	shadow.webContents.send( 'add_class', 'shadow' )

	// Sync Preferences
	shadow.webContents.send( 'set_crosshair', preferences.value( 'crosshair.crosshair' ) )
	const properties = {
		'--crosshair-width': `${previousPreferences.crosshair?.size}px`,
		'--crosshair-height': `${previousPreferences.crosshair?.size}px`,
		'--crosshair-opacity': ( previousPreferences.crosshair?.opacity || 100 ) / 100,
		'--reticle-fill-color': previousPreferences.crosshair?.color,
		'--reticle-scale': previousPreferences.crosshair?.reticleScale,
		'--tilt-angle': previousPreferences.mouse?.size,
		'--svg-fill-color': 'inherit',
		'--svg-stroke-color': 'inherit',
		'--svg-stroke-width': 'inherit',
	}

	if ( !checkboxTrue( previousPreferences.crosshair?.svgCustomization, 'svgCustomization' ) ) {

		properties['--svg-fill-color'] = previousPreferences.crosshair?.fillColor
		properties['--svg-stroke-color'] = previousPreferences.crosshair?.strokeColor
		properties['--svg-stroke-width'] = previousPreferences.crosshair?.strokeWidth

	}

	set.crosshair( previousPreferences.crosshair?.crosshair, shadow )
	set.reticle( previousPreferences.crosshair?.reticle, shadow )
	set.rendererProperties( properties, shadow )

	if ( preferences.value( 'hidden.positionX' ) > -1 ) {

		// Offset position slightly
		set.position( preferences.value( 'hidden.positionX' ) + ( windows.shadowWindows.size * SHADOW_WINDOW_OFFSET ), preferences.value( 'hidden.positionY' ) + ( windows.shadowWindows.size * SHADOW_WINDOW_OFFSET ), shadow )

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

	await windows.createChooser()

	windows.chooserWindow.show()

	// Create shortcut to close chooser
	// TODO: circular dep - when using keyboard
	registerEscape()

	// Modal placement is different per OS
	if ( is.macos ) {

		const bounds = windows.win.getBounds()
		windows.chooserWindow.setBounds( { y: bounds.y + APP_HEIGHT } )

	} else {

		// Windows
		const bounds = getWindowBoundsCentered( { window: windows.chooserWindow, useFullBounds: true } )
		const mainBounds = windows.win.getBounds()
		windows.chooserWindow.setBounds( { x: bounds.x, y: mainBounds.y + mainBounds.height + 1 } )

	}

}

const openSettingsWindow = async () => {

	// Don't do anything if locked
	if ( preferences.value( 'hidden.locked' ) ) { //  || preferences.value( 'hidden.showSettings' )

		return

	}

	if ( preferences.value( 'hidden.showSettings' ) ) {

		// Hide if already visible
		return actions.escape()

	}

	windows.hideChooserWindow()

	// Create shortcut to close window
	// TODO: circular dep - when using keyboard
	registerEscape()

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
		windows.preferencesWindow.webContents.on( 'new-window', ( event, url ) => {

			event.preventDefault()
			shell.openExternal( url )

		} )

		// Track window state
		windows.preferencesWindow.on( 'closed', () => {

			preferences.value( 'hidden.showSettings', false )
			windows.preferencesWindow = null

		} )

		// Values include normal, floating, torn-off-menu, modal-panel, main-menu, status, pop-up-menu, screen-saver
		windows.preferencesWindow.setAlwaysOnTop( true, 'modal-panel' )

		// Modal placement is different per OS
		if ( is.macos ) {

			const bounds = windows.win.getBounds()
			windows.preferencesWindow.setBounds( { y: bounds.y + APP_HEIGHT } )

		} else {

			// Windows
			const bounds = getWindowBoundsCentered( { window: windows.preferencesWindow, useFullBounds: true } )
			const mainBounds = windows.win.getBounds()
			windows.preferencesWindow.setBounds( { x: bounds.x, y: mainBounds.y + mainBounds.height + 1 } )

		}

		preferences.value( 'hidden.showSettings', true )

	}

}

const registerSaveWindowBounds = () => {

	windows.win.on( 'move', () => {

		save.position( windows.win.getBounds() )

	} )

}

const registerEscape = ( action = actions.escape ) => {

	if ( !globalShortcut.isRegistered( 'Escape' ) ) {

		globalShortcut.register( 'Escape', action )

	}

}

const toggleWindowLock = ( lock = !preferences.value( 'hidden.locked' ) ) => {

	sound.play( lock ? 'LOCK' : 'UNLOCK' )

	windows.each( ( win => lockWindow( lock, win ) ) )

}

const crossover = {
	centerWindow,
	changeCrosshair,
	initShadowWindow,
	lockWindow,
	openChooserWindow,
	openSettingsWindow,
	previousPreferences,
	quit,
	registerKeyboardShortcuts,
	syncSettings,
	toggleWindowLock,
}
module.exports = crossover
