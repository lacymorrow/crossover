'use strict'

// Conflicting accelerator on Fedora
// Improve escapeAction to be window-aware
// GetWindowBoundsCentered
// centerWindow

// const NativeExtension = require('bindings')('NativeExtension');
const fs = require( 'fs' )
const path = require( 'path' )
const electron = require( 'electron' )
const { app, ipcMain, globalShortcut, BrowserWindow, Menu } = electron
const { autoUpdater } = require( 'electron-updater' )
const { centerWindow, debugInfo, is, showAboutWindow } = require( 'electron-util' )
const unhandled = require( 'electron-unhandled' )
const debug = require( 'electron-debug' )
const { debounce } = require( './util' )
const { config, defaults, APP_HEIGHT, CHILD_WINDOW_OFFSET, SUPPORTED_IMAGE_FILE_TYPES } = require( './config' )
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

// // Prevent multiple instances of the app
// if ( !app.requestSingleInstanceLock() ) {

// 	app.quit()

// }

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
let windowHidden = false // Maintain hidden state

// __static path
const __static = path.join( __dirname, '/static' ).replace( /\\/g, '\\\\' )

// Crosshair images
const crosshairsPath = path.join( __static, 'crosshairs' )

const createMainWindow = async () => {

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

	win.on( 'closed', () => {

		// Dereference the window
		// For multiple windows store them in an array
		mainWindow = undefined

	} )

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

const setColor = color => {

	mainWindow.webContents.send( 'set_color', color )
	settingsWindow.webContents.send( 'set_color', color )

}

const setOpacity = opacity => {

	mainWindow.webContents.send( 'set_opacity', opacity )
	settingsWindow.webContents.send( 'set_opacity', opacity )

}

const setPosition = ( posX, posY ) => {

	console.log( 'Set XY:', posX, posY )

	config.set( 'positionX', posX )
	config.set( 'positionY', posY )
	mainWindow.setBounds( { x: posX, y: posY } )

}

const setSight = sight => {

	mainWindow.webContents.send( 'set_sight', sight )
	settingsWindow.webContents.send( 'set_sight', sight )

}

const setSize = size => {

	mainWindow.webContents.send( 'set_size', size )
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

const centerApp = () => {

	// Electron way
	// MainWindow.hide()
	// mainWindow.center()
	// const bounds = mainWindow.getBounds()

	// This is the Sindre way
	centerWindow( {
		window: mainWindow,
		animated: true
	} )

	mainWindow.show()

	// Save game
	saveBounds( mainWindow )

}

const hideWindow = () => {

	if ( windowHidden ) {

		mainWindow.show()

	} else {

		mainWindow.hide()

	}

	windowHidden = !windowHidden

}

const toggleWindowLock = () => {

	const locked = config.get( 'windowLocked' )
	lockWindow( !locked )

}

// Allows dragging and setting options
const lockWindow = lock => {

	console.log( `Locked: ${lock}` )

	hideChooserWindow()
	hideSettingsWindow()
	mainWindow.closable = !lock
	mainWindow.setFocusable( !lock )
	mainWindow.setIgnoreMouseEvents( lock )
	mainWindow.webContents.send( 'lock_window', lock )

	if ( lock ) {

		mainWindow.setAlwaysOnTop( true, 'screen-saver' )

	} else {

		// Allow dragging to Window on Mac
		mainWindow.setAlwaysOnTop( true, 'pop-up-menu' )

		// Bring window to front
		mainWindow.show()

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

const moveWindow = direction => {

	const locked = config.get( 'windowLocked' )
	if ( !locked ) {

		console.log( 'Move', direction )
		let newBound
		// Const mainWindow = BrowserWindow.getAllWindows()[0]
		const bounds = mainWindow.getBounds()
		switch ( direction ) {

			case 'up':
				newBound = bounds.y - 1
				mainWindow.setBounds( { y: newBound } )
				config.set( 'positionY', newBound )
				break
			case 'down':
				newBound = bounds.y + 1
				mainWindow.setBounds( { y: newBound } )
				config.set( 'positionY', newBound )

				break
			case 'left':
				newBound = bounds.x - 1
				mainWindow.setBounds( { x: newBound } )
				config.set( 'positionX', newBound )
				break
			case 'right':
				newBound = bounds.x + 1
				mainWindow.setBounds( { x: newBound } )
				config.set( 'positionX', newBound )
				break
			default:
				break

		}

	}

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

	const keys = Object.keys( defaults )
	for ( const element of keys ) {

		config.set( element, defaults[element] )

	}

	centerApp()

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

	console.log( `Set color: ${arg}` )
	config.set( 'color', arg )

}, 400 )

const dOpacityInput = debounce( arg => {

	console.log( `Set opacity: ${arg}` )
	config.set( 'opacity', arg )

}, 400 )

const dSizeInput = debounce( arg => {

	console.log( `Set size: ${arg}` )
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

			centerWindow( {
				window: chooserWindow,
				animated: true
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
			settingsWindow.setBounds( { y: bounds.y + APP_HEIGHT - CHILD_WINDOW_OFFSET } )

		} else {

			centerWindow( {
				window: settingsWindow,
				animated: true
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

	ipcMain.on( 'save_color', ( event, arg ) => {

		mainWindow.webContents.send( 'set_color', arg ) // Pass to renderer
		dColorInput( arg )

	} )

	ipcMain.on( 'save_custom_image', ( event, arg ) => {

		// Is it a file and does it have a supported extension?
		if ( fs.lstatSync( arg ).isFile() && SUPPORTED_IMAGE_FILE_TYPES.includes( path.extname( arg ) ) ) {

			console.log( `Set custom image: ${arg}` )
			mainWindow.webContents.send( 'set_custom_image', arg ) // Pass to renderer
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

			console.log( `Set crosshair: ${arg}` )
			hideChooserWindow()
			mainWindow.webContents.send( 'set_crosshair', arg ) // Pass to renderer
			config.set( 'crosshair', arg )

		} else {

			console.log( 'Not setting null crosshair.' )

		}

	} )

	ipcMain.on( 'save_opacity', ( event, arg ) => {

		mainWindow.webContents.send( 'set_opacity', arg ) // Pass to renderer
		dOpacityInput( arg )

	} )

	ipcMain.on( 'save_size', ( event, arg ) => {

		mainWindow.webContents.send( 'set_size', arg ) // Pass to renderer
		dSizeInput( arg )

	} )

	ipcMain.on( 'save_sight', ( event, arg ) => {

		mainWindow.webContents.send( 'set_sight', arg ) // Pass to renderer
		console.log( `Set sight: ${arg}` )
		config.set( 'sight', arg )

	} )

	ipcMain.on( 'center_window', () => {

		console.log( 'Center window' )
		centerApp()

	} )

	ipcMain.on( 'quit', () => {

		app.quit()

	} )

}

const registerShortcuts = () => {

	/* Global KeyListners */
	const accelerator = 'Control+Shift+Alt'

	// Toggle CrossOver
	globalShortcut.register( `${accelerator}+X`, () => {

		toggleWindowLock()

	} )

	// Center CrossOver
	globalShortcut.register( `${accelerator}+C`, () => {

		centerApp()

	} )

	// Hide CrossOver
	globalShortcut.register( `${accelerator}+H`, () => {

		hideWindow()

	} )

	// // Move CrossOver to next monitor - this code actually fullscreens too...
	// globalShortcut.register( `${accelerator}+M`, () => {

	// 	const currentScreen = electron.screen.getDisplayNearestPoint(electron.screen.getCursorScreenPoint())
	// 	mainWindow.setBounds(currentScreen.workArea)

	// } )

	// Reset CrossOver
	globalShortcut.register( `${accelerator}+R`, () => {

		resetSettings()

	} )

	// About CrossOver
	globalShortcut.register( `${accelerator}+A`, () => {

		aboutWindow()

	} )

	// Single pixel movement
	globalShortcut.register( `${accelerator}+Up`, () => {

		moveWindow( 'up' )

	} )

	globalShortcut.register( `${accelerator}+Down`, () => {

		moveWindow( 'down' )

	} )

	globalShortcut.register( `${accelerator}+Left`, () => {

		moveWindow( 'left' )

	} )

	globalShortcut.register( `${accelerator}+Right`, () => {

		moveWindow( 'right' )

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
	if ( config.get( 'positionX' ) > -1 ) {

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

// Opening 2nd instance focuses app
app.on( 'second-instance', () => {

	if ( mainWindow ) {

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
