'use strict'
const Store = require( 'electron-store' )

// Default app settings
const defaults = {
	crosshair: 'static/crosshairs/Actual/leupold-dot.png',
	color: '#FFF83B',
	opacity: 80,
	positionX: null,
	positionY: null,
	sight: 'dot',
	size: 60,
	windowLocked: false,

	app: {
		DISABLE_GPU: false,
		OS_STARTUP: false,
		WINDOW_FRAME: false
	}
}

// Initialize app state
const config = new Store( {
	defaults
} )

// Constants
const APP_HEIGHT = 124
const MAX_SHADOW_WINDOWS = 20
const SETTINGS_WINDOW_HEIGHT = 250
const SHADOW_WINDOW_OFFSET = 40

const SUPPORTED_IMAGE_FILE_TYPES = [ '.bmp', '.jpg', '.jpeg', '.png', '.gif', '.webp' ]

module.exports = {
	config,

	defaults,

	APP_HEIGHT,
	MAX_SHADOW_WINDOWS,
	SETTINGS_WINDOW_HEIGHT,
	SHADOW_WINDOW_OFFSET,

	SUPPORTED_IMAGE_FILE_TYPES
}
