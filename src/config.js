"use strict";
const Store = require("electron-store");

module.exports = new Store({
	defaults: {
		crosshair: 'leupold-dot',
		color: '#00BCD4',
		crosshair_index: 0,
		opacity: 80,
		position_x: -1,
		position_y: -1,
		sight: 'dot',
		size: 80,
		window_locked: false
	}
});
