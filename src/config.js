'use strict'
const Store = require('electron-store')

module.exports = new Store({
	defaults: {
		crosshair: 'leupold-dot',
		color: '#00BCD4',
		opacity: 80,
		positionX: -1,
		positionY: -1,
		sight: 'dot',
		size: 80,
		windowLocked: false
	}
})
