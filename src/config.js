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
const APP_HEIGHT = 125
const CHILD_WINDOW_OFFSET = 25

const SUPPORTED_IMAGE_FILE_TYPES = [ '.bmp', '.jpg', '.jpeg', '.png', '.gif', '.webp' ]

module.exports = {
	config,

	defaults,

	APP_HEIGHT,
	CHILD_WINDOW_OFFSET,

	SUPPORTED_IMAGE_FILE_TYPES
}
