'use strict';
const Store = require('electron-store');

module.exports = new Store({
	defaults: {
		// crosshair: 'leupold-dot',
		crosshair_index: 0,
		opacity: 80,
		position_x: -1,
		position_y: -1,
		size: 80,
		window_locked: false,
	}
});
