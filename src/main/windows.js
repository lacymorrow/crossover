const path = require( 'path' )

const { app, BrowserWindow } = require( 'electron' )

const { is } = require( 'electron-util' )
const { APP_HEIGHT, APP_WIDTH, MAX_SHADOW_WINDOWS } = require( '../config/config.js' )
const { productName } = require( '../../package.json' )
const dock = require( './dock.js' )
const log = require( './log.js' )
const { __renderer } = require( './paths.js' )

const init = async options => {

	if ( windows.win ) {

		windows.win.show()

		return windows.win

	}

	// or create(); await load()
	windows.win = await create( options ).load()

	return windows.win

}

async function load( win = this.win ) {

	await win.loadFile( path.join( __renderer, 'index.html' ) )

	return win

}

// I'm proud of this one
async function each( w, fn, ...args ) {

	if ( typeof w === 'function' ) {

		args.unshift( fn )
		fn = w
		w = null

	}

	w = w || this.windows || windows

	console.log( args )

	fn.call( this, w.win, ...args )

	for ( const currentWindow of w.shadowWindows ) {

		fn.call( this, currentWindow, ...args )

	}

}

// Prevent window from being garbage collected
// Default no shadow window
const create = ( { isShadowWindow } = { isShadowWindow: false } ) => {

	// default to center
	// Get saved bounds
	// Check if saved bounds on screen

	const options = {
		title: productName,
		acceptFirstMouse: true,
		alwaysOnTop: true,
		backgroundColor: '#00FFFFFF',
		closable: true,
		frame: false,
		fullscreenable: false,
		hasShadow: false,
		maximizable: false,
		minimizable: false,
		resizable: false,
		show: false,
		skipTaskbar: false,
		titleBarStyle: 'customButtonsOnHover',
		transparent: true,
		useContentSize: true,
		width: APP_WIDTH,
		height: APP_HEIGHT,
		webPreferences: {
			contextIsolation: true,
			enableRemoteModule: true,
			nativeWindowOpen: true,
			nodeIntegration: false,
			preload: path.join( __renderer, 'preload.js' ),

		},
	}

	// I think this is better for Windows alwaysOnTop? Can't remember
	if ( is.windows ) {

		options.type = 'toolbar'

	}

	const win = new BrowserWindow( options )

	// Remote module
	// require('@electron/remote/main').enable(win.webContents)

	// Enables staying on fullscreen apps for macos https://github.com/electron/electron/pull/11599
	dock.setVisible( false )
	win.setFullScreenable( false )

	// VisibleOnFullscreen removed in https://github.com/electron/electron/pull/21706
	win.setVisibleOnAllWorkspaces( true, { visibleOnFullScreen: true } )

	// If we wanted a dock, we can use it now: https://github.com/electron/electron/pull/11599
	// dock.setDockVisible( true )

	if ( isShadowWindow ) {

		// Add to set
		windows.shadowWindows.add( win )

		// Duplicate shadow windows
		win.once( 'ready-to-show', () => {

			win.show()

		} )

		win.on( 'closed', () => {

			// Dereference the window
			windows.shadowWindows.delete( win )

		} )

	} else {

		win.on( 'closed', () => {

			// Dereference the window
			// For multiple windows store them in an array
			windows.win = undefined

			// Quit if main window closed
			app.quit()

		} )

	}

	return { ...windows, win }

}

const createShadow = async () => {

	// Don't allow a bunch of crosshairs, max 20
	if ( windows.shadowWindows.size < MAX_SHADOW_WINDOWS ) {

		// Create
		const shadow = await create( { isShadowWindow: true } ).load()
		windows.shadowWindows.add( shadow )

		// Setup
		shadow.webContents.send( 'add_class', 'shadow' )

		// Sync Preferences
		// shadow.webContents.send( 'set_crosshair', prefs.value( 'crosshair.crosshair' ) )
		// setColor( prefs.value( 'crosshair.color' ), shadow )
		// setOpacity( prefs.value( 'crosshair.opacity' ), shadow )
		// setSight( prefs.value( 'crosshair.reticle' ), shadow )
		// setSize( prefs.value( 'crosshair.size' ), shadow )
		// if ( prefs.value( 'hidden.positionX' ) > -1 ) {

		// 	// Offset position slightly
		// 	setPosition( prefs.value( 'hidden.positionX' ) + ( shadowWindows.size * SHADOW_WINDOW_OFFSET ), prefs.value( 'hidden.positionY' ) + ( shadowWindows.size * SHADOW_WINDOW_OFFSET ), shadow )

		// }

		// lockWindow( prefs.value( 'hidden.locked' ), shadow )

		log.info( `Created shadow window: ${shadow.webContents.id}` )

		return shadow

	}

	return Array.from( windows.shadowWindows ).pop()

}

const closeShadow = id => {

	for ( const currentWindow of windows.shadowWindows ) {

		if ( id === currentWindow.webContents.id ) {

			currentWindow.close()

		}

	}

}

const closeAllShadows = () => {

	for ( const currentWindow of windows.shadowWindows ) {

		currentWindow.close()

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
	for ( const currentWindow of windows.shadowWindows ) {

		currentWindow.show()

	}

	windowHidden = false

}

const hideWindow = () => {

	mainWindow.hide()
	for ( const currentWindow of windows.shadowWindows ) {

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

	playSound( lock ? 'LOCK' : 'UNLOCK' )

	lockWindow( lock )
	for ( const currentWindow of windows.shadowWindows ) {

		lockWindow( lock, currentWindow )

	}

}

const windows = {

	init,
	load,
	each,
	create,
	createShadow,
	closeShadow,
	closeAllShadows,
	shadowWindows: new Set(),
	win: null,

}

module.exports = windows
