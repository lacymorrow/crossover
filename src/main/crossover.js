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
const register = require( './register' )

const centerWindow = options => {

	options = { targetWindow: windows.getActiveWindow(), ...options }

	windows.center( options )

	options.targetWindow.show()

	// Save game
	if ( options.targetWindow === windows.win ) {

		save.position( windows.win.getBounds() )

	}

}

const escapeAction = () => {

	// log.info( 'Escape event' )

	windows.hideChooserWindow()
	windows.hideSettingsWindow()

	// TODO: circular dep - when using keyboard
	globalShortcut.unregister( 'Escape' )

}

const quit = () => app.quit()

const registerEscape = ( action = escapeAction ) => {

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
		return escapeAction()

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

const syncSettings = options => {

	log.info( 'Sync options' )

	crossover.setTheme( options?.app?.theme )

	if ( options?.crosshair?.crosshair ) {

		set.crosshair( options.crosshair.crosshair )

	}

	windows.each( win => {

		set.color( options?.crosshair?.color, win )
		set.opacity( options?.crosshair?.opacity, win )
		set.sight( options?.crosshair?.reticle, win )
		set.size( options?.crosshair?.size, win )

	} )

	// Reset all custom shortcuts
	const escapeActive = globalShortcut.isRegistered( 'Escape' )
	globalShortcut.unregisterAll()
	if ( escapeActive ) {

		keyboard.registerShortcut( 'Escape', crossover.escapeAction )

	}

	register.shortcuts()

	register.startOnBoot()

}

// Allows dragging and setting options
// const lockWindow = ( lock, targetWindow = windows.win ) => {

// 	log.info( `Locked: ${lock}` )

// 	hideChooserWindow()
// 	hideSettingsWindow()
// 	targetWindow.closable = !lock
// 	targetWindow.setFocusable( !lock )
// 	targetWindow.setIgnoreMouseEvents( lock )
// 	targetWindow.webContents.send( 'lock_window', lock )

// 	if ( lock ) {

// 		// Don't save bounds when locked
// 		if ( targetWindow === windows.win ) {

// 			targetWindow.removeAllListeners( 'move' )

// 		}

// 		/* Actions */
// 		const followMouse = checkboxTrue( preferences.value( 'mouse.followMouse' ), 'followMouse' )
// 		const hideOnMouse = Number.parseInt( preferences.value( 'mouse.hideOnMouse' ), 10 )
// 		const hideOnKey = preferences.value( 'mouse.hideOnKey' )
// 		const tilt = checkboxTrue( preferences.value( 'mouse.tiltEnable' ), 'tiltEnable' )

// 		iohook.unregisterIOHook()

// 		if ( followMouse ) {

// 			registerFollowMouse()

// 		}

// 		if ( hideOnMouse !== -1 ) {

// 			registerHideOnMouse()

// 		}

// 		if ( hideOnKey ) {

// 			registerHideOnKey()

// 		}

// 		if ( tilt && ( preferences.value( 'mouse.tiltLeft' ) || preferences.value( 'mouse.tiltRight' ) ) ) {

// 			registerTilt()

// 		}

// 		// Values include normal, floating, torn-off-menu, modal-panel, main-menu, status, pop-up-menu, screen-saver
// 		targetWindow.setAlwaysOnTop( true, 'screen-saver' )

// 	} else {

// 		/* Unlock */

// 		// Unregister
// 		iohook.unregisterIOHook()

// 		// Enable saving bounds
// 		if ( targetWindow === windows.win ) {

// 			register.saveWindowBounds()

// 		}

// 		// Allow dragging to Window on Mac
// 		targetWindow.setAlwaysOnTop( true, 'modal-panel' )

// 		// Bring window to front
// 		targetWindow.show()

// 	}

// 	dock.setVisible( !lock )

// 	preferences.value( 'hidden.locked', lock )

// }

const toggleWindowLock = ( lock = !preferences.value( 'hidden.locked' ) ) => {

	sound.play( lock ? 'LOCK' : 'UNLOCK' )

	windows.each( ( win => lockWindow( lock, win ) ) )

}

const crossover = { centerWindow, escapeAction, initShadowWindow, quit, setTheme, syncSettings, toggleWindowLock, openChooserWindow, openSettingsWindow }
module.exports = crossover
