'use strict'
const Store = require( 'electron-store' )

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

const supportedImageFileTypes = [ '.bmp', '.jpg', '.jpeg', '.png', '.gif', '.webp' ]

module.exports.supportedImageFileTypes = supportedImageFileTypes

module.exports.defaults = defaults

module.exports.config = new Store( {
	defaults
} )
