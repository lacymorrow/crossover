const fs = require( 'fs' )
const path = require( 'path' )
const log = require( './log' )
const save = require( './save' )
const windows = require( './windows' )
const { SUPPORTED_IMAGE_FILE_TYPES, APP_WIDTH, APP_HEIGHT, APP_WIDTH_MEDIUM, APP_HEIGHT_MEDIUM } = require( '../config/config' )
const { is } = require( 'electron-util' )
const { app, screen } = require( 'electron' )
const preferences = require( './preferences' ).init()

const { checkboxTrue } = require( '../config/utils' )

const appSize = size => {

	// Detect if setting changed and app needs updating
	let bounds = windows.win.getBounds()
	let currentMode = 'normal'
	if ( windows.win.isResizable() ) {

		// current mode resize
		currentMode = 'resize'

	}

	if ( !windows.win.isResizable() && bounds.width !== APP_WIDTH ) {

		// current mode fullscreen
		currentMode = 'fullscreen'

	}

	// Should update
	if ( size !== currentMode ) {

		log.info( `Changing to new app size: ${size}` )

		// Set resize
		if ( size === 'resize' ) {

			bounds = { ...bounds, width: APP_WIDTH_MEDIUM, height: APP_HEIGHT_MEDIUM }

			windows.win.setMinimumSize( bounds.width, bounds.height )
			windows.win.setResizable( true )
			windows.win.webContents.send( 'set_info_icon', 'resize' )

		} else {

			// Not resizable
			windows.win.setMinimumSize( APP_WIDTH, APP_HEIGHT )
			windows.win.setResizable( false )
			windows.win.webContents.send( 'set_info_icon', 'move' )

			// Set fullscreen
			if ( size === 'fullscreen' ) {

				const { width, height } = screen.getDisplayNearestPoint( windows.win.getBounds() ).workAreaSize
				bounds = { ...bounds, width, height }

			} else {

				// Set normal
				bounds = { ...bounds, width: APP_WIDTH, height: APP_HEIGHT }

			}

		}

		// Scale crosshair
		windows.onWillResize( null, bounds )

		// Resize
		windows.win.setSize( bounds.width, bounds.height, true )

		windows.center()

	}

}

const crosshair = ( src, targetWindow = windows.win ) => {

	if ( src ) {

		windows.hideChooserWindow()
		targetWindow.webContents.send( 'set_crosshair', src )
		save.crosshair( src )

	} else {

		log.info( 'Not setting null crosshair.' )

	}

}

const custom = src => {

	// Is it a file and does it have a supported extension?
	if ( fs.lstatSync( src ).isFile() && SUPPORTED_IMAGE_FILE_TYPES.includes( path.extname( src ).replace( '.', '' ) ) ) {

		crosshair( src )

	}

}

// Set position
const position = ( posX, posY, targetWindow = windows.win ) => {

	if ( posX === null || posY === null || typeof posX === 'undefined' || typeof posY === 'undefined' ) {

		return

	}

	const bounds = { x: posX, y: posY }

	windows.safeSetBounds( targetWindow,	 bounds )

	if ( targetWindow === windows.win ) {

		save.position( bounds )

	}

}

// {property, value}
const rendererProperties = ( options, targetWindow = windows.win ) => {

	targetWindow.webContents.send( 'set_properties', options )

}

// Reticle/sight
const reticle = ( reticle, targetWindow = windows.win ) => {

	targetWindow.webContents.send( 'set_reticle', reticle )

}

const startOnBoot = () => {

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

const set = {
	appSize,
	crosshair,
	custom,
	position,
	reticle,
	rendererProperties,
	startOnBoot,
}

module.exports = set
