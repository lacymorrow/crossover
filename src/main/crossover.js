const { globalShortcut, ipcMain, nativeTheme, shell, app } = require( 'electron' )
const { SHADOW_WINDOW_OFFSET, DEFAULT_THEME, SETTINGS_WINDOW_DEVTOOLS, APP_BACKGROUND_OPACITY } = require( '../config/config' )
const { checkboxTrue, hexToRgbA } = require( '../config/utils' )
const dock = require( './dock' )
const iohook = require( './iohook' )
const keyboard = require( './keyboard' )
const log = require( './log' )
const presets = require( './presets' )
const save = require( './save' )
const set = require( './set' )
const sound = require( './sound' )
const wayland = require( './wayland' )
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

		// Switch to the next saved preset
		{
			action: 'cyclePreset',
			keybind: `${accelerator}+P`,
			fn() {

				presets.cycle()

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

// One-shot so the Wayland notice doesn't repeat on every preference save.
let waylandNoticeShown = false

// Kept alive when all keybinds are disabled, so a locked app is never stranded (#299)
const SAFETY_ACTIONS = new Set( [ 'lock', 'reset' ] )

const keybindsDisabled = () => checkboxTrue( preferences.value( 'keybinds.disableAll' ), 'disableAll' )

// `previousPreferences` can alias the live store, so the menu rebuild tracks the
// last value it actually applied instead of diffing the snapshot.
let keybindsDisabledApplied = keybindsDisabled()

// Returns true when the notice was handed to the renderer.
const notify = options => {

	// Only notify when the renderer window is ready to receive it
	if ( !windows.win || windows.win.isDestroyed() ) {

		return false

	}

	const notification = require( './notification' )
	notification( options )

	return true

}

// A native Wayland compositor accepts the registration and then never delivers
// the key, so no registration result can catch it. Say so plainly. (#456)
// Shortcuts re-register on every preference save, so only say it once.
const warnIfShortcutsBlocked = () => {

	// Nothing was asked to fire when the master switch took everything, so a
	// notice about shortcuts not firing would be noise. (#299)
	if ( keybindsDisabled() && preferences.value( 'hidden.disableSafetyKeybinds' ) === true ) {

		return

	}

	const blocked = wayland.shortcutsBlockedReason()

	if ( !blocked ) {

		return

	}

	log.warn( `Shortcuts cannot fire: ${blocked}` )

	if ( !waylandNoticeShown ) {

		waylandNoticeShown = notify( {
			title: 'Shortcuts Won\'t Work Here',
			body: blocked,
		} )

	}

}

const registerKeyboardShortcuts = () => {

	// Register all shortcuts
	const { keybinds } = Preferences.getDefaults()
	const custom = preferences.value( 'keybinds' ) // Defaults
	const registeredShortcuts = []
	const failed = []

	// #299: master switch. Lock and Reset survive it unless the hidden
	// preference opts out of them too.
	const disableAll = keybindsDisabled()
	const disableSafety = preferences.value( 'hidden.disableSafetyKeybinds' ) === true

	if ( disableAll ) {

		log.info( disableSafety ? 'All keybinds disabled' : 'All keybinds disabled except Lock and Reset' )

	}

	for ( const shortcut of keyboardShortcuts() ) {

		if ( disableAll && ( disableSafety || !SAFETY_ACTIONS.has( shortcut.action ) ) ) {

			continue

		}

		let accelerator
		let registered

		// Custom shortcuts
		if ( custom[shortcut.action] === '' ) {

			log.info( `Clearing keybind for ${shortcut.action}` )

		} else if ( custom[shortcut.action] && keybinds[shortcut.action] && custom[shortcut.action] !== keybinds[shortcut.action] ) {

			// If a custom shortcut exists for this action
			log.info( `Custom keybind for ${shortcut.action}` )
			accelerator = custom[shortcut.action]
			registered = keyboard.registerShortcut( accelerator, shortcut.fn )

		} else if ( keybinds[shortcut.action] ) {

			// Set default keybind
			accelerator = keybinds[shortcut.action]
			registered = keyboard.registerShortcut( accelerator, shortcut.fn )

		} else {

			// Fallback to internal bind - THIS SHOULDNT HAPPEN
			// if it does you forgot to add a default keybind for this shortcut
			log.info( 'ERROR - you likely forgot to add a default keybind for this shortcut: ', shortcut )
			accelerator = shortcut.keybind
			registered = keyboard.registerShortcut( accelerator, shortcut.fn )

		}

		if ( accelerator && registered === false ) {

			failed.push( accelerator )

		} else if ( accelerator && registered ) {

			registeredShortcuts.push( `${shortcut.action}: ${accelerator}` )

		}

	}

	// Diagnostics: the log is the only place a user can see what actually bound.
	log.info( `Shortcuts registered (${registeredShortcuts.length}): ${registeredShortcuts.join( ', ' ) || 'none'}` )
	log.info( wayland.debugInfo() )

	if ( failed.length > 0 ) {

		log.warn( `Shortcut registration failed for: ${failed.join( ', ' )}` )
		notify( {
			title: 'Keyboard Shortcut Conflict',
			body: `Could not register: ${failed.join( ', ' )}. Another app may be using this combo. Try rebinding in Settings.`,
		} )

	}

	warnIfShortcutsBlocked()

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

	// App colors — highlight only applies when bg is also set; resetting bg resets highlight too

	if ( options.app.appBgColor?.startsWith( '#' ) ) {

		properties['--app-bg-color'] = hexToRgbA( options.app.appBgColor, APP_BACKGROUND_OPACITY )

		if ( options.app.appHighlightColor?.startsWith( '#' ) ) {

			properties['--app-highlight-color'] = options.app.appHighlightColor

		}

	} else if ( options.app.appHighlightColor !== 'unset' ) {

		// bg was reset to default — clear orphaned highlight color so buttons stay visible
		preferences.value( 'app.appHighlightColor', 'unset' )

	}

	// SVG customizations enabled
	if ( !checkboxTrue( options.crosshair.svgCustomization, 'svgCustomization' ) ) {

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

	// Sync screen-capture exclusion across all windows (#359)
	windows.syncContentProtection()

	set.startOnBoot()

	// Reset all custom shortcuts
	const escapeActive = globalShortcut.isRegistered( 'Escape' )
	globalShortcut.unregisterAll()
	if ( escapeActive ) {

		keyboard.registerShortcut( 'Escape', keyboard.escapeAction )

	}

	registerKeyboardShortcuts()

	// #299: the Preferences accelerator lives in the app menu, so the menu has to
	// be rebuilt when the master switch flips. ipc.js owns the rebuild so this
	// file never reaches menu.js or tray.js, which both reach back here. A lazy
	// require is not enough: madge counts requires inside function bodies.
	if ( keybindsDisabled() !== keybindsDisabledApplied ) {

		keybindsDisabledApplied = keybindsDisabled()

		// emit() returns false when nothing is listening. Without this the menus
		// would silently stop rebuilding if ipc.init() ever stopped running.
		if ( !ipcMain.emit( 'refresh_menus' ) ) {

			log.warn( 'refresh_menus has no listener: the app menu was not rebuilt' )

		}

	}

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

	if ( !checkboxTrue( previousPreferences.crosshair?.svgCustomization, 'svgCustomization' ) ) {

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
		// Todo: remove this check when updating to electron 12, this is to allow 11/12 compatibility
		if ( typeof windows.preferencesWindow.webContents.setWindowOpenHandler === 'function' ) {

			// Electron 12+
			windows.preferencesWindow.webContents.setWindowOpenHandler( details => {

				shell.openExternal( details.url )

				return { action: 'deny' }

			} )

		} else {

			// Electron 11
			windows.preferencesWindow.webContents.on( 'new-window', ( event, url ) => {

				event.preventDefault()
				shell.openExternal( url )

			} )

		}

		// Track window state
		windows.preferencesWindow.on( 'closed', () => {

			preferences.value( 'hidden.showSettings', false )
			windows.preferencesWindow = null

		} )

		const mainBounds = windows.win.getBounds()
		const newBounds = { x: mainBounds.x + mainBounds.width + 1, y: mainBounds.y + mainBounds.height + 1 }
		windows.safeSetBounds( windows.preferencesWindow, newBounds )

		// Values include normal, floating, torn-off-menu, modal-panel, main-menu, status, pop-up-menu, screen-saver
		windows.preferencesWindow.setVisibleOnAllWorkspaces( true, { visibleOnFullScreen: true } )
		windows.preferencesWindow.setAlwaysOnTop( true, 'screen-saver' )
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
	keybindsDisabled,
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
