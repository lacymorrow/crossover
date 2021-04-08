'use strict'

// Conflicting accelerator on Fedora
// Improve escapeAction to be window-aware
// dont setPosition if monitor has been unplugged

// const NativeExtension = require('bindings')('NativeExtension');
const fs = require( 'fs' )
const path = require( 'path' )
const electron = require( 'electron' )
const { app, ipcMain, globalShortcut, BrowserWindow, Menu, screen } = electron
const { autoUpdater } = require( 'electron-updater' )
const { activeWindow, centerWindow, debugInfo, is, showAboutWindow } = require( 'electron-util' )
const unhandled = require( 'electron-unhandled' )
const debug = require( 'electron-debug' )
const { debounce } = require( './util' )
const { config, defaults, APP_HEIGHT, CHILD_WINDOW_OFFSET, MAX_SHADOW_WINDOWS, SHADOW_WINDOW_OFFSET, SUPPORTED_IMAGE_FILE_TYPES } = require( './config' )
const menu = require( './menu' )

// Maybe add settings here?
// Const contextMenu = require('electron-context-menu')
// contextMenu()

unhandled()
debug( {
	showDevTools: is.development && !is.linux,
	devToolsMode: 'undocked'
} )

// Uncomment this before publishing your first version.
// It's commented out as it throws an error if there are no published versions.
try {

	if ( !is.development && !is.linux ) {

		const FOUR_HOURS = 1000 * 60 * 60 * 4
		setInterval( () => {

			autoUpdater.checkForUpdates()

		}, FOUR_HOURS )

		autoUpdater.checkForUpdates()

	}

} catch {}

// Electron reloader is janky sometimes
// try {
// 	require( 'electron-reloader' )( module )
// } catch {}

/* App setup */

// Note: Must match `build.appId` in package.json
app.setAppUserModelId( 'com.lacymorrow.crossover' )

// Prevent multiple instances of the app
if ( !app.requestSingleInstanceLock() ) {

	app.quit()

}

// Fix for Linux transparency issues
if ( is.linux || config.get( 'app' ).DISABLE_GPU ) {

	// Disable hardware acceleration
	app.commandLine.appendSwitch( 'enable-transparent-visuals' )
	app.commandLine.appendSwitch( 'disable-gpu' )
	app.disableHardwareAcceleration()

}

// Prevent window from being garbage collected
let mainWindow
let chooserWindow
let settingsWindow
const shadowWindows = new Set()
let windowHidden = false // Maintain hidden state

// __static path
const __static = path.join( __dirname, '/static' ).replace( /\\/g, '\\\\' )

// Crosshair images
const crosshairsPath = path.join( __static, 'crosshairs' )

const createMainWindow = async isShadowWindow => {

	const preferences = {
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
		width: 200,
		height: APP_HEIGHT,
		webPreferences: {
			contextIsolation: !is.linux,
			enableRemoteModule: true,
			nodeIntegration: false, // We don't absolutely need this, but renderer require's some things
			preload: path.join( __dirname, 'preload.js' )

		}
	}

	if ( is.windows ) {

		preferences.type = 'toolbar'

	}

	const win = new BrowserWindow( preferences )

	setDockVisible( false )
	win.setFullScreenable( false )
	// VisibleOnFullscreen removed in https://github.com/electron/electron/pull/21706
	win.setVisibleOnAllWorkspaces( true, { visibleOnFullScreen: true } )
	// Enables staying on fullscreen apps - mac
	// setDockVisible( true )

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

	const VALID_WINDOWS = [ 'chooser', 'settings' ]

	const preferences = {
		parent,
		modal: true,
		show: false,
		type: 'toolbar',
		frame: config.get( 'app' ).WINDOW_FRAME,
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
			preload: path.join( __dirname, `preload-${windowName}.js` )
		}
	}

	if ( !VALID_WINDOWS.includes( windowName ) ) {

		return

	}

	if ( windowName === 'settings' ) {

		preferences.width = 200
		preferences.height = 250

	}

	const win = new BrowserWindow( preferences )

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

	shadowWindows.forEach( currentWindow => {

		if ( !id || id === currentWindow.webContents.id ) {

			currentWindow.close()

		}

	} )

}

const getActiveWindow = () => {

	let currentWindow = activeWindow()
	if ( !shadowWindows.has( currentWindow ) && currentWindow !== mainWindow ) {

		// Not shadow and not main window, probably a console or dialog
		currentWindow = mainWindow

	}

	return currentWindow

}

// Save position to settings
const saveBounds = debounce( win => {

	if ( !win ) {

		win = mainWindow

	}

	const bounds = win.getBounds()
	console.log( `Save bounds: ${bounds.x}, ${bounds.y}` )
	config.set( 'positionX', bounds.x )
	config.set( 'positionY', bounds.y )

}, 1000 )

const getCrosshairImages = async () => {

	// How many levels deep to recurse
	const crosshairsObject = await getImages( crosshairsPath, 2 )
	config.set( 'crosshairsObject', crosshairsObject )

	return crosshairsObject

}

const getImages = ( directory, level ) => {

	return new Promise( ( resolve, reject ) => {

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

}

const setColor = ( color, targetWindow = mainWindow ) => {

	targetWindow.webContents.send( 'set_color', color )
	settingsWindow.webContents.send( 'set_color', color )

}

const setOpacity = ( opacity, targetWindow = mainWindow ) => {

	targetWindow.webContents.send( 'set_opacity', opacity )
	settingsWindow.webContents.send( 'set_opacity', opacity )

}

const setPosition = ( posX, posY, targetWindow = mainWindow ) => {

	if ( posX === null || posY === null ) {

		return

	}

	targetWindow.setBounds( { x: posX, y: posY } )

	if ( targetWindow === mainWindow ) {

		console.log( 'Save XY:', posX, posY )
		config.set( 'positionX', posX )
		config.set( 'positionY', posY )

	}

}

const setSight = ( sight, targetWindow = mainWindow ) => {

	targetWindow.webContents.send( 'set_sight', sight )
	settingsWindow.webContents.send( 'set_sight', sight )

}

const setSize = ( size, targetWindow = mainWindow ) => {

	targetWindow.webContents.send( 'set_size', size )
	settingsWindow.webContents.send( 'set_size', size )

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
		...options
	}

	// Electron way
	// MainWindow.hide()
	// options.targetWindow.center()
	// const bounds = options.targetWindow.getBounds()

	// This is the Sindre way
	centerWindow( {
		window: options.targetWindow,
		animated: true,
		useFullBounds: true
	} )

	options.targetWindow.show()

	// Save game
	if ( options.targetWindow === mainWindow ) {

		saveBounds( mainWindow )

	}

}

const hideWindow = () => {

	// Hide all crosshair windows in place
	if ( windowHidden ) {

		mainWindow.show()
		shadowWindows.forEach( currentWindow => {

			currentWindow.show()

		} )

	} else {

		mainWindow.hide()
		shadowWindows.forEach( currentWindow => {

			currentWindow.hide()

		} )

	}

	windowHidden = !windowHidden

}

const toggleWindowLock = () => {

	const locked = config.get( 'windowLocked' )
	lockWindow( !locked )
	shadowWindows.forEach( currentWindow => {

		lockWindow( !locked, currentWindow )

	} )

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

		targetWindow.setAlwaysOnTop( true, 'screen-saver' )

	} else {

		// Allow dragging to Window on Mac
		targetWindow.setAlwaysOnTop( true, 'pop-up-menu' )

		// Bring window to front
		targetWindow.show()

	}

	config.set( 'windowLocked', lock )

}

// Switch window type when hiding chooser
const hideChooserWindow = () => {

	if ( chooserWindow ) {

		chooserWindow.hide()

	}

}

// Switch window type when hiding chooser
const hideSettingsWindow = () => {

	if ( settingsWindow ) {

		settingsWindow.hide()

	}

}

const moveWindow = options => {

	options = {
		direction: 'none',
		targetWindow: getActiveWindow(),
		...options
	}

	const saveSettings = options.targetWindow === mainWindow
	const locked = config.get( 'windowLocked' )

	if ( !locked ) {

		console.log( 'Move', options.direction )
		let newBound
		const bounds = options.targetWindow.getBounds()
		switch ( options.direction ) {

			case 'up':
				newBound = bounds.y - 1
				options.targetWindow.setBounds( { y: newBound } )
				if ( saveSettings ) {

					config.set( 'positionY', newBound )

				}

				break
			case 'down':
				newBound = bounds.y + 1
				options.targetWindow.setBounds( { y: newBound } )
				if ( saveSettings ) {

					config.set( 'positionY', newBound )

				}

				break
			case 'left':
				newBound = bounds.x - 1
				options.targetWindow.setBounds( { x: newBound } )
				if ( saveSettings ) {

					config.set( 'positionX', newBound )

				}

				break
			case 'right':
				newBound = bounds.x + 1
				options.targetWindow.setBounds( { x: newBound } )
				if ( saveSettings ) {

					config.set( 'positionX', newBound )

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
		...options
	}

	// Get list of displays
	const displays = screen.getAllDisplays()

	// Get current display
	const currentDisplay = screen.getDisplayNearestPoint( options.targetWindow.getBounds() )

	// Get index of current
	let index = displays.map( element => {

		return element.id

	} ).indexOf( currentDisplay.id )

	// Increment and save
	index = ( index + 1 ) % displays.length

	centerAppWindow( { display: displays[index], targetWindow: options.targetWindow } )

}

const aboutWindow = () => {

	// Console.dir( app.getGPUFeatureStatus() )
	// Console.dir(app.getAppMetrics());
	// app.getGPUInfo('complete').then(completeObj => {
	//        console.dir(completeObj);
	//    });
	showAboutWindow( {
		icon: path.join( __static, 'Icon.png' ),
		copyright: `🎯 CrossOver ${app.getVersion()} | Copyright © Lacy Morrow`,
		text: `A crosshair overlay for any screen. Feedback and bug reports welcome. Created by Lacy Morrow. Crosshairs thanks to /u/IrisFlame. ${is.development && ' | ' + debugInfo()} GPU: ${app.getGPUFeatureStatus().gpu_compositing}`
	} )

}

const escapeAction = () => {

	hideChooserWindow()
	hideSettingsWindow()
	globalShortcut.unregister( 'Escape' )

}

const resetSettings = skipSetup => {

	// Close extra crosshairs
	closeShadowWindows()

	const keys = Object.keys( defaults )
	for ( const element of keys ) {

		config.set( element, defaults[element] )

	}

	centerAppWindow()

	if ( !skipSetup ) {

		setupApp()

	}

}

const registerEvents = () => {

	mainWindow.on( 'move', () => {

		saveBounds( mainWindow )

	} )

	// Reopen settings/chooser if killed
	chooserWindow.on( 'close', async () => {

		hideWindow()
		await createChooser()
		registerEvents()
		mainWindow.show()

	} )

	settingsWindow.on( 'close', async () => {

		hideWindow()
		await createSettings()
		registerEvents()
		mainWindow.show()

	} )

	// Close windows if clicked away (mac only)
	if ( !is.development ) {

		chooserWindow.on( 'blur', () => {

			hideChooserWindow()

		} )

		settingsWindow.on( 'blur', () => {

			hideSettingsWindow()

		} )

	}

}

const dColorInput = debounce( arg => {

	console.log( `Save color: ${arg}` )
	config.set( 'color', arg )

}, 400 )

const dOpacityInput = debounce( arg => {

	console.log( `Save opacity: ${arg}` )
	config.set( 'opacity', arg )

}, 400 )

const dSizeInput = debounce( arg => {

	console.log( `Save size: ${arg}` )
	config.set( 'size', arg )

}, 400 )

const registerIpc = () => {

	/* IP Communication */
	ipcMain.on( 'log', ( event, arg ) => {

		console.log( arg )

	} )

	ipcMain.on( 'open_chooser', async ( ..._ ) => {

		hideSettingsWindow()

		// Don't do anything if locked
		if ( config.get( 'windowLocked' ) ) {

			return

		}

		if ( !chooserWindow ) {

			chooserWindow = await createChooser()

		}

		// Create shortcut to close chooser
		if ( !globalShortcut.isRegistered( 'Escape' ) ) {

			globalShortcut.register( 'Escape', escapeAction )

		}

		// Modal placement is different per OS
		if ( is.macos ) {

			const bounds = chooserWindow.getBounds()
			chooserWindow.setBounds( { y: bounds.y + APP_HEIGHT - CHILD_WINDOW_OFFSET } )

		} else {

			// Windows
			centerAppWindow( {
				targetWindow: chooserWindow
			} )

		}

		chooserWindow.show()

	} )

	ipcMain.on( 'open_settings', async ( ..._ ) => {

		hideChooserWindow()

		// Don't do anything if locked
		if ( config.get( 'windowLocked' ) ) {

			return

		}

		if ( !settingsWindow ) {

			settingsWindow = await createSettings()

		}

		// Create shortcut to close window
		if ( !globalShortcut.isRegistered( 'Escape' ) ) {

			globalShortcut.register( 'Escape', escapeAction )

		}

		// Modal placement is different per OS
		if ( is.macos ) {

			const bounds = settingsWindow.getBounds()
			settingsWindow.setBounds( { y: bounds.y + APP_HEIGHT + CHILD_WINDOW_OFFSET } )

		} else {

			centerAppWindow( {
				targetWindow: settingsWindow
			} )

		}

		settingsWindow.show()

	} )

	ipcMain.on( 'close_chooser', _ => {

		hideChooserWindow()

	} )

	ipcMain.on( 'close_settings', _ => {

		hideSettingsWindow()

	} )

	ipcMain.on( 'close_window', event => {

		// Close a shadow window
		closeShadowWindows( event.sender.id )

	} )

	ipcMain.on( 'save_color', ( event, arg ) => {

		mainWindow.webContents.send( 'set_color', arg ) // Pass to renderer
		// pass to shadows
		shadowWindows.forEach( currentWindow => {

			currentWindow.webContents.send( 'set_color', arg )

		} )
		dColorInput( arg )

	} )

	ipcMain.on( 'save_custom_image', ( event, arg ) => {

		// Is it a file and does it have a supported extension?
		if ( fs.lstatSync( arg ).isFile() && SUPPORTED_IMAGE_FILE_TYPES.includes( path.extname( arg ) ) ) {

			console.log( `Save custom image: ${arg}` )
			mainWindow.webContents.send( 'set_custom_image', arg ) // Pass to renderer
			shadowWindows.forEach( currentWindow => {

				currentWindow.webContents.send( 'set_custom_image', arg )

			} )

			config.set( 'crosshair', arg )
			hideChooserWindow()

		}

	} )

	ipcMain.on( 'get_crosshairs', async _ => {

		// Setup crosshair chooser, must come before the check below
		if ( chooserWindow ) {

			chooserWindow.webContents.send( 'load_crosshairs', {
				crosshairs: await getCrosshairImages(),
				current: config.get( 'crosshair' )
			} )

		}

	} )

	ipcMain.on( 'save_crosshair', ( event, arg ) => {

		if ( arg ) {

			console.log( `Save crosshair: ${arg}` )
			hideChooserWindow()
			mainWindow.webContents.send( 'set_crosshair', arg ) // Pass to renderer
			shadowWindows.forEach( currentWindow => {

				currentWindow.webContents.send( 'set_crosshair', arg )

			} )

			config.set( 'crosshair', arg )

		} else {

			console.log( 'Not setting null crosshair.' )

		}

	} )

	ipcMain.on( 'save_opacity', ( event, arg ) => {

		mainWindow.webContents.send( 'set_opacity', arg ) // Pass to renderer
		shadowWindows.forEach( currentWindow => {

			currentWindow.webContents.send( 'set_opacity', arg )

		} )
		dOpacityInput( arg )

	} )

	ipcMain.on( 'save_size', ( event, arg ) => {

		mainWindow.webContents.send( 'set_size', arg ) // Pass to renderer
		shadowWindows.forEach( currentWindow => {

			currentWindow.webContents.send( 'set_size', arg )

		} )
		dSizeInput( arg )

	} )

	ipcMain.on( 'save_sight', ( event, arg ) => {

		mainWindow.webContents.send( 'set_sight', arg ) // Pass to renderer
		shadowWindows.forEach( currentWindow => {

			currentWindow.webContents.send( 'set_sight', arg )

		} )
		console.log( `Save sight: ${arg}` )
		config.set( 'sight', arg )

	} )

	ipcMain.on( 'center_window', () => {

		console.log( 'Center window' )
		centerAppWindow()

	} )

	ipcMain.on( 'quit', () => {

		app.quit()

	} )

}

const defaultShortcuts = () => {

	/* Default accelerator */
	const accelerator = 'Control+Shift+Alt'

	return [

		// Duplicate main window
		{

			action: 'duplicate',
			keybind: `${accelerator}+D`,
			fn: () => {

				createShadowWindow()

			}
		},

		// Toggle CrossOver
		{
			action: 'lock',
			keybind: `${accelerator}+X`,
			fn: () => {

				toggleWindowLock()

			}
		},

		// Center CrossOver
		{
			action: 'center',
			keybind: `${accelerator}+C`,
			fn: () => {

				centerAppWindow()

			}
		},

		// Hide CrossOver
		{
			action: 'hide',
			keybind: `${accelerator}+H`,
			fn: () => {

				hideWindow()

			}
		},

		// Move CrossOver to next monitor
		{
			action: 'changeDisplay',
			keybind: `${accelerator}+M`,
			fn: () => {

				moveWindowToNextDisplay()

			}
		},

		// Reset CrossOver
		{
			action: 'reset',
			keybind: `${accelerator}+R`,
			fn: () => {

				resetSettings()

			}
		},

		// About CrossOver
		{
			action: 'about',
			keybind: `${accelerator}+A`,
			fn: () => {

				aboutWindow()

			}
		},

		// Single pixel movement
		{
			action: 'moveUp',
			keybind: `${accelerator}+Up`,
			fn: () => {

				moveWindow( { direction: 'up' } )

			}
		},
		{
			action: 'moveDown',
			keybind: `${accelerator}+Down`,
			fn: () => {

				moveWindow( { direction: 'down' } )

			}
		},
		{
			action: 'moveLeft',
			keybind: `${accelerator}+Left`,
			fn: () => {

				moveWindow( { direction: 'left' } )

			}
		},
		{
			action: 'moveRight',
			keybind: `${accelerator}+Right`,
			fn: () => {

				moveWindow( { direction: 'right' } )

			}
		}
	]

}

const registerShortcuts = () => {

	// Register all shortcuts
	const customShortcuts = defaultShortcuts()
	defaultShortcuts().forEach( shortcut => {

		const index = customShortcuts.map( element => element.action ).indexOf( shortcut.action )
		if ( index > -1 ) {

			// If a custom shortcut exists for this action
			console.log( `Custom keybind for ${shortcut.action}` )
			globalShortcut.register( customShortcuts[index].keybind, shortcut.fn )

		} else {

			globalShortcut.register( shortcut.keybind, shortcut.fn )

		}

	} )

}

const createChooser = async currentCrosshair => {

	if ( !currentCrosshair ) {

		currentCrosshair = config.get( 'crosshair' )

	}

	chooserWindow = await createChildWindow( mainWindow, 'chooser' )

	// Setup crosshair chooser, must come before the check below
	chooserWindow.webContents.send( 'load_crosshairs', {
		crosshairs: await getCrosshairImages(),
		current: currentCrosshair
	} )

	return chooserWindow

}

const createSettings = async () => {

	settingsWindow = await createChildWindow( mainWindow, 'settings' )

	return settingsWindow

}

const setupApp = async () => {

	// IPC
	registerIpc()

	// Keyboard shortcuts
	registerShortcuts()

	// Set to previously selected crosshair
	const currentCrosshair = config.get( 'crosshair' )

	// Create child windows
	await createSettings()

	if ( currentCrosshair ) {

		console.log( `Set crosshair: ${currentCrosshair}` )
		mainWindow.webContents.send( 'set_crosshair', currentCrosshair )

	}

	setColor( config.get( 'color' ) )
	setOpacity( config.get( 'opacity' ) )
	setSight( config.get( 'sight' ) )
	setSize( config.get( 'size' ) )

	// Center app by default - set position if config exists
	if ( config.get( 'positionX' ) !== null ) {

		setPosition( config.get( 'positionX' ), config.get( 'positionY' ) )

	}

	// Set lock state, timeout makes it pretty
	setTimeout( () => {

		const locked = config.get( 'windowLocked' )

		lockWindow( locked )

		// Show on first load if unlocked (unlocking shows already)
		if ( locked ) {

			mainWindow.show()

		}

	}, 500 )

	await createChooser( currentCrosshair )

	// Window Events after windows are created
	registerEvents()

	// Allow command-line reset
	if ( process.env.CROSSOVER_RESET ) {

		console.log( 'Reset Triggered' )
		resetSettings( true )

	}

}

const setupShadowWindow = async shadow => {

	shadow.webContents.send( 'add_class', 'shadow' )
	shadow.webContents.send( 'set_crosshair', config.get( 'crosshair' ) )
	setColor( config.get( 'color' ), shadow )
	setOpacity( config.get( 'opacity' ), shadow )
	setSight( config.get( 'sight' ), shadow )
	setSize( config.get( 'size' ), shadow )
	if ( config.get( 'positionX' ) > -1 ) {

		// Offset position slightly
		setPosition( config.get( 'positionX' ) + ( shadowWindows.size * SHADOW_WINDOW_OFFSET ), config.get( 'positionY' ) + ( shadowWindows.size * SHADOW_WINDOW_OFFSET ), shadow )

	}

	lockWindow( config.get( 'windowLocked' ), shadow )

}

// Opening 2nd instance focuses app
app.on( 'second-instance', () => {

	if ( mainWindow ) {

		createShadowWindow()

		if ( mainWindow.isMinimized() ) {

			mainWindow.restore()

		}

		mainWindow.show()

	}

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

	Menu.setApplicationMenu( menu )
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
