/*
	Changed:
		#20 Custom keybinds
		#85 turn off updates
		#84 Mouse hooks
		#70 Performance settings - gpu
		#86 start on boot
		#88 allow disable keybinds
		hide settings on blur
		Custom crosshair should be a setting

	High:
		test window placement on windows/mac
		fix unhandled #81

	Medium:
		polish menu
		shadow window bug on move to next display

	Low:
		Conflicting accelerator on Fedora
		dont save.position if monitor has been unplugged
*/

// const NativeExtension = require('bindings')('NativeExtension');

console.time( 'init' )

const process = require( 'process' )

const { app, dialog, ipcMain, Menu, nativeTheme, shell, globalShortcut } = require( 'electron' )
const { autoUpdater } = require( 'electron-updater' )
const { appMenu, getWindowBoundsCentered, is } = require( 'electron-util' )
const debug = require( 'electron-debug' )
const { checkboxTrue } = require( './config/utils.js' )
const EXIT_CODES = require( './config/exit-codes.js' )
const keycode = require( './config/keycode.js' )
const { APP_HEIGHT, APP_WIDTH, DEFAULT_THEME, FILE_FILTERS, RELEASES_URL, SETTINGS_WINDOW_DEVTOOLS, SHADOW_WINDOW_OFFSET } = require( './config/config.js' )

const dock = require( './main/dock.js' )
const { debugSubmenu, helpSubmenu } = require( './main/menu.js' )
const errorHandling = require( './main/error-handling.js' )
const iohook = require( './main/iohook.js' )
const log = require( './main/log.js' )
const save = require( './main/save.js' )
const preferences = require( './main/electron-preferences.js' )
const windows = require( './main/windows.js' )
const sound = require( './main/sound.js' )
const shortcut = require( './main/shortcut.js' )
const helpers = require( './main/helpers.js' )
let ioHook

/* App setup */
console.log( '***************' )
log.info( `CrossOver ${app.getVersion()} ${is.development ? '* Development *' : ''}` )

// Handle errors early
errorHandling()

// Prevent multiple instances of the app
if ( !app.requestSingleInstanceLock() ) {

	app.quit()

}

// Note: Must match `build.appId` in package.json
app.setAppUserModelId( 'com.lacymorrow.crossover' )

const setBounds = win => {

	if ( !win ) {

		win = windows.win

	}

	const winBounds = win.getBounds()
	log.info( `Save winBounds: ${winBounds.x}, ${winBounds.y}` )
	preferences.value( 'hidden.positionX', winBounds.x )
	preferences.value( 'hidden.positionY', winBounds.y )

}

// Debug Settings
debug( {
	showDevTools: is.development && !is.linux,
	devToolsMode: 'undocked',
} )

// Electron reloader is janky sometimes
// try {
//  require( 'electron-reloader' )( module )
// } catch {}

//
// Const contextMenu = require('electron-context-menu')
// contextMenu()

// Auto-Update
const appUpdate = () => {

	// Comment this before publishing your first version.
	// It's commented out as it throws an error if there are no published versions.
	if ( checkboxTrue( preferences.value( 'app.updates' ), 'updates' ) ) {

		log.info( 'Setting: Automatic Updates' )
		mainWindow.setProgressBar( 50 / 100 || -1 )

		autoUpdater.logger = log
		autoUpdater.on( 'update-available', () => {

			sound.play( 'UPDATE' )
			mainWindow.webContents.send( 'update_available' )

			if ( is.linux ) {

				dialog.showMessageBox( {
					type: 'info',
					title: 'CrossOver Update Available',
					message: '',
					buttons: [ 'Update', 'Ignore' ],
				} ).then( buttonIndex => {

					if ( buttonIndex === 0 ) {

						// AutoUpdater.downloadUpdate()
						shell.openExternal( RELEASES_URL )

					}

				} )

			}

		} )

		if ( !is.linux ) {

			autoUpdater.on( 'download-progress', progressObject => {

				let message = 'Download speed: ' + progressObject.bytesPerSecond
				message = message + ' - Downloaded ' + progressObject.percent + '%'
				message = message + ' (' + progressObject.transferred + '/' + progressObject.total + ')'
				log.info( message )

				// Dock progress bar
				mainWindow.setProgressBar( progressObject.percent / 100 || -1 )

			} )

			autoUpdater.on( 'update-downloaded', () => {

				dock.setBadge( '!' )
				notification( { title: 'CrossOver has been Updated', body: 'Relaunch to take effect' } )
				// PlaySound( 'DONE' )

			} )
			const FOUR_HOURS = 1000 * 60 * 60 * 4
			setInterval( () => {

				autoUpdater.checkForUpdates()

			}, FOUR_HOURS )

			autoUpdater.checkForUpdatesAndNotify()

		}

	}

}

// Fix for Linux transparency issues
if ( is.linux || !checkboxTrue( preferences.value( 'app.gpu' ), 'gpu' ) ) {

	// Disable hardware acceleration
	log.info( 'Setting: Disable GPU' )
	app.commandLine.appendSwitch( 'enable-transparent-visuals' )
	app.commandLine.appendSwitch( 'disable-gpu' )
	app.disableHardwareAcceleration()

} else {

	log.info( 'Setting: Enable GPU' )

}

// Prevent window from being garbage collected
let mainWindow
let chooserWindow

const toggleWindowLock = ( lock = !preferences.value( 'hidden.locked' ) ) => {

	sound.play( lock ? 'LOCK' : 'UNLOCK' )

	lockWindow( lock )
	for ( const currentWindow of windows.shadowWindows ) {

		lockWindow( lock, currentWindow )

	}

}

// Allows dragging and setting options
const lockWindow = ( lock, targetWindow = mainWindow ) => {

	log.info( `Locked: ${lock}` )

	windows.hideChooserWindow()
	windows.hideSettingsWindow()
	targetWindow.closable = !lock
	targetWindow.setFocusable( !lock )
	targetWindow.setIgnoreMouseEvents( lock )
	targetWindow.webContents.send( 'lock_window', lock )

	if ( lock ) {

		// Don't save bounds when locked
		if ( targetWindow === mainWindow ) {

			mainWindow.removeAllListeners( 'move' )

		}

		/* Actions */
		const followMouse = checkboxTrue( preferences.value( 'mouse.followMouse' ), 'followMouse' )
		const hideOnMouse = Number.parseInt( preferences.value( 'mouse.hideOnMouse' ), 10 )
		const hideOnKey = preferences.value( 'mouse.hideOnKey' )
		const tilt = checkboxTrue( preferences.value( 'mouse.tiltEnable' ), 'tiltEnable' )

		iohook.unregisterIOHook()

		if ( followMouse ) {

			registerFollowMouse()

		}

		if ( hideOnMouse !== -1 ) {

			registerHideOnMouse()

		}

		if ( hideOnKey ) {

			registerHideOnKey()

		}

		if ( tilt && ( preferences.value( 'mouse.tiltLeft' ) || preferences.value( 'mouse.tiltRight' ) ) ) {

			registerTilt()

		}

		// Values include normal, floating, torn-off-menu, modal-panel, main-menu, status, pop-up-menu, screen-saver
		targetWindow.setAlwaysOnTop( true, 'screen-saver' )

	} else {

		/* Unlock */

		// Unregister
		iohook.unregisterIOHook()

		// Enable saving bounds
		if ( targetWindow === mainWindow ) {

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

const openChooserWindow = async () => {

	// Don't do anything if locked
	if ( preferences.value( 'hidden.locked' ) ) {

		return

	}

	windows.hideSettingsWindow()

	if ( !chooserWindow ) {

		chooserWindow = await windows.createChooser()

	}

	chooserWindow.show()

	// Create shortcut to close chooser
	if ( !globalShortcut.isRegistered( 'Escape' ) ) {

		globalShortcut.register( 'Escape', escapeAction )

	}

	// Modal placement is different per OS
	if ( is.macos ) {

		const bounds = mainWindow.getBounds()
		chooserWindow.setBounds( { y: bounds.y + APP_HEIGHT } )

	} else {

		// Windows
		const bounds = getWindowBoundsCentered( { window: chooserWindow, useFullBounds: true } )
		const mainBounds = mainWindow.getBounds()
		chooserWindow.setBounds( { x: bounds.x, y: mainBounds.y + mainBounds.height + 1 } )

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
	if ( !globalShortcut.isRegistered( 'Escape' ) ) {

		globalShortcut.register( 'Escape', escapeAction )

	}

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

			const bounds = mainWindow.getBounds()
			windows.preferencesWindow.setBounds( { y: bounds.y + APP_HEIGHT } )

		} else {

			// Windows
			const bounds = getWindowBoundsCentered( { window: windows.preferencesWindow, useFullBounds: true } )
			const mainBounds = mainWindow.getBounds()
			windows.preferencesWindow.setBounds( { x: bounds.x, y: mainBounds.y + mainBounds.height + 1 } )

		}

		preferences.value( 'hidden.showSettings', true )

	}

}

const escapeAction = () => {

	log.info( 'Escape event' )

	windows.hideChooserWindow()
	windows.hideSettingsWindow()
	globalShortcut.unregister( 'Escape' )

}

const registerFollowMouse = async () => {

	// Prevent saving bounds
	mainWindow.removeAllListeners( 'move' )

	log.info( 'Setting: Mouse Follow' )
	ioHook = await iohook.importIoHook()
	ioHook.removeAllListeners( 'mousemove' )

	// Register
	ioHook.on( 'mousemove', event => {

		mainWindow.setBounds( {
			x: event.x - ( APP_WIDTH / 2 ),
			y: event.y - ( APP_HEIGHT / 2 ),
		} )

	} )

}

const registerHideOnMouse = async () => {

	log.info( 'Setting: Mouse Hide' )
	ioHook = await iohook.importIoHook()

	const mouseButton = Number.parseInt( preferences.value( 'mouse.hideOnMouse' ), 10 )

	// Register
	ioHook.on( 'mousedown', event => {

		if ( event.button === mouseButton ) {

			windows.hideWindow()

		}

	} )

	ioHook.on( 'mouseup', event => {

		if ( event.button === mouseButton ) {

			windows.showWindow()

		}

	} )

	// Register and start hook
	ioHook.start()

}

const registerHideOnKey = async () => {

	log.info( 'Setting: Keyboard Hide' )
	ioHook = await iohook.importIoHook()

	const hideOnKey = preferences.value( 'mouse.hideOnKey' )

	if ( Object.prototype.hasOwnProperty.call( keycode, hideOnKey ) ) {

		const key = keycode[hideOnKey]

		// Register
		ioHook.registerShortcut(
			[ key ],
			_ => {

				windows.hideWindow()

			},
			_ => {

				windows.showWindow()

			},
		)

		// Register and start hook
		ioHook.start()

	}

}

const tiltCrosshair = angle => {

	if ( angle ) {

		mainWindow.webContents.send( 'tilt', angle )

	} else {

		mainWindow.webContents.send( 'untilt' )

	}

}

const registerTilt = async () => {

	let leftKey
	let rightKey
	const tiltAngle = Number.parseInt( preferences.value( 'mouse.tiltAngle' ), 10 )
	const tiltToggle = checkboxTrue( preferences.value( 'mouse.tiltToggle' ), 'tiltToggle' )
	const tiltLeft = preferences.value( 'mouse.tiltLeft' )
	const tiltRight = preferences.value( 'mouse.tiltRight' )

	log.info( 'Setting: Tilt' )
	ioHook = await iohook.importIoHook()

	if ( Object.prototype.hasOwnProperty.call( keycode, tiltLeft ) ) {

		leftKey = Number.parseInt( keycode[tiltLeft], 10 )

		if ( tiltToggle ) {

			ioHook.registerShortcut(
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

			ioHook.registerShortcut(
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

			ioHook.registerShortcut(
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

			ioHook.registerShortcut(
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
		ioHook.start()

	}

}

const registerSaveWindowBounds = () => {

	mainWindow.on( 'move', () => {

		setBounds( mainWindow )

	} )

}

const registerStartOnBoot = () => {

	// Start app on boot
	if ( !is.development && checkboxTrue( preferences.value( 'app.boot' ), 'boot' ) ) {

		app.setLoginItemSettings( {
			openAtLogin: true,
		} )

	} else {

		app.setLoginItemSettings( {
			openAtLogin: false,
		} )

	}

}

const registerEvents = () => {

	// Sync preferences to renderer
	preferences.on( 'save', options => {

		console.log( options.app )
		syncSettings( options )

	} )

	// Sync preferences to renderer
	preferences.on( 'click', key => {

		switch ( key ) {

			case 'chooseCrosshair':
				openChooserWindow()
				break
			case 'resetPreferences':
				resetPreferences()
				break
			case 'resetApp':
				resetApp()
				break
			default:
				// Key not found
				break

		}

	} )

	// Reopen settings/chooser if killed
	chooserWindow.on( 'close', async () => {

		windows.showHideWindow()
		await windows.createChooser()
		registerEvents()
		mainWindow.show()

	} )

	// Close windows if clicked away (mac only)
	if ( !is.development ) {

		chooserWindow.on( 'blur', () => {

			windows.hideChooserWindow()

		} )

	}

}

const registerIpc = () => {

	/* IP Communication */
	ipcMain.on( 'log', ( _event, arg ) => {

		log.info( arg )

	} )

	ipcMain.on( 'reset_preferences', ( _event, _arg ) => {

		log.info( 'RESET' )

	} )

	ipcMain.on( 'open_chooser', _ => {

		openChooserWindow()

	} )

	ipcMain.on( 'open_settings', _ => {

		openSettingsWindow()

	} )

	ipcMain.on( 'close_chooser', _ => {

		windows.hideChooserWindow()

	} )

	ipcMain.on( 'close_window', event => {

		// Close a shadow window
		windows.closeShadow( event.sender.id )

	} )

	ipcMain.on( 'focus_window', _ => {

		mainWindow.focus()

	} )

	ipcMain.on( 'save_custom_image', ( event, arg ) => {

		log.info( `Setting custom image: ${arg}` )
		save.custom( arg )

	} )

	ipcMain.on( 'get_crosshairs', async _ => {

		// Setup crosshair chooser, must come before the check below
		if ( chooserWindow ) {

			chooserWindow.webContents.send( 'load_crosshairs', {
				crosshairs: await helpers.getCrosshairImages(),
				current: preferences.value( 'crosshair.crosshair' ),
			} )

		}

	} )

	ipcMain.on( 'save_crosshair', ( event, arg ) => {

		save.crosshair( arg )

	} )

	ipcMain.on( 'center_window', () => {

		log.info( 'Center window' )
		sound.play( 'CENTER' )
		windows.center()

	} )

	ipcMain.on( 'restart_app', () => {

		autoUpdater.quitAndInstall()

	} )

	ipcMain.on( 'quit', () => {

		app.quit()

	} )

	// Used for testing
	ipcMain.handle( 'invoke_test', async ( event, arg ) => {

		console.log( 'invoke_test', arg )

		return 'ok'

	} )

	ipcMain.on( 'move_window', arg => {

		windows.moveWindow( arg )

	} )

	ipcMain.on( 'play_sound', arg => {

		sound.play( arg )

	} )

	ipcMain.on( 'set_preference', arg => {

		if ( arg.key && arg.value ) {

			preferences.value( arg.key, arg.value )

		}

	} )

}

const setTheme = theme => {

	const THEME_VALUES = [ 'light', 'dark', 'system' ]
	nativeTheme.themeSource = THEME_VALUES.includes( theme ) ? theme : DEFAULT_THEME

	return nativeTheme.shouldUseDarkColors

}

const notification = options => {

	if ( checkboxTrue( preferences.value( 'app.notify' ), 'notify' ) ) {

		mainWindow.webContents.send( 'notify', options )

	}

}

const syncSettings = options => {

	log.info( 'Sync options' )

	setTheme( options?.app?.theme )

	if ( options?.crosshair?.crosshair ) {

		save.crosshair( options.crosshair.crosshair )

	}

	windows.each( win => {

		save.color( options?.crosshair?.color, win )
		save.opacity( options?.crosshair?.opacity, win )
		save.sight( options?.crosshair?.reticle, win )
		save.size( options?.crosshair?.size, win )

	} )

	// Reset all custom shortcuts
	const escapeActive = globalShortcut.isRegistered( 'Escape' )
	globalShortcut.unregisterAll()
	if ( escapeActive ) {

		globalShortcut.register( 'Escape', escapeAction )

	}

	shortcut.registerShortcuts()

	registerStartOnBoot()

}

// Const resetPreference = key => {

// 	try {

// 		const [ groupId, id ] = key.split( '.' )
// 		const group = preferences.defaults[groupId]
// 		const defaultValue = group[id]

// 		log.info( `Setting default value ${defaultValue} for ${key}` )
// 		preferences.value( key, defaultValue )

// 	} catch ( error ) {

// 		log.warn( error )

// 	}

// }

// Temp until implemented in electron-preferences
const resetPreferences = () => {

	const { defaults } = preferences
	for ( const [ key, value ] of Object.entries( defaults ) ) {

		preferences.value( key, value )

	}

}

const resetApp = async skipSetup => {

	sound.play( 'RESET' )

	// Close extra crosshairs
	windows.closeAllShadows()

	// Hides chooser and preferences
	escapeAction()
	resetPreferences()
	windows.center( { targetWindow: mainWindow } )

	if ( !skipSetup ) {

		iohook.unregisterIOHook()

		globalShortcut.unregisterAll()
		// IpcMain.removeAllListeners()
		mainWindow.removeAllListeners( 'move' )

		setupApp( true )

	}

}

const setupApp = async triggeredFromReset => {

	// Preferences
	preferences.value( 'hidden.showSettings', false )

	// IPC
	registerIpc()

	// Start on boot
	registerStartOnBoot()

	// Set to previously selected crosshair
	const currentCrosshair = preferences.value( 'crosshair.crosshair' )

	if ( currentCrosshair ) {

		log.info( `Set crosshair: ${currentCrosshair}` )
		mainWindow.webContents.send( 'set_crosshair', currentCrosshair )

	}

	save.color( preferences.value( 'crosshair.color' ) )
	save.opacity( preferences.value( 'crosshair.opacity' ) )
	save.sight( preferences.value( 'crosshair.reticle' ) )
	save.size( preferences.value( 'crosshair.size' ) )

	// Center app by default - set position if exists
	if ( preferences.value( 'hidden.positionX' ) !== null && typeof preferences.value( 'hidden.positionX' ) !== 'undefined' ) {

		save.position( preferences.value( 'hidden.positionX' ), preferences.value( 'hidden.positionY' ) )

	}

	// Set lock state, timeout makes it pretty
	setTimeout( () => {

		// Keyboard shortcuts - delay fixes an unbreakable loop on reset, continually triggering resets
		shortcut.registerShortcuts()

		const locked = preferences.value( 'hidden.locked' )

		lockWindow( locked )

		// Show on first load if unlocked (unlocking shows already)
		// if locked we have to call show() if another window has focus
		if ( locked ) {

			mainWindow.show()

		}

	}, 500 )

	if ( !chooserWindow ) {

		chooserWindow = await windows.createChooser( currentCrosshair )

	}

	// Window Events after windows are created
	registerEvents()

	// Allow command-line reset
	if ( process.env.CROSSOVER_RESET && !triggeredFromReset ) {

		log.info( 'Command-line reset triggered' )
		resetApp( true )

	}

	mainWindow.focus()

}

const setupShadowWindow = async shadow => {

	shadow.webContents.send( 'add_class', 'shadow' )
	shadow.webContents.send( 'set_crosshair', preferences.value( 'crosshair.crosshair' ) )
	save.color( preferences.value( 'crosshair.color' ), shadow )
	save.opacity( preferences.value( 'crosshair.opacity' ), shadow )
	save.sight( preferences.value( 'crosshair.reticle' ), shadow )
	save.size( preferences.value( 'crosshair.size' ), shadow )
	if ( preferences.value( 'hidden.positionX' ) > -1 ) {

		console.log( 'setting' )

		// Offset position slightly
		save.position( preferences.value( 'hidden.positionX' ) + ( windows.shadowWindows.size * SHADOW_WINDOW_OFFSET ), preferences.value( 'hidden.positionY' ) + ( windows.shadowWindows.size * SHADOW_WINDOW_OFFSET ), shadow )

	}

	lockWindow( preferences.value( 'hidden.locked' ), shadow )

}

// Opening 2nd instance focuses app
app.on( 'second-instance', async () => {

	if ( mainWindow ) {

		setupShadowWindow( await windows.createShadow() )

		if ( mainWindow.isMinimized() ) {

			mainWindow.restore()

		}

		mainWindow.show()

		toggleWindowLock( false )

	}

} )

app.on( 'will-quit', () => {

	// Unregister all shortcuts.
	iohook.unregisterIOHook()
	globalShortcut.unregisterAll()

} )

// Sending a `SIGINT` (e.g: Ctrl-C) to an Electron app that registers
// a `beforeunload` window event handler results in a disconnected white
// browser window in GNU/Linux and macOS.
// The `before-quit` Electron event is triggered in `SIGINT`, so we can
// make use of it to ensure the browser window is completely destroyed.
// See https://github.com/electron/electron/issues/5273
app.on( 'before-quit', () => {

	app.releaseSingleInstanceLock()
	process.exit( EXIT_CODES.SUCCESS )

} )

app.on( 'window-all-closed', app.quit )

app.on( 'activate', async () => {

	if ( !mainWindow ) {

		mainWindow = await windows.init()

	}

} )

const ready = async () => {

	log.info( 'App ready' )

	/* MENU */
	const preferencesMenu = {
		label: 'Preferences…',
		accelerator: 'CommandOrControl+,',
		click() {

			openSettingsWindow()

		},
	}

	const openCustomImageMenu = {
		label: 'Custom Image…',
		accelerator: 'Command+O',
		async click() {

			// Open dialog
			await dialog.showOpenDialog( {
				title: 'Select Custom Image',
				message: 'Choose an image file to load into CrossOver',
				filters: FILE_FILTERS,
				properties: [ 'openFile', 'dontAddToRecent' ],
			} ).then( result => {

				const image = result.filePaths?.[0]

				if ( image ) {

					save.custom( image )

					mainWindow.webContents.send( 'notify', { title: 'Crosshair Changed', body: 'Your custom crosshair was loaded.' } )

				}

			} ).catch( log.info )

		},
	}

	const macosTemplate = [
		appMenu( [
			preferencesMenu,
			openCustomImageMenu,
		] ),
		{
			role: 'fileMenu',
		},
		{
			role: 'windowMenu',
		},
		{
			role: 'help',
			submenu: helpSubmenu,
		},
	]

	// Linux and Windows
	const otherTemplate = [ {
		role: 'fileMenu',
		submenu: [
			preferencesMenu,
			openCustomImageMenu,
			{
				type: 'separator',
			},
			{
				role: 'quit',
			},
		],
	},
	{
		role: 'help',
		submenu: helpSubmenu,
	} ]

	const template = process.platform === 'darwin' ? macosTemplate : otherTemplate

	if ( is.development ) {

		template.push( {
			label: 'Debug',
			submenu: debugSubmenu,
		} )

	}

	Menu.setApplicationMenu( Menu.buildFromTemplate( template ) )

	mainWindow = await windows.init()

	// Values include normal, floating, torn-off-menu, modal-panel, main-menu, status, pop-up-menu, screen-saver
	mainWindow.setAlwaysOnTop( true, 'screen-saver' )
	// Log.info( mainWindow.getNativeWindowHandle() )

	sound.preload()

	/* AUTO-UPDATE */
	appUpdate()

	/* Press Play >>> */
	setupApp()

	console.timeEnd( 'init' )

}

module.exports = async () => {

	await app.whenReady()

	// Added 400 ms to fix the black background issue while using transparent window. More detais at https://github.com/electron/electron/issues/15947
	setTimeout( ready, 400 )

}
