const { globalShortcut, nativeTheme, shell, app } = require( 'electron' )
const { is, getWindowBoundsCentered } = require( 'electron-util' )
const { SHADOW_WINDOW_OFFSET, DEFAULT_THEME, APP_HEIGHT, SETTINGS_WINDOW_DEVTOOLS } = require( '../config/config' )
const log = require( './log' )
const preferences = require( './electron-preferences' )
const save = require( './save' )
const set = require( './set' )
const sound = require( './sound' )
const windows = require( './windows' )
const keyboard = require( './keyboard' )
const reset = require( './reset' )
const actions = require( './actions' )
const { checkboxTrue } = require( '../config/utils' )
const iohook = require( './iohook' )
const dock = require( './dock' )

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

const keyboardShortcuts = () => {

	/* Default accelerator */
	const accelerator = 'Control+Shift+Alt'

	return [

		// Duplicate main window
		{

			action: 'duplicate',
			keybind: `${accelerator}+D`,
			async fn() {

				await initShadowWindow()

			},
		},

		// Toggle CrossOver
		{
			action: 'lock',
			keybind: `${accelerator}+X`,
			fn() {

				toggleWindowLock()

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

const setTheme = theme => {

	const THEME_VALUES = [ 'light', 'dark', 'system' ]
	nativeTheme.themeSource = THEME_VALUES.includes( theme ) ? theme : DEFAULT_THEME

	return nativeTheme.shouldUseDarkColors

}

const initShadowWindow = async () => {

	// Create
	const shadow = await windows.createShadow()

	// Setup
	shadow.webContents.send( 'add_class', 'shadow' )

	// Sync Preferences
	shadow.webContents.send( 'set_crosshair', preferences.value( 'crosshair.crosshair' ) )
	set.color( preferences.value( 'crosshair.color' ), shadow )
	set.opacity( preferences.value( 'crosshair.opacity' ), shadow )
	set.sight( preferences.value( 'crosshair.reticle' ), shadow )
	set.size( preferences.value( 'crosshair.size' ), shadow )

	if ( preferences.value( 'hidden.positionX' ) > -1 ) {

		// Offset position slightly
		set.position( preferences.value( 'hidden.positionX' ) + ( windows.shadowWindows.size * SHADOW_WINDOW_OFFSET ), preferences.value( 'hidden.positionY' ) + ( windows.shadowWindows.size * SHADOW_WINDOW_OFFSET ), shadow )

	}

	// lockWindow( preferences.value( 'hidden.locked' ), shadow )

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

const syncSettings = ( options = preferences.preferences ) => {

	log.info( 'Sync options' )

	setTheme( options?.app?.theme )

	// Set to previously selected crosshair
	if ( options?.crosshair?.crosshair ) {

		set.crosshair( options.crosshair.crosshair )

	}

	windows.each( win => {

		set.color( options?.crosshair?.color, win )
		set.opacity( options?.crosshair?.opacity, win )
		set.sight( options?.crosshair?.reticle, win )
		set.size( options?.crosshair?.size, win )

	} )

	set.startOnBoot()

	// Reset all custom shortcuts
	const escapeActive = globalShortcut.isRegistered( 'Escape' )
	globalShortcut.unregisterAll()
	if ( escapeActive ) {

		keyboard.registerShortcut( 'Escape', actions.escape )

	}

	registerKeyboardShortcuts()

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

		// Bring window to front
		targetWindow.show()

	}

	dock.setVisible( !lock )

	preferences.value( 'hidden.locked', lock )

}

const toggleWindowLock = ( lock = !preferences.value( 'hidden.locked' ) ) => {

	sound.play( lock ? 'LOCK' : 'UNLOCK' )

	windows.each( ( win => lockWindow( lock, win ) ) )

}

const crossover = { centerWindow, initShadowWindow, lockWindow, quit, registerKeyboardShortcuts, setTheme, syncSettings, toggleWindowLock, openChooserWindow, openSettingsWindow }
module.exports = crossover
