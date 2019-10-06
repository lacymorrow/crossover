'use strict';
const Store = require('electron-store');

module.exports = new Store({
	defaults: {
		'crosshair': 'bullseye',
		'opacity': 50,
		'size': 100,
		'window_locked': false,
	}
});
