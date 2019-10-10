'use strict'
const fs = require('fs')

const path = require('path')
const {app, ipcMain, globalShortcut, BrowserWindow, Menu} = require('electron')
// Const {autoUpdater} = require('electron-updater')
const {is} = require('electron-util')
const unhandled = require('electron-unhandled')
const debug = require('electron-debug')
// Const contextMenu = require('electron-context-menu')
const {debounce} = require('./src/util')
const config = require('./src/config')
const menu = require('./src/menu')

unhandled()
debug()
// ContextMenu();

/* TODO
	- "hide" shortcut
	- help dialog (arrow shortcut, etc)
*/

// Note: Must match `build.appId` in package.json
app.setAppUserModelId('com.lacymorrow.CrossOver')

// Uncomment this before publishing your first version.
// It's commented out as it throws an error if there are no published versions.
// if (!is.development) {
// 	const FOUR_HOURS = 1000 * 60 * 60 * 4
// 	setInterval(() => {
// 		autoUpdater.checkForUpdates()
// 	}, FOUR_HOURS)

// 	autoUpdater.checkForUpdates()
// }

// Prevent window from being garbage collected
let mainWindow
let windowHidden = false

// __static path
const __static =
	process.env.NODE_ENV === 'development'
		? 'static'
		: path.join(__dirname, '/src/static').replace(/\\/g, '\\\\')

// Crosshair images
const crosshairsPath = path.join(__static, 'crosshairs')

const createMainWindow = async () => {
	const win = new BrowserWindow({
		title: app.getName(),
		type: 'toolbar',
		titleBarStyle: 'customButtonsOnHover',
		alwaysOnTop: true,
		frame: false,
		hasShadow: false,
		closable: true,
		fullscreenable: false,
		maximizable: false,
		minimizable: false,
		resizable: false,
		skipTaskbar: true,
		transparent: true,
		show: false,
		width: 200,
		height: 350,
		webPreferences: {
			nodeIntegration: true
		}
	})

	setDockVisible(false)
	win.setVisibleOnAllWorkspaces(true, {visibleOnFullScreen: true})
	setDockVisible(true)

	win.on('ready-to-show', () => {
		win.show()
	})

	win.on('closed', () => {
		// Dereference the window
		// For multiple windows store them in an array
		mainWindow = undefined
	})

	await win.loadFile(path.join(__dirname, 'src/index.html'))

	return win
}

// Save position to settings
const saveBounds = debounce(() => {
	const bounds = mainWindow.getBounds()
	config.set('positionX', bounds.x)
	config.set('positionY', bounds.y)
}, 1000)

// Title Case and spacing
function prettyFilename(str) {
	str = str
		.split('-')
		.map(w => w[0].toUpperCase() + w.substr(1).toLowerCase())
		.join(' ')

	return str
}

const setupCrosshairInput = () => {
	// Crosshair select options
	const crosshair = config.get('crosshair')
	console.log(crosshair)

	return new Promise((resolve, reject) => {
		const crosshairs = []
		fs.readdir(crosshairsPath, (err, dir) => {
			if (err) reject(new Error(`Promise Errored: ${err}`, crosshairsPath))

			mainWindow.webContents.executeJavaScript(
				`document.querySelector("#crosshairs").options.length = 0;`
			)
			mainWindow.webContents.executeJavaScript(
				`document.querySelector("#crosshairs").options[0] = new Option('-----', 'none');`
			)

			for (let i = 0, filepath; (filepath = dir[i]); i++) {
				const filename = path.basename(filepath, '.png')
				if (!/^\..*/.test(filename)) {
					crosshairs.push(filename)
				}
			}

			for (let i = 0; i < crosshairs.length; i++) {
				mainWindow.webContents.executeJavaScript(
					`document.querySelector("#crosshairs").options[${i +
						1}] = new Option('${prettyFilename(crosshairs[i])}', '${crosshairs[i]}');`
				)
			}

			if (crosshair === 'none') {
				mainWindow.webContents.executeJavaScript(
					`document.querySelector('#crosshairImg').style.display = 'none'`
				)
			} else {
				mainWindow.webContents.executeJavaScript(
					`document.querySelector('#crosshairImg').style.display = 'block'`
				)
				mainWindow.webContents.executeJavaScript(
					`document.querySelector('#crosshairImg').src = 'static/crosshairs/${crosshair}.png'`
				)
			}

			mainWindow.webContents.executeJavaScript(
				`
					for(let i = 0; i < document.querySelector("#crosshairs").options.length; i++) {
						if (document.querySelector("#crosshairs").options[i].value == '${crosshair}') {
							document.querySelector("#crosshairs").options[i].selected = true;
						}
					};
				`
			)

			resolve(crosshairs)
		})
	})
}

const setColor = color => {
	config.set('color', color)
	mainWindow.webContents.executeJavaScript(
		`document.querySelector('.sight').style.setProperty('--sight-background', '${color}');`
	)
}

const setOpacity = opacity => {
	config.set('opacity', opacity)
	mainWindow.webContents.executeJavaScript(
		`document.querySelector('#setting-opacity').value = '${opacity}';`
	)
	mainWindow.webContents.executeJavaScript(
		`document.querySelector('#output-opacity').innerText = '${opacity}';`
	)
	mainWindow.webContents.executeJavaScript(
		`document.querySelector('#crosshairImg').style.opacity = '${opacity /
			100}';`
	)
	mainWindow.webContents.executeJavaScript(
		`document.querySelector('.sight').style.opacity = '${opacity / 100}';`
	)
}

const setPosition = (posX, posY) => {
	config.set('positionX', posX)
	config.set('positionY', posY)
	mainWindow.setBounds({x: posX, y: posY})
}

const setSight = className => {
	config.set('sight', className)

	mainWindow.webContents.executeJavaScript(
		`document.querySelector('.sight').classList.remove('dot', 'cross', 'off');`
	)
	mainWindow.webContents.executeJavaScript(
		`document.querySelector('.sight').classList.add('${className}');`
	)
	mainWindow.webContents.executeJavaScript(
		`document.querySelector('.radio.${className} input').checked = true;`
	)
}

const setSize = size => {
	config.set('size', size)
	mainWindow.webContents.executeJavaScript(
		`document.querySelector('#setting-size').value = '${size}';`
	)
	mainWindow.webContents.executeJavaScript(
		`document.querySelector('#output-size').innerText = '${size}';`
	)
	mainWindow.webContents.executeJavaScript(
		`document.querySelector('#crosshair').style = 'width: ${size}px;height: ${size}px;';`
	)
}

// Hides the app from the dock and CMD+Tab, necessary for staying on top macOS fullscreen windows
const setDockVisible = visible => {
	if (is.macos) {
		if (visible) {
			app.dock.show()
		} else {
			app.dock.hide()
		}
	}
}

const centerWindow = () => {
	mainWindow.center()
}

const hideWindow = () => {
	if (windowHidden) {
		mainWindow.show()
	} else {
		mainWindow.hide()
	}

	windowHidden = !windowHidden
}

// Allows dragging and setting options
const lockWindow = lock => {
	console.log(`Locked: ${lock}`)

	config.set('windowLocked', lock)
	mainWindow.webContents.executeJavaScript(`coHidePickr()`)
	mainWindow.setClosable(!lock)
	mainWindow.setIgnoreMouseEvents(lock)

	if (lock) {
		// Lock
		mainWindow.webContents.executeJavaScript(
			'document.body.classList.remove("draggable")'
		)
	} else {
		// Unlock
		mainWindow.webContents.executeJavaScript(
			'document.body.classList.add("draggable")'
		)
		mainWindow.show()
	}
}

const moveWindow = direction => {
	const locked = config.get('windowLocked')
	if (!locked) {
		let newBound
		const mainWindow = BrowserWindow.getFocusedWindow()
		const bounds = mainWindow.getBounds()
		switch (direction) {
			case 'up':
				newBound = bounds.y - 1
				config.set('positionY', newBound)
				mainWindow.setBounds({y: newBound})
				break
			case 'down':
				newBound = bounds.y + 1
				config.set('positionY', newBound)
				mainWindow.setBounds({y: newBound})

				break
			case 'left':
				newBound = bounds.x - 1
				config.set('positionX', newBound)
				mainWindow.setBounds({x: newBound})
				break
			case 'right':
				newBound = bounds.x + 1
				config.set('positionX', newBound)
				mainWindow.setBounds({x: newBound})
				break
			default:
				break
		}
	}
}

const resetSettings = () => {
	config.delete('crosshair')
	config.delete('color')
	config.delete('opacity')
	config.delete('positionX')
	config.delete('positionY')
	config.delete('sight')
	config.delete('size')
	config.delete('windowLocked')
	setupApp()
}

const setupApp = async () => {
	// Color chooser
	mainWindow.webContents.executeJavaScript(
		`pickr.setColor('${config.get('color')}')`
	)
	lockWindow(false)
	setupCrosshairInput()
	setColor(config.get('color'))
	setOpacity(config.get('opacity'))
	setSight(config.get('sight'))
	setSize(config.get('size'))
	if (config.get('positionX') > -1) {
		setPosition(config.get('positionX'), config.get('positionY'))
	} else {
		centerWindow()
	}
}


// Prevent multiple instances of the app
if (!app.requestSingleInstanceLock()) {
	app.quit()
}

// Opening 2nd instance focuses app
app.on('second-instance', () => {
	if (mainWindow) {
		if (mainWindow.isMinimized()) {
			mainWindow.restore()
		}

		mainWindow.show()
	}
})

app.on('window-all-closed', () => {
	app.quit()
})

app.on('activate', async () => {
	if (!mainWindow) {
		mainWindow = await createMainWindow()
	}
})

app.on('ready', () => {
	/* IP Communication */

	ipcMain.on('set_crosshair', (event, arg) => {
		console.log(`Set crosshair: ${arg}`)
		config.set('crosshair', arg)
	})

	ipcMain.on('set_color', (event, arg) => {
		console.log(`Set color: ${arg}`)
		config.set('color', arg)
	})

	ipcMain.on('set_opacity', (event, arg) => {
		console.log(`Set opacity: ${arg}`)
		setOpacity(arg)
	})

	ipcMain.on('set_sight', (event, arg) => {
		console.log(`Set sight: ${arg}`)
		setSight(arg)
	})

	ipcMain.on('set_size', (event, arg) => {
		console.log(`Set size: ${arg}`)
		setSize(arg)
	})

	ipcMain.on('center', () => {
		console.log(`Center window`)
		centerWindow()
	})

	ipcMain.on('quit', () => {
		app.quit()
	})

	/* Global KeyListners */

	// Toggle CrossOver
	globalShortcut.register('Control+Shift+X', () => {
		const locked = config.get('windowLocked')
		lockWindow(!locked)
	})

	// Hide CrossOver
	globalShortcut.register('Control+Shift+E', () => {
		hideWindow()
	})

	// Reset CrossOver
	globalShortcut.register('Control+Shift+R', () => {
		resetSettings()
	})

	// Single pixel movement
	globalShortcut.register('Control+Shift+Up', () => {
		moveWindow('up')
	})
	globalShortcut.register('Control+Shift+Down', () => {
		moveWindow('down')
	})
	globalShortcut.register('Control+Shift+Left', () => {
		moveWindow('left')
	})
	globalShortcut.register('Control+Shift+Right', () => {
		moveWindow('right')
	})
})

;(async () => {
	await app.whenReady()
	Menu.setApplicationMenu(menu)
	mainWindow = await createMainWindow()

	mainWindow.on('move', () => {
		saveBounds()
	})

	setupApp()
})()
