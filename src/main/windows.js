const path = require( 'path' )

const { app, BrowserWindow, screen } = require( 'electron' )

const { activeWindow, centerWindow, is } = require( './util' )
const { APP_HEIGHT, APP_WIDTH, MAX_SHADOW_WINDOWS, APP_ASPECT_RATIO } = require( '../config/config.js' )
const { productName } = require( '../../package.json' )
const dock = require( './dock.js' )
const log = require( './log.js' )
const { __renderer } = require( './paths.js' )
const preferences = require( './preferences.js' ).init()
const helpers = require( './helpers.js' )

// Will return current window if exists
const init = async options => {

	if ( windows.win ) {

		return windows.win

	}

	// or create(); await load()
	windows.win = await windows.create( options ).load()

	return windows.win

}

// Load HTML file
async function load( win = this.win || windows.win ) {

	await win.loadFile( path.join( __renderer, 'index.html' ) )

	return win

}

// I'm proud of this one
// windows.each( win => console.log(win)) or each(windows, win => console.log(win))
async function each( w, fn, ...args ) {

	// If no window passed, throw away args
	if ( typeof w === 'function' ) {

		args.unshift( fn )
		fn = w
		w = null

	}

	w = w || this.windows || windows

	fn.call( this, w.win, ...args )

	for ( const currentWindow of w.shadowWindows ) {

		fn.call( this, currentWindow, ...args )

	}

}

const getActiveWindow = () => {

	let currentWindow = activeWindow()

	// Not main or shadow
	if ( currentWindow !== windows.win && !windows.shadowWindows.has( currentWindow ) ) {

		// Not shadow and not main window, probably a console or dialog
		currentWindow = windows.win

	}

	return currentWindow

}

// Prevent window from being garbage collected
// Default no shadow window
const create = ( { isShadowWindow } = { isShadowWindow: false } ) => {

	// default to center
	// Get saved bounds
	// Check if saved bounds on screen

	const options = {
		title: isShadowWindow ? 'Shadow' : productName,
		acceptFirstMouse: true,
		alwaysOnTop: true,
		backgroundColor: '#00FFFFFF',
		closable: true,
		frame: false,
		fullscreenable: false,
		hasShadow: false,
		maximizable: false,
		minimizable: false,
		movable: true,
		resizable: false,
		show: false,
		skipTaskbar: false,
		titleBarStyle: 'customButtonsOnHover',
		transparent: true,
		useContentSize: true,
		minWidth: APP_WIDTH,
		minHeight: APP_HEIGHT,
		width: APP_WIDTH,
		height: APP_HEIGHT,
		webPreferences: {
			contextIsolation: true,
			sandbox: false, // todo: enable
			enableRemoteModule: false,
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

	// Maintain aspect ratio
	win.setAspectRatio( APP_ASPECT_RATIO )

	// Enables staying on fullscreen apps for macos https://github.com/electron/electron/pull/11599
	dock.setVisible( false )
	win.setFullScreenable( false )

	// VisibleOnFullscreen removed in https://github.com/electron/electron/pull/21706
	win.setVisibleOnAllWorkspaces( true, { visibleOnFullScreen: true } )

	// Values include normal, floating, torn-off-menu, modal-panel, main-menu, status, pop-up-menu, screen-saver
	win.setAlwaysOnTop( true, 'screen-saver', 1 )
	win.setFullScreenable( false )

	win.once( 'ready-to-show', () => {

		log.info( 'Event: Ready to show' )

		win.show()
		// If we wanted a dock, we can use it now: https://github.com/electron/electron/pull/11599
		// dock.setDockVisible( true )

	} )

	if ( isShadowWindow ) {

		// Duplicate shadow windows

		win.on( 'closed', () => {

			// Dereference the window
			windows.shadowWindows.delete( win )

		} )
		// Add to set
		windows.shadowWindows.add( win )

	} else {

		win.on( 'will-resize', windows.onWillResize )

		win.on( 'closed', () => {

			// Dereference the window
			// For multiple windows store them in an array
			windows.win = undefined

			// Quit if main window closed
			app.quit()

		} )

	}

	win.on( 'unresponsive', event => {

		log.error( `Window crashed: ${event.sender}` )

	} )

	win.webContents.on( 'did-fail-load', event => {

		log.error( `Window failed load: ${event?.sender}` )

	} )

	return { ...windows, win }

}

const createChild = async ( parent, windowName ) => {

	const VALID_WINDOWS = [ 'chooser' ]

	const options = {
		parent,
		title: 'Crosshairs',
		modal: true,
		show: false,
		type: 'toolbar',
		frame: preferences.value( 'hidden.frame' ),
		hasShadow: true,
		titleBarStyle: 'customButtonsOnHover',
		fullscreenable: false,
		maximizable: false,
		minimizable: false,
		transparent: true,
		width: 600,
		height: 400,
		webPreferences: {
			contextIsolation: true, // Protect against prototype pollution
			enableRemoteModule: false, // Turn off remote
			nodeIntegration: false, // Is default value after Electron v5
			sandbox: false, // todo: enable
			preload: path.join( __renderer, `preload-${windowName}.js` ),
		},
	}

	if ( !VALID_WINDOWS.includes( windowName ) ) {

		return

	}

	const win = new BrowserWindow( options )

	await win.loadFile( path.join( __renderer, `${windowName}.html` ) )

	return win

}

const createShadow = async () => {

	// Don't allow a bunch of crosshairs, max 20
	if ( windows.shadowWindows.size < MAX_SHADOW_WINDOWS ) {

		// Create
		const shadow = await create( { isShadowWindow: true } ).load()

		log.info( `Created shadow window: ${shadow.webContents.id}`, windows.shadowWindows )

		return shadow

	}

	return Array.from( windows.shadowWindows ).pop()

}

const createChooser = async currentCrosshair => {

	if ( windows.chooserWindow ) {

		return windows.chooserWindow

	}

	if ( !currentCrosshair ) {

		currentCrosshair = preferences.value( 'crosshair.crosshair' )

	}

	windows.chooserWindow = await createChild( windows.win, 'chooser' )

	// Setup crosshair chooser, must come before the check below
	windows.chooserWindow.webContents.send( 'load_crosshairs', {
		crosshairs: await helpers.getCrosshairImages(),
		current: currentCrosshair,
	} )

	return windows.chooserWindow

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

const closeWindow = ( targetWindow = windows.getActiveWindow() ) => {

	targetWindow.close()

}

// Switch window type when hiding chooser
const hideChooserWindow = ( { focus } = {} ) => {

	if ( windows.chooserWindow ) {

		windows.chooserWindow.hide()
		if ( focus ) {

			windows.win.focus()

		}

	}

}

// Switch window type when hiding chooser
const hideSettingsWindow = () => {

	if ( windows.preferencesWindow && windows.preferencesWindow.isVisible() ) {

		preferences.value( 'hidden.showSettings', false )
		windows.preferencesWindow.close()
		windows.preferencesWindow = null
		windows.win.focus()

	}

}

const center = options => {

	options = {
		display: screen.getDisplayNearestPoint( screen.getCursorScreenPoint() ),
		focus: false,
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

	if ( options.focus ) {

		options.targetWindow.focus()

	}

}

const showWindow = () => {

	// Todo: showInactive() can be used in later versions of Electron
	// each( win => win.showInactive() )

	windows.win.webContents.send( 'remove_class', 'hidden' )
	windows.hidden = false

}

const hideWindow = () => {

	// Previously:
	// each( win => win.hide() )

	windows.win.webContents.send( 'add_class', 'hidden' )
	windows.hidden = true

}

const showHideWindow = () => {

	// Hide all crosshair windows in place
	if ( windows.hidden ) {

		showWindow()

	} else {

		hideWindow()

	}

}

const moveToNextDisplay = options => {

	options = {
		targetWindow: windows.getActiveWindow(),
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

	// Center
	center( { display: displays[index], targetWindow: options.targetWindow } )

}

const moveWindow = options_ => {

	const options = {
		distance: 1,
		direction: 'none',
		targetWindow: windows.getActiveWindow(),
		...options_,
	}

	const shouldSaveSettings = options.targetWindow === windows.win
	const locked = preferences.value( 'hidden.locked' )

	if ( !locked ) {

		log.info( 'Move', options.direction )
		let newBound
		const bounds = options.targetWindow.getBounds()
		switch ( options.direction ) {

		case 'up':
			newBound = bounds.y - options.distance
			options.targetWindow.setBounds( { y: newBound } )
			if ( shouldSaveSettings ) {

				preferences.value( 'crosshair.positionY', newBound )

			}

			break
		case 'down':
			newBound = bounds.y + options.distance
			options.targetWindow.setBounds( { y: newBound } )
			if ( shouldSaveSettings ) {

				preferences.value( 'crosshair.positionY', newBound )

			}

			break
		case 'left':
			newBound = bounds.x - options.distance
			options.targetWindow.setBounds( { x: newBound } )
			if ( shouldSaveSettings ) {

				preferences.value( 'crosshair.positionX', newBound )

			}

			break
		case 'right':
			newBound = bounds.x + options.distance
			options.targetWindow.setBounds( { x: newBound } )
			if ( shouldSaveSettings ) {

				preferences.value( 'crosshair.positionX', newBound )

			}

			break
		default:
			break

		}

	}

}

const nextWindow = () => {

	const targetWindow = windows.getActiveWindow()
	const windowsList = windows.getAllWindows()
	const index = windowsList.indexOf( targetWindow )
	const nextWin = windowsList[( index + 1 ) % windowsList.length]
	nextWin.focus()

}

const onWillResize = ( _event, newBounds ) => {

	if ( !newBounds ) {

		return

	}

	// App width/height MUST BE EVEN for followMouse to work
	const { height } = newBounds
	let scale = Math.round( height / 100 )
	scale = scale > 0 ? scale : 1

	log.info( `Setting scale: ${scale}` )

	// todo: we're cheating because importing set here causes circular import
	windows.win.webContents.send( 'set_properties', { '--crosshair-scale': scale } )

}

// Prevent opening windows off-screen; Must pass width/height to set safely
const safeSetBounds = ( win, bounds ) => {

	let currentBounds
	if ( !( bounds.width && bounds.height ) ) {

		currentBounds = win.getBounds()

	}

	// Prevent fractional pixel valuess
	bounds = {
		...currentBounds,
		...bounds,
		...( bounds.x && { x: Math.round( bounds.x ) } ),
		...( bounds.y && { y: Math.round( bounds.y ) } ),
	}

	// Prevent windows opening offscreen
	const screenArea = screen.getDisplayNearestPoint( bounds ).workArea
	if ( bounds.x + bounds.width > screenArea.width + screenArea.x ) {

		bounds.x = screenArea.width - bounds.width

	}

	if ( bounds.y + bounds.height > screenArea.height + screenArea.y ) {

		bounds.y = screenArea.height - bounds.height

	}

	win.setBounds( bounds )

}

// -1 to disable
const setProgress = percentage => {

	windows.win.setProgressBar( percentage || -1 )

}

const unregister = () => {

	if ( windows.win ) {

		windows.win.removeAllListeners( 'move' )

	}

}

const windows = {

	init,
	load,
	each,
	center,
	create,
	createShadow,
	closeShadow,
	closeAllShadows,
	closeWindow,
	createChooser,
	getActiveWindow,
	hidden: false,
	hideChooserWindow,
	hideSettingsWindow,
	hideWindow,
	moveToNextDisplay,
	moveWindow,
	nextWindow,
	onWillResize,
	safeSetBounds,
	setProgress,
	shadowWindows: new Set(),
	showHideWindow,
	showWindow,
	unregister,
	win: null,
	chooserWindow: null,
	preferencesWindow: null,

}

module.exports = windows
