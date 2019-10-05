'use strict';
const fs = require('fs');

const path = require('path');
const {app, globalShortcut, BrowserWindow, Menu} = require('electron');
/// const {autoUpdater} = require('electron-updater');
const {is} = require('electron-util');
const unhandled = require('electron-unhandled');
const debug = require('electron-debug');
const contextMenu = require('electron-context-menu');
const config = require('./config');
const menu = require('./menu');

unhandled();
debug();
contextMenu();

/* Settings

	- crosshair
	- size
	- position
	- opacity
	- hide shortcut
	-

	- color?

*/

// Note: Must match `build.appId` in package.json
app.setAppUserModelId('com.lacymorrow.CrossOver');

// Uncomment this before publishing your first version.
// It's commented out as it throws an error if there are no published versions.
// if (!is.development) {
// 	const FOUR_HOURS = 1000 * 60 * 60 * 4;
// 	setInterval(() => {
// 		autoUpdater.checkForUpdates();
// 	}, FOUR_HOURS);
//
// 	autoUpdater.checkForUpdates();
// }

// Prevent window from being garbage collected
let mainWindow;

// Crosshair images
let crosshairs = []
const crosshairsPath = 'static/crosshairs'

fs.readdir(crosshairsPath, (err, dir) => {
    for (var i = 0, filepath; filepath = dir[i]; i++) {
    	let filename = path.basename(filepath, '.png')
    	if(! /^\..*/.test(filename)) {
	        // display files
    		console.log(filename);
    		crosshairs.push(filename)
	    }
    }
});

const createMainWindow = async () => {
	const win = new BrowserWindow({
		alwaysOnTop: true,
		frame: false,
		closable: false,
		maximizable: false,
		minimizable: false,
		skipTaskbar: true,
		titleBarStyle: 'customButtonsOnHover',
		transparent: true,
		hasShadow: false,
		title: app.getName(),
		resizable: true,
		show: false,
		width: 100,
		height: 100
	});

	// Hides the app from the dock and CMD+Tab, necessary for staying on top macOS fullscreen windows
	app.dock.hide();
	win.setAlwaysOnTop(true, "floating", 1);
	win.setVisibleOnAllWorkspaces(true, {visibleOnFullScreen: true})

	win.on('ready-to-show', () => {
		win.show();
	});

	win.on('closed', () => {
		// Dereference the window
		// For multiple windows store them in an array
		mainWindow = undefined;
	});

	await win.loadFile(path.join(__dirname, 'index.html'));

	return win;
};

const lockWindow = (lock) => {
	console.log(`Locked: ${lock}`)

	mainWindow.setClosable(!lock)
	mainWindow.setResizable(!lock)

	if (lock) {

		// Lock
		mainWindow.webContents.executeJavaScript('document.body.classList.remove("draggable")')
		app.dock.hide();
	} else {

		// Unlock
		mainWindow.webContents.executeJavaScript('document.body.classList.add("draggable")')
		app.dock.show();
		mainWindow.show()
	}
}

// Prevent multiple instances of the app
if (!app.requestSingleInstanceLock()) {
	app.quit();
}

app.on('ready', () => {
	/* Global KeyListner */
	// CMD/CTRL + SHIFT + 0
	globalShortcut.register('Control+Shift+X', () => {
		let unlocked = app.dock.isVisible();
		lockWindow(unlocked)
	})
	// globalShortcut.register('Control+Shift+Up', () => {
	// 	let unlocked = app.dock.isVisible();
	// 	if(unlocked) {
	// 		let bounds = mainWindow.getBounds()
	// 		mainWindow.setBounds({ y: bounds.y - 1})
	// 	}
	// })
	// globalShortcut.register('Control+Shift+Down', () => {
	// 	let unlocked = app.dock.isVisible();
	// 	if(unlocked) {
	// 		let bounds = mainWindow.getBounds()
	// 		mainWindow.setBounds({ y: bounds.y + 1})
	// 	}
	// })
	// globalShortcut.register('Control+Shift+Left', () => {
	// 	let unlocked = app.dock.isVisible();
	// 	if(unlocked) {
	// 		let bounds = mainWindow.getBounds()
	// 		mainWindow.setBounds({ x: bounds.x - 1})
	// 	}
	// })
	// globalShortcut.register('Control+Shift+Right', () => {
	// 	let unlocked = app.dock.isVisible();
	// 	if(unlocked) {
	// 		let bounds = mainWindow.getBounds()
	// 		mainWindow.setBounds({ x: bounds.x + 1})
	// 	}
	// })
})

app.on('second-instance', () => {
	if (mainWindow) {
		if (mainWindow.isMinimized()) {
			mainWindow.restore();
		}

		mainWindow.show();
	}
});

app.on('window-all-closed', () => {
	app.quit();
});

app.on('activate', async () => {
	if (!mainWindow) {
		mainWindow = await createMainWindow();
	}
});

// var resizeTimeout;
// app.on('resize', (e)=>{
//     clearTimeout(resizeTimeout);
//     resizeTimeout = setTimeout(function(){
//         var size = mainWindow.getSize();
//         mainWindow.setSize(size[0], size[0]);
//     }, 100);
// });

(async () => {
	await app.whenReady();
	Menu.setApplicationMenu(menu);
	mainWindow = await createMainWindow();

	const crosshair = config.get('crosshair');
	mainWindow.webContents.executeJavaScript(`document.querySelector('.crosshairImg').src = '${crosshairsPath}/${crosshair}.png'`);
})();
