'use strict'
const Store = require( 'electron-store' )

// Default app settings
const defaults = {
	crosshair: 'static/crosshairs/Actual/leupold-dot.png',
	color: '#FFF83B',
	appOpacity: 80,
	opacity: 80,
	positionX: -1,
	positionY: -1,
	sight: 'dot',
	size: 60,
	windowLocked: false
}

// Initialize app state
const config = new Store( {
	defaults
} )

// Constants
const CENTER_APP_OFFFSET_X = 132
const CENTER_APP_OFFFSET_Y = 200

const SUPPORTED_IMAGE_FILE_TYPES = [ '.bmp', '.jpg', '.jpeg', '.png', '.gif', '.webp' ]

module.exports = {
	config,

	defaults,

	CENTER_APP_OFFFSET_X,
	CENTER_APP_OFFFSET_Y,

	SUPPORTED_IMAGE_FILE_TYPES
}
