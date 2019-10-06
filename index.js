"use strict";
const fs = require("fs");

const path = require("path");
const { app, ipcMain, globalShortcut, BrowserWindow, Menu } = require("electron");
/// const {autoUpdater} = require('electron-updater');
const { is } = require("electron-util");
const unhandled = require("electron-unhandled");
const debug = require("electron-debug");
const contextMenu = require("electron-context-menu");
const config = require("./config");
const menu = require("./menu");

unhandled();
debug();
contextMenu();

/* Settings

	- position
	- hide shortcut
	-

	- color?

*/

// Note: Must match `build.appId` in package.json
app.setAppUserModelId("com.lacymorrow.CrossOver");

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
const crosshairsPath = "static/crosshairs";

const debounce = (func, delay) => {
    let debounceTimer
    return function() {
        const context = this
        const args = arguments
            clearTimeout(debounceTimer)
                debounceTimer
            = setTimeout(() => func.apply(context, args), delay)
    }
}

function prettify(str) {
	// Title Case and spacing
	str = str
		.split("-")
		.map(w => w[0].toUpperCase() + w.substr(1).toLowerCase())
		.join(" ");

	return str;
}

const setupCrosshairInput = () => {
	// Crosshair select options
	let crosshairs = [];
	const crosshair = config.get("crosshair");
	new Promise((resolve, reject) => {
		fs.readdir(crosshairsPath, (err, dir) => {
			if (err) reject(err);

			mainWindow.webContents.executeJavaScript(
				`document.getElementById("crosshairs").options.length = 0;`
			);

			for (let i = 0, filepath; (filepath = dir[i]); i++) {
				let filename = path.basename(filepath, ".png");
				if (!/^\..*/.test(filename)) {
					crosshairs.push(filename);
				}
			}

			for (let i = 0; i < crosshairs.length; i++) {
				mainWindow.webContents.executeJavaScript(
					`document.getElementById("crosshairs").options[${i}] = new Option('${prettify(
						crosshairs[i]
					)}', '${crosshairs[i]}');`
				);
			}

			mainWindow.webContents.executeJavaScript(
				`document.getElementById('crosshairImg').src = '${crosshairsPath}/${crosshair}.png'`
			);
			mainWindow.webContents.executeJavaScript(
				`
					for(let i = 0; i < document.getElementById("crosshairs").options.length; i++) {
						if (document.getElementById("crosshairs").options[i].value == '${crosshair}') {
							document.getElementById("crosshairs").options[i].selected = true;
						}
					};
				`
			);

			resolve(crosshairs);
		});
	});
};

const setOpacity = (opacity) => {
	config.set('opacity', opacity)
	mainWindow.webContents.executeJavaScript(
		`document.getElementById('setting-opacity').value = '${opacity}';`
	);
	mainWindow.webContents.executeJavaScript(
		`document.getElementById('output-opacity').innerText = '${opacity}';`
	);
	mainWindow.webContents.executeJavaScript(
		`document.getElementById('crosshairImg').style = 'opacity: ${opacity/100}';`
	);
}

const setSize = (size) => {
	config.set('size', size)
	mainWindow.webContents.executeJavaScript(
		`document.getElementById('setting-size').value = '${size}';`
	);
	mainWindow.webContents.executeJavaScript(
		`document.getElementById('output-size').innerText = '${size}';`
	);
	mainWindow.webContents.executeJavaScript(
		`document.getElementById('crosshair').style = 'width: ${size}px';`
	);
}

// Hides the app from the dock and CMD+Tab, necessary for staying on top macOS fullscreen windows
const setDockVisible = visible => {
	if (is.macos) {
		if (visible) {
			app.dock.show();
		} else {
			app.dock.hide();
		}
	}
};

// Allows dragging and setting options
const lockWindow = lock => {
	console.log(`Locked: ${lock}`);

	config.set("window_locked", lock);
	mainWindow.setClosable(!lock);

	if (lock) {
		// Lock
		mainWindow.webContents.executeJavaScript(
			'document.body.classList.remove("draggable")'
		);
		setDockVisible(false);
	} else {
		// Unlock
		mainWindow.webContents.executeJavaScript(
			'document.body.classList.add("draggable")'
		);
		setDockVisible(true);
		mainWindow.show();
	}
};

const setupApp = async () => {
	// Crossover chooser
	lockWindow(false);
	setupCrosshairInput();
	setOpacity(config.get('opacity'));
	setSize(config.get('size'));
};

const createMainWindow = async () => {
	const win = new BrowserWindow({
		alwaysOnTop: true,
		frame: false,
		closable: false,
		maximizable: false,
		minimizable: false,
		skipTaskbar: true,
		titleBarStyle: "customButtonsOnHover",
		transparent: true,
		hasShadow: false,
		title: app.getName(),
		resizable: false,
		show: false,
		width: 200,
		height: 300,
		webPreferences: {
			nodeIntegration: true
		}
	});

	win.setAlwaysOnTop(true, "floating", 1);
	win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

	win.on("ready-to-show", () => {
		win.show();
	});

	win.on("closed", () => {
		// Dereference the window
		// For multiple windows store them in an array
		mainWindow = undefined;
	});

	await win.loadFile(path.join(__dirname, "index.html"));

	return win;
};

// Prevent multiple instances of the app
if (!app.requestSingleInstanceLock()) {
	app.quit();
}

app.on("ready", () => {

	ipcMain.on('set_crosshair', (event, arg) => {
	  console.log(`Set crosshair: ${arg}`)
	  config.set('crosshair', arg)
	})

	ipcMain.on('set_opacity', (event, arg) => {
	  console.log(`Set opacity: ${arg}`)
	  setOpacity(arg)
	})

	ipcMain.on('set_size', (event, arg) => {
	  console.log(`Set size: ${arg}`)
	  setSize(arg)
	})

	/* Global KeyListner */
	// CMD/CTRL + SHIFT + 0
	globalShortcut.register("Control+Shift+X", () => {
		let locked = config.get("window_locked");
		lockWindow(!locked);
	});

	// updateSettings()
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
});

app.on("second-instance", () => {
	if (mainWindow) {
		if (mainWindow.isMinimized()) {
			mainWindow.restore();
		}

		mainWindow.show();
	}
});

app.on("window-all-closed", () => {
	app.quit();
});

app.on("activate", async () => {
	if (!mainWindow) {
		mainWindow = await createMainWindow();
	}
});


(async () => {
	await app.whenReady();
	Menu.setApplicationMenu(menu);
	mainWindow = await createMainWindow();
	mainWindow.nodeRequire = require;
	const saveBounds = debounce(() => {
		let bounds = mainWindow.getBounds()
		config.set('position_x', bounds.x)
		config.set('position_y', bounds.y)
	}, 1000)
	mainWindow.on('move', () => {
		saveBounds()
	})

	setupApp();
})();
