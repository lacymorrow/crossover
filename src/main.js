/* eslint unicorn/prefer-module: 0 */
/*
	Changed:
		#20 Custom keybinds
		#85 turn off updates
		#84 Mouse hooks
		#70 Performance settings - gpu
		#86 start on boot
		#88 allow disable keybinds
		hide settings on blur

	High:
		test window placement on windows/mac
		fix unhandled #81

	Medium:
		polish menu
		Custom crosshair should be a setting
		shadow window bug on move to next display

	Low:
		Define preferences browserwindowoverrdes in main.js, make main a parent window
		Conflicting accelerator on Fedora
		Improve escapeAction to be window-aware
		dont setPosition if monitor has been unplugged
*/

// const NativeExtension = require('bindings')('NativeExtension');

const fs = require( 'fs' )
const path = require( 'path' )
const electron = require( 'electron' )
const process = require( 'process' )

const { app, ipcMain, globalShortcut, BrowserWindow, Menu, screen, shell } = electron
const { autoUpdater } = require( 'electron-updater' )
const { activeWindow, appMenu, centerWindow, getWindowBoundsCentered, is } = require( 'electron-util' )
const unhandled = require( 'electron-unhandled' )
const debug = require( 'electron-debug' )
const keycode = require( './keycode.js' )
const { checkboxTrue, debounce } = require( './util.js' )
const { APP_HEIGHT, APP_WIDTH, MAX_SHADOW_WINDOWS, SETTINGS_WINDOW_DEVTOOLS, SHADOW_WINDOW_OFFSET, SUPPORTED_IMAGE_FILE_TYPES } = require( './config.js' )
const { debugSubmenu, helpSubmenu } = require( './menu.js' )
const prefs = require( './preferences.js' )

let ioHook // Dynamic Import
const importIoHook = async () => {

	// Dynamically require ioHook
	// We do this in case it gets flagged by anti-cheat

	if ( !ioHook ) {

		ioHook = await require( 'iohook' )

	}

	return ioHook

}

// Const contextMenu = require('electron-context-menu')
// contextMenu()

unhandled()
debug( {
	showDevTools: is.development && !is.linux,
	devToolsMode: 'undocked',
} )

// Electron reloader is janky sometimes
// try {
//  require( 'electron-reloader' )( module )
// } catch {}

/* App setup */

// Note: Must match `build.appId` in package.json
app.setAppUserModelId( 'com.lacymorrow.crossover' )

// Prevent multiple instances of the app
if ( !app.requestSingleInstanceLock() ) {

	app.quit()

}

// Auto-Updater
// Uncomment this before publishing your first version.
// It's commented out as it throws an error if there are no published versions.
try {

	if ( !is.development && !is.linux && checkboxTrue( prefs.value( 'app.updates' ), 'updates' ) ) {

		console.log( 'Setting: Automatic Updates' )

		const FOUR_HOURS = 1000 * 60 * 60 * 4
		setInterval( () => {

			autoUpdater.checkForUpdates()

		}, FOUR_HOURS )

		autoUpdater.checkForUpdates()

	}

} catch {}

// Fix for Linux transparency issues
if ( is.linux || !checkboxTrue( prefs.value( 'app.gpu' ), 'gpu' ) ) {

	// Disable hardware acceleration
	console.log( 'Setting: Disable GPU' )
	app.commandLine.appendSwitch( 'enable-transparent-visuals' )
	app.commandLine.appendSwitch( 'disable-gpu' )
	app.disableHardwareAcceleration()

}

// Prevent window from being garbage collected
let mainWindow
let chooserWindow
let prefsWindow
const shadowWindows = new Set()
let windowHidden = false // Maintain hidden state

// __static path
const __static = path.join( __dirname, '/static' ).replace( /\\/g, '\\\\' )

// Crosshair images
const crosshairsPath = path.join( __static, 'crosshairs' )

const createMainWindow = async isShadowWindow => {

	const options = {
		title: app.name,
		titleBarStyle: 'customButtonsOnHover',
		backgroundColor: '#00FFFFFF',
		acceptFirstMouse: true,
		alwaysOnTop: true,
		frame: false,
		hasShadow: false,
		closable: true,
		fullscreenable: false,
		maximizable: false,
		minimizable: false,
		resizable: false,
		skipTaskbar: false,
		transparent: true,
		useContentSize: true,
		show: false,
		width: APP_WIDTH,
		height: APP_HEIGHT,
		webPreferences: {
			contextIsolation: !is.linux,
			enableRemoteModule: true,
			nodeIntegration: false,
			preload: path.join( __dirname, 'preload.js' ),

		},
	}

	if ( is.windows ) {

		options.type = 'toolbar'

	}

	const win = new BrowserWindow( options )

	// Enables staying on fullscreen apps for macos https://github.com/electron/electron/pull/11599
	setDockVisible( false )
	win.setFullScreenable( false )

	// VisibleOnFullscreen removed in https://github.com/electron/electron/pull/21706
	win.setVisibleOnAllWorkspaces( true, { visibleOnFullScreen: true } )

	// SetDockVisible( true )

	if ( isShadowWindow ) {

		// Duplicate shadow windows
		win.once( 'ready-to-show', () => {

			win.show()

		} )

		win.on( 'closed', () => {

			// Dereference the window
			shadowWindows.delete( win )

		} )

	} else {

		win.on( 'closed', () => {

			// Dereference the window
			// For multiple windows store them in an array
			mainWindow = undefined

			// Quit if main window closed
			app.quit()

		} )

	}

	await win.loadFile( path.join( __dirname, 'index.html' ) )

	return win

}

const createChildWindow = async ( parent, windowName ) => {

	const VALID_WINDOWS = [ 'chooser' ]

	const options = {
		parent,
		modal: true,
		show: false,
		type: 'toolbar',
		frame: prefs.value( 'hidden.frame' ),
		hasShadow: true,
		titleBarStyle: 'customButtonsOnHover',
		fullscreenable: false,
		maximizable: false,
		minimizable: false,
		transparent: true,
		width: 600,
		height: 400,
		webPreferences: {
			nodeIntegration: false, // Is default value after Electron v5
			contextIsolation: true, // Protect against prototype pollution
			enableRemoteModule: true, // Turn off remote
			preload: path.join( __dirname, `preload-${windowName}.js` ),
		},
	}

	if ( !VALID_WINDOWS.includes( windowName ) ) {

		return

	}

	const win = new BrowserWindow( options )

	await win.loadFile( path.join( __dirname, `${windowName}.html` ) )

	return win

}

const createShadowWindow = async () => {

	// Don't allow a bunch of crosshairs, max 20
	if ( shadowWindows.size < MAX_SHADOW_WINDOWS ) {

		const shadow = await createMainWindow( true )
		shadowWindows.add( shadow )
		setupShadowWindow( shadow )

		console.log( `Created shadow window: ${shadow.webContents.id}` )

	}

}

const closeShadowWindows = id => {

	for ( const currentWindow of shadowWindows ) {

		if ( !id || id === currentWindow.webContents.id ) {

			currentWindow.close()

		}

	}

}

const getActiveWindow = () => {

	let currentWindow = activeWindow()
	if ( !shadowWindows.has( currentWindow ) && currentWindow !== mainWindow ) {

		// Not shadow and not main window, probably a console or dialog
		currentWindow = mainWindow

	}

	return currentWindow

}

// Save position
const saveBounds = debounce( win => {

	if ( !win ) {

		win = mainWindow

	}

	const bounds = win.getBounds()
	console.log( `Save bounds: ${bounds.x}, ${bounds.y}` )
	prefs.value( 'hidden.positionX', bounds.x )
	prefs.value( 'hidden.positionY', bounds.y )

}, 1000 )

const getCrosshairImages = async () => {

	// How many levels deep to recurse
	const crosshairsObject = await getImages( crosshairsPath, 2 )

	return crosshairsObject

}

const getImages = ( directory, level ) => new Promise( ( resolve, reject ) => {

	const crosshairs = []
	fs.promises.readdir( directory, async ( error, dir ) => {

		if ( error ) {

			reject( new Error( `Promise Errored: ${error}`, directory ) )

		}

		for ( let i = 0, filepath;
			( filepath = dir[i] ); i++ ) {

			const stat = fs.lstatSync( path.join( directory, filepath ) )

			if ( stat.isDirectory() && level > 0 ) {

				const next = await getImages( path.join( directory, filepath ), level - 1 ) // eslint-disable-line no-await-in-loop
				crosshairs.push( next )

			} else if ( stat.isFile() && !/^\..*|.*\.docx$/.test( filepath ) ) {

				// Filename
				crosshairs.push( path.join( directory, filepath ) )

			}

		}

		resolve( crosshairs )

	} )

} )

const setColor = ( color, targetWindow = mainWindow ) => {

	targetWindow.webContents.send( 'set_color', color )

}

const setOpacity = ( opacity, targetWindow = mainWindow ) => {

	targetWindow.webContents.send( 'set_opacity', opacity )

}

const setPosition = ( posX, posY, targetWindow = mainWindow ) => {

	if ( posX === null || posY === null || typeof posX === 'undefined' || typeof posY === 'undefined' ) {

		return

	}

	targetWindow.setBounds( { x: posX, y: posY } )

	if ( targetWindow === mainWindow ) {

		console.log( 'Save XY:', posX, posY )
		prefs.value( 'hidden.positionX', posX )
		prefs.value( 'hidden.positionY', posY )

	}

}

const setSight = ( sight, targetWindow = mainWindow ) => {

	targetWindow.webContents.send( 'set_sight', sight )

}

const setSize = ( size, targetWindow = mainWindow ) => {

	targetWindow.webContents.send( 'set_size', size )

}

// Hides the app from the dock and CMD+Tab, necessary for staying on top macOS fullscreen windows
const setDockVisible = visible => {

	if ( is.macos ) {

		if ( visible ) {

			app.dock.show()

		} else {

			app.dock.hide()

		}

	}

}

const centerAppWindow = options => {

	options = {
		display: screen.getDisplayNearestPoint( screen.getCursorScreenPoint() ),
		targetWindow: getActiveWindow(),
		...options,
	}

	// Electron way
	// MainWindow.hide()
	// options.targetWindow.center()
	// const bounds = options.targetWindow.getBounds()

	// This is the Sindre way
	centerWindow( {
		window: options.targetWindow,
		animated: true,
		useFullBounds: true,
	} )

	options.targetWindow.show()

	// Save game
	if ( options.targetWindow === mainWindow ) {

		saveBounds( mainWindow )

	}

}

const showWindow = () => {

	mainWindow.show()
	for ( const currentWindow of shadowWindows ) {

		currentWindow.show()

	}

	windowHidden = false

}

const hideWindow = () => {

	mainWindow.hide()
	for ( const currentWindow of shadowWindows ) {

		currentWindow.hide()

	}

	windowHidden = true

}

const showHideWindow = () => {

	// Hide all crosshair windows in place
	if ( windowHidden ) {

		showWindow()

	} else {

		hideWindow()

	}

	windowHidden = !windowHidden

}

const toggleWindowLock = ( lock = !prefs.value( 'hidden.locked' ) ) => {

	lockWindow( lock )
	for ( const currentWindow of shadowWindows ) {

		lockWindow( lock, currentWindow )

	}

}

// Allows dragging and setting options
const lockWindow = ( lock, targetWindow = mainWindow ) => {

	console.log( `Locked: ${lock}` )

	hideChooserWindow()
	hideSettingsWindow()
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
		const followMouse = checkboxTrue( prefs.value( 'mouse.followMouse' ), 'followMouse' )
		const hideOnMouse = Number.parseInt( prefs.value( 'mouse.hideOnMouse' ), 10 )
		const hideOnKey = prefs.value( 'mouse.hideOnKey' )
		const tilt = checkboxTrue( prefs.value( 'mouse.tiltEnable' ), 'tiltEnable' )

		unregisterIOHook()

		if ( followMouse ) {

			registerFollowMouse()

		}

		if ( hideOnMouse !== -1 ) {

			registerHideOnMouse()

		}

		if ( hideOnKey ) {

			registerHideOnKey()

		}

		if ( tilt && ( prefs.value( 'mouse.tiltLeft' ) || prefs.value( 'mouse.tiltRight' ) ) ) {

			registerTilt()

		}

		targetWindow.setAlwaysOnTop( true, 'screen-saver' )

	} else {

		// Unregister
		unregisterIOHook()

		// Enable saving bounds
		if ( targetWindow === mainWindow ) {

			registerSaveWindowBounds()

		}

		// Allow dragging to Window on Mac
		targetWindow.setAlwaysOnTop( true, 'pop-up-menu' )

		// Bring window to front
		targetWindow.show()

	}

	prefs.value( 'hidden.locked', lock )

}

// Switch window type when hiding chooser
const hideChooserWindow = () => {

	if ( chooserWindow ) {

		chooserWindow.hide()

	}

}

// Switch window type when hiding chooser
const hideSettingsWindow = () => {

	if ( prefsWindow && prefsWindow.isVisible() ) {

		prefs.value( 'hidden.showSettings', false )
		prefsWindow.close()
		prefsWindow = null

	}

}

const openChooserWindow = async () => {

	// Don't do anything if locked
	if ( prefs.value( 'hidden.locked' ) ) {

		return

	}

	hideSettingsWindow()

	if ( !chooserWindow ) {

		chooserWindow = await createChooser()

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
		// Windows
		const bounds = getWindowBoundsCentered( { window: chooserWindow, useFullBounds: true } )
		const mainBounds = mainWindow.getBounds()
		chooserWindow.setBounds( { x: bounds.x, y: mainBounds.y + mainBounds.height + 1 } )

	}

}

const openSettingsWindow = async () => {

	// Don't do anything if locked
	if ( prefs.value( 'hidden.locked' ) ) { //  || prefs.value( 'hidden.showSettings' )

		return

	}

	if ( prefs.value( 'hidden.showSettings' ) ) {

		// Hide if already visible
		return escapeAction()

	}

	hideChooserWindow()

	// Create shortcut to close window
	if ( !globalShortcut.isRegistered( 'Escape' ) ) {

		globalShortcut.register( 'Escape', escapeAction )

	}

	prefsWindow = prefs.show()

	// Set events on prefs window
	if ( prefsWindow ) {

		// Hide window when clicked away
		prefsWindow.on( 'blur', () => {

			if ( !SETTINGS_WINDOW_DEVTOOLS ) {

				hideSettingsWindow()

			}

		} )

		// Force opening URLs in the default browser (remember to use `target="_blank"`)
		prefsWindow.webContents.on( 'new-window', ( event, url ) => {

			event.preventDefault()
			shell.openExternal( url )

		} )

		// Track window state
		prefsWindow.on( 'closed', () => {

			prefs.value( 'hidden.showSettings', false )
			prefsWindow = null

		} )

		prefsWindow.setAlwaysOnTop( true, 'pop-up-menu' )

		// Modal placement is different per OS
		if ( is.macos ) {

			const bounds = mainWindow.getBounds()
			prefsWindow.setBounds( { y: bounds.y + APP_HEIGHT } )

		} else {

			// Windows
			const bounds = getWindowBoundsCentered( { window: prefsWindow, useFullBounds: true } )
			const mainBounds = mainWindow.getBounds()
			prefsWindow.setBounds( { x: bounds.x, y: mainBounds.y + mainBounds.height + 1 } )

		}

		prefs.value( 'hidden.showSettings', true )

	}

}

const moveWindow = options => {

	options = {
		direction: 'none',
		targetWindow: getActiveWindow(),
		...options,
	}

	const saveSettings = options.targetWindow === mainWindow
	const locked = prefs.value( 'hidden.locked' )

	if ( !locked ) {

		console.log( 'Move', options.direction )
		let newBound
		const bounds = options.targetWindow.getBounds()
		switch ( options.direction ) {

			case 'up':
				newBound = bounds.y - 1
				options.targetWindow.setBounds( { y: newBound } )
				if ( saveSettings ) {

					prefs.value( 'hidden.positionY', newBound )

				}

				break
			case 'down':
				newBound = bounds.y + 1
				options.targetWindow.setBounds( { y: newBound } )
				if ( saveSettings ) {

					prefs.value( 'hidden.positionY', newBound )

				}

				break
			case 'left':
				newBound = bounds.x - 1
				options.targetWindow.setBounds( { x: newBound } )
				if ( saveSettings ) {

					prefs.value( 'hidden.positionX', newBound )

				}

				break
			case 'right':
				newBound = bounds.x + 1
				options.targetWindow.setBounds( { x: newBound } )
				if ( saveSettings ) {

					prefs.value( 'hidden.positionX', newBound )

				}

				break
			default:
				break

		}

	}

}

const moveWindowToNextDisplay = options => {

	options = {
		targetWindow: getActiveWindow(),
		...options,
	}

	// Get list of displays
	const displays = screen.getAllDisplays()

	// Get current display
	const currentDisplay = screen.getDisplayNearestPoint( options.targetWindow.getBounds() )

	// Get index of current
	let index = displays.map( element => element.id ).indexOf( currentDisplay.id )

	// Increment and save
	index = ( index + 1 ) % displays.length

	centerAppWindow( { display: displays[index], targetWindow: options.targetWindow } )

}

const escapeAction = () => {

	console.log( 'Escape event' )

	hideChooserWindow()
	hideSettingsWindow()
	globalShortcut.unregister( 'Escape' )

}

const registerFollowMouse = async () => {

	// Prevent saving bounds
	mainWindow.removeAllListeners( 'move' )

	console.log( 'Setting: Mouse Follow' )
	ioHook = await importIoHook()
	ioHook.removeAllListeners( 'mousemove' )

	// Unregister

	// Register
	ioHook.on( 'mousemove', event => {

		mainWindow.setBounds( {
			x: event.x - ( APP_WIDTH / 2 ),
			y: event.y - ( APP_HEIGHT / 2 ),
		} )

	} )

}

const registerHideOnMouse = async () => {

	console.log( 'Setting: Mouse Hide' )
	ioHook = await importIoHook()

	const mouseButton = Number.parseInt( prefs.value( 'mouse.hideOnMouse' ), 10 )

	// Register
	ioHook.on( 'mousedown', event => {

		if ( event.button === mouseButton ) {

			hideWindow()

		}

	} )

	ioHook.on( 'mouseup', event => {

		if ( event.button === mouseButton ) {

			showWindow()

		}

	} )

	// Register and start hook
	ioHook.start()

}

const registerHideOnKey = async () => {

	console.log( 'Setting: Keyboard Hide' )
	ioHook = await importIoHook()

	const hideOnKey = prefs.value( 'mouse.hideOnKey' )

	if ( Object.prototype.hasOwnProperty.call( keycode, hideOnKey ) ) {

		const key = keycode[hideOnKey]

		// Register
		ioHook.registerShortcut(
			[ key ],
			_ => {

				hideWindow()

			},
			_ => {

				showWindow()

			},
		)

		// Register and start hook
		ioHook.start()

	}

}
const tiltCrosshair = (angle) => {
	if (!angle) {
		mainWindow.webContents.send( 'untilt' )
	} else {
		mainWindow.webContents.send( 'tilt', angle )
	}
}

const registerTilt = async () => {

	let leftKey
	let rightKey
	const tiltAngle = Number.parseInt( prefs.value( 'mouse.tiltAngle' ), 10 )
	const tiltToggle = checkboxTrue( prefs.value( 'mouse.tiltToggle' ), 'tiltToggle' )
	const tiltLeft = prefs.value( 'mouse.tiltLeft' )
	const tiltRight = prefs.value( 'mouse.tiltRight' )

	console.log( 'Setting: Tilt' )
	ioHook = await importIoHook()

	if ( Object.prototype.hasOwnProperty.call( keycode, tiltLeft ) ) {

		leftKey = Number.parseInt( keycode[tiltLeft], 10 )

		if (tiltToggle){
			ioHook.registerShortcut(
				[ leftKey ],
				_ => {

					const tilted = prefs.value( 'hidden.tilted' )
					tilted ? tiltCrosshair(0) : tiltCrosshair( tiltAngle * -1 )
					prefs.value( 'hidden.tilted', !tilted )

				}
			)
		} else {
			ioHook.registerShortcut(
				[ leftKey ],
				_ => {

					tiltCrosshair( tiltAngle * -1 )

				},
				_ => {

					tiltCrosshair(0)

				},
			)
		}

	}

	if ( Object.prototype.hasOwnProperty.call( keycode, tiltRight ) ) {

		rightKey = Number.parseInt( keycode[tiltRight], 10 )

		if (tiltToggle){
			ioHook.registerShortcut(
				[ rightKey ],
				_ => {

					const tilted = prefs.value( 'hidden.tilted' )
					tilted ? tiltCrosshair(0) : tiltCrosshair( tiltAngle )
					prefs.value( 'hidden.tilted', !tilted )

				}
			)
		} else {
			ioHook.registerShortcut(
				[ rightKey ],
				_ => {

					tiltCrosshair( tiltAngle )

				},
				_ => {

					tiltCrosshair(0)

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

		saveBounds( mainWindow )

	} )

}

const registerStartOnBoot = () => {

	// Start app on boot
	if ( !is.development && checkboxTrue( prefs.value( 'app.boot' ), 'boot' ) ) {

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

	// Sync prefs to renderer
	prefs.on( 'save', preferences => {

		syncSettings( preferences )

	} )

	// Reopen settings/chooser if killed
	chooserWindow.on( 'close', async () => {

		showHideWindow()
		await createChooser()
		registerEvents()
		mainWindow.show()

	} )

	// Close windows if clicked away (mac only)
	if ( !is.development ) {

		chooserWindow.on( 'blur', () => {

			hideChooserWindow()

		} )

	}

}

const registerIpc = () => {

	/* IP Communication */
	ipcMain.on( 'log', ( event, arg ) => {

		console.log( arg )

	} )

	ipcMain.on( 'open_chooser', _ => {

		openChooserWindow()

	} )

	ipcMain.on( 'open_settings', _ => {

		openSettingsWindow()

	} )

	ipcMain.on( 'close_chooser', _ => {

		hideChooserWindow()

	} )

	ipcMain.on( 'close_window', event => {

		// Close a shadow window
		closeShadowWindows( event.sender.id )

	} )

	ipcMain.on( 'save_custom_image', ( event, arg ) => {

		// Is it a file and does it have a supported extension?
		if ( fs.lstatSync( arg ).isFile() && SUPPORTED_IMAGE_FILE_TYPES.includes( path.extname( arg ) ) ) {

			console.log( `Save custom image: ${arg}` )
			mainWindow.webContents.send( 'set_custom_image', arg ) // Pass to renderer
			for ( const currentWindow of shadowWindows ) {

				currentWindow.webContents.send( 'set_custom_image', arg )

			}

			prefs.value( 'crosshair.crosshair', arg )
			hideChooserWindow()

		}

	} )

	ipcMain.on( 'get_crosshairs', async _ => {

		// Setup crosshair chooser, must come before the check below
		if ( chooserWindow ) {

			chooserWindow.webContents.send( 'load_crosshairs', {
				crosshairs: await getCrosshairImages(),
				current: prefs.value( 'crosshair.crosshair' ),
			} )

		}

	} )

	ipcMain.on( 'save_crosshair', ( event, arg ) => {

		if ( arg ) {

			console.log( `Save crosshair: ${arg}` )
			hideChooserWindow()
			mainWindow.webContents.send( 'set_crosshair', arg ) // Pass to renderer
			for ( const currentWindow of shadowWindows ) {

				currentWindow.webContents.send( 'set_crosshair', arg )

			}

			prefs.value( 'crosshair.crosshair', arg )

		} else {

			console.log( 'Not setting null crosshair.' )

		}

	} )

	ipcMain.on( 'center_window', () => {

		console.log( 'Center window' )
		centerAppWindow()

	} )

	ipcMain.on( 'quit', () => {

		app.quit()

	} )

}

const syncSettings = preferences => {

	console.log( 'Sync preferences' )

	setColor( preferences?.crosshair?.color )
	setOpacity( preferences?.crosshair?.opacity )
	setSight( preferences?.crosshair?.reticle )
	setSize( preferences?.crosshair?.size )

	// Reset all custom shortcuts
	const escapeActive = globalShortcut.isRegistered( 'Escape' )
	globalShortcut.unregisterAll()
	if ( escapeActive ) {

		globalShortcut.register( 'Escape', escapeAction )

	}

	registerShortcuts()

	registerStartOnBoot()

}

const keyboardShortcuts = () => {

	/* Default accelerator */
	const accelerator = 'Control+Shift+Alt'

	return [

		// Duplicate main window
		{

			action: 'duplicate',
			keybind: `${accelerator}+D`,
			fn: () => {

				createShadowWindow()

			},
		},

		// Toggle CrossOver
		{
			action: 'lock',
			keybind: `${accelerator}+X`,
			fn: () => {

				toggleWindowLock()

			},
		},

		// Center CrossOver
		{
			action: 'center',
			keybind: `${accelerator}+C`,
			fn: () => {

				centerAppWindow()

			},
		},

		// Hide CrossOver
		{
			action: 'hide',
			keybind: `${accelerator}+H`,
			fn: () => {

				showHideWindow()

			},
		},

		// Move CrossOver to next monitor
		{
			action: 'changeDisplay',
			keybind: `${accelerator}+M`,
			fn: () => {

				moveWindowToNextDisplay()

			},
		},

		// Reset CrossOver
		{
			action: 'reset',
			keybind: `${accelerator}+R`,
			fn: () => {

				resetApp()

			},
		},

		// About CrossOver
		// {
		// 	action: 'about',
		// 	keybind: `${accelerator}+A`,
		// 	fn: () => {

		// 		showAboutWindow( {
		// 			icon: path.join( __static, 'Icon.png' ),
		// 			copyright: `🎯 CrossOver ${app.getVersion()} | Copyright © Lacy Morrow`,
		// 			text: `A crosshair overlay for any screen. Feedback and bug reports welcome. Created by Lacy Morrow. Crosshairs thanks to /u/IrisFlame. ${is.development && ' | ' + debugInfo()} GPU: ${app.getGPUFeatureStatus().gpu_compositing}`
		// 		} )

		// 	}
		// },

		// Single pixel movement
		{
			action: 'moveUp',
			keybind: `${accelerator}+Up`,
			fn: () => {

				moveWindow( { direction: 'up' } )

			},
		},
		{
			action: 'moveDown',
			keybind: `${accelerator}+Down`,
			fn: () => {

				moveWindow( { direction: 'down' } )

			},
		},
		{
			action: 'moveLeft',
			keybind: `${accelerator}+Left`,
			fn: () => {

				moveWindow( { direction: 'left' } )

			},
		},
		{
			action: 'moveRight',
			keybind: `${accelerator}+Right`,
			fn: () => {

				moveWindow( { direction: 'right' } )

			},
		},
	]

}

const registerShortcuts = () => {

	// Register all shortcuts
	const { keybinds } = prefs.defaults
	const custom = prefs.value( 'keybinds' ) // Defaults
	for ( const shortcut of keyboardShortcuts() ) {

		// Custom shortcuts
		if ( custom[shortcut.action] === '' ) {

			console.log( `Clearing keybind for ${shortcut.action}` )

		} else if ( custom[shortcut.action] && keybinds[shortcut.action] && custom[shortcut.action] !== keybinds[shortcut.action] ) {

			// If a custom shortcut exists for this action
			console.log( `Custom keybind for ${shortcut.action}` )
			globalShortcut.register( custom[shortcut.action], shortcut.fn )

		} else if ( keybinds[shortcut.action] ) {

			// Set default keybind
			globalShortcut.register( keybinds[shortcut.action], shortcut.fn )

		} else {

			// Fallback to internal bind - THIS SHOULDNT HAPPEN
			// if it does you forgot to add a default keybind for this shortcut
			console.log( 'ERROR', shortcut )
			globalShortcut.register( shortcut.keybind, shortcut.fn )

		}

	}

}

const createChooser = async currentCrosshair => {

	if ( !currentCrosshair ) {

		currentCrosshair = prefs.value( 'crosshair.crosshair' )

	}

	chooserWindow = await createChildWindow( mainWindow, 'chooser' )

	// Setup crosshair chooser, must come before the check below
	chooserWindow.webContents.send( 'load_crosshairs', {
		crosshairs: await getCrosshairImages(),
		current: currentCrosshair,
	} )

	return chooserWindow

}

const unregisterIOHook = () => {

	if ( ioHook ) {

		ioHook.unregisterAllShortcuts()
		ioHook.removeAllListeners( 'mousedown' )
		ioHook.removeAllListeners( 'mouseup' )
		ioHook.removeAllListeners( 'mousemove' )

	}

}

// Temp until implemented in prefs
const resetPreferences = () => {

	const { defaults } = prefs
	for ( const [ key, value ] of Object.entries( defaults ) ) {

		prefs.value( key, value )

	}

}

const resetApp = async skipSetup => {

	// Close extra crosshairs
	closeShadowWindows()

	// Hides chooser and preferences
	escapeAction()
	resetPreferences()
	centerAppWindow( { targetWindow: mainWindow } )

	if ( !skipSetup ) {

		unregisterIOHook()

		globalShortcut.unregisterAll()
		// IpcMain.removeAllListeners()
		mainWindow.removeAllListeners( 'move' )

		setupApp( true )

	}

}

const setupApp = async triggeredFromReset => {

	// Preferences
	prefs.value( 'hidden.showSettings', false )

	// IPC
	registerIpc()

	// Start on boot
	registerStartOnBoot()

	// Set to previously selected crosshair
	const currentCrosshair = prefs.value( 'crosshair.crosshair' )

	if ( currentCrosshair ) {

		console.log( `Set crosshair: ${currentCrosshair}` )
		mainWindow.webContents.send( 'set_crosshair', currentCrosshair )

	}

	setColor( prefs.value( 'crosshair.color' ) )
	setOpacity( prefs.value( 'crosshair.opacity' ) )
	setSight( prefs.value( 'crosshair.reticle' ) )
	setSize( prefs.value( 'crosshair.size' ) )

	// Center app by default - set position if exists
	if ( prefs.value( 'hidden.positionX' ) !== null && typeof prefs.value( 'hidden.positionX' ) !== 'undefined' ) {

		setPosition( prefs.value( 'hidden.positionX' ), prefs.value( 'hidden.positionY' ) )

	}

	// Set lock state, timeout makes it pretty
	setTimeout( () => {

		// Keyboard shortcuts - delay fixes an unbreakable loop on reset, continually triggering resets
		registerShortcuts()

		const locked = prefs.value( 'hidden.locked' )

		lockWindow( locked )

		// Show on first load if unlocked (unlocking shows already)
		// if locked we have to call show() if another window has focus
		if ( locked ) {

			mainWindow.show()

		}

	}, 500 )

	if ( !chooserWindow ) {

		await createChooser( currentCrosshair )

	}

	// Window Events after windows are created
	registerEvents()

	// Allow command-line reset
	if ( process.env.CROSSOVER_RESET && !triggeredFromReset ) {

		console.log( 'Command-line reset triggered' )
		resetApp( true )

	}

}

const setupShadowWindow = async shadow => {

	shadow.webContents.send( 'add_class', 'shadow' )
	shadow.webContents.send( 'set_crosshair', prefs.value( 'crosshair.crosshair' ) )
	setColor( prefs.value( 'crosshair.color' ), shadow )
	setOpacity( prefs.value( 'crosshair.opacity' ), shadow )
	setSight( prefs.value( 'crosshair.reticle' ), shadow )
	setSize( prefs.value( 'crosshair.size' ), shadow )
	if ( prefs.value( 'hidden.positionX' ) > -1 ) {

		// Offset position slightly
		setPosition( prefs.value( 'hidden.positionX' ) + ( shadowWindows.size * SHADOW_WINDOW_OFFSET ), prefs.value( 'hidden.positionY' ) + ( shadowWindows.size * SHADOW_WINDOW_OFFSET ), shadow )

	}

	lockWindow( prefs.value( 'hidden.locked' ), shadow )

}

// Opening 2nd instance focuses app
app.on( 'second-instance', () => {

	if ( mainWindow ) {

		createShadowWindow()

		if ( mainWindow.isMinimized() ) {

			mainWindow.restore()

		}

		mainWindow.show()

		toggleWindowLock( false )

	}

} )

app.on( 'will-quit', () => {

	// Unregister all shortcuts.
	globalShortcut.unregisterAll()

} )

app.on( 'window-all-closed', () => {

	app.quit()

} )

app.on( 'activate', async () => {

	if ( !mainWindow ) {

		mainWindow = await createMainWindow()

	}

} )

const ready = async () => {

	console.log( 'App ready' )

	/* MENU */
	const macosTemplate = [
		appMenu( [
			{
				label: 'Preferences…',
				accelerator: 'Command+,',
				click() {

					openSettingsWindow()

				},
			},
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
	const otherTemplate = [
		{
			role: 'fileMenu',
			submenu: [
				{
					label: 'Settings',
					accelerator: 'Control+,',
					click() {

						openSettingsWindow()

					},
				},
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
		},
	]

	const template = process.platform === 'darwin' ? macosTemplate : otherTemplate

	if ( is.development ) {

		template.push( {
			label: 'Debug',
			submenu: debugSubmenu,
		} )

	}

	Menu.setApplicationMenu( Menu.buildFromTemplate( template ) )

	mainWindow = await createMainWindow()

	// Values include normal, floating, torn-off-menu, modal-panel, main-menu, status, pop-up-menu, screen-saver
	mainWindow.setAlwaysOnTop( true, 'screen-saver' )

	// Console.log( mainWindow.getNativeWindowHandle() )

	setupApp()

}

module.exports = async () => {

	await app.whenReady()

	// Added 400 ms to fix the black background issue while using transparent window. More detais at https://github.com/electron/electron/issues/15947
	setTimeout( ready, 400 )

}
