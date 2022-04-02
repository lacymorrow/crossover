/*
	Changed:
		#20 Custom keybinds
		#85 turn off updates
		#84 Mouse hooks
		#70 Performance settings - gpu
		#86 start on boot
		#88 allow disable keybinds
		hide settings on blur
		Custom crosshair should be a setting

	High:
		test window placement on windows/mac
		fix unhandled #81

	Medium:
		polish menu
		shadow window bug on move to next display

	Low:
		Conflicting accelerator on Fedora
		dont set.position if monitor has been unplugged
*/

// const NativeExtension = require('bindings')('NativeExtension');

console.time( 'init' )

const process = require( 'process' )

const { app } = require( 'electron' )
const { is } = require( 'electron-util' )
const debug = require( 'electron-debug' )
const { checkboxTrue } = require( './config/utils.js' )
const keycode = require( './config/keycode.js' )
const { APP_HEIGHT, APP_WIDTH } = require( './config/config.js' )

const dock = require( './main/dock.js' )
const errorHandling = require( './main/error-handling.js' )
const iohook = require( './main/iohook.js' )
const log = require( './main/log.js' )
const set = require( './main/set.js' )
const preferences = require( './main/electron-preferences.js' )
const windows = require( './main/windows.js' )
const sound = require( './main/sound.js' )
const reset = require( './main/reset.js' )
const autoUpdate = require( './main/auto-update.js' )
const menu = require( './main/menu.js' )
const register = require( './main/register.js' )
const ipc = require( './main/ipc.js' )
const crossover = require( './main/crossover.js' )
let ioHook

/* App setup */
console.log( '***************' )
log.info( `CrossOver ${app.getVersion()} ${is.development ? '* Development *' : ''}` )

// Handle errors early
errorHandling.init()

// Prevent multiple instances of the app
if ( !app.requestSingleInstanceLock() ) {

	app.quit()

}

// Note: Must match `build.appId` in package.json
app.setAppUserModelId( 'com.lacymorrow.crossover' )

// Debug Settings
debug( {
	showDevTools: is.development && !is.linux,
	devToolsMode: 'undocked',
} )

// Electron reloader is janky sometimes
// try {
//  require( 'electron-reloader' )( module )
// } catch {}

//
// Const contextMenu = require('electron-context-menu')
// contextMenu()

// Fix for Linux transparency issues
if ( is.linux || !checkboxTrue( preferences.value( 'app.gpu' ), 'gpu' ) ) {

	// Disable hardware acceleration
	log.info( 'Setting: Disable GPU' )
	app.commandLine.appendSwitch( 'enable-transparent-visuals' )
	app.commandLine.appendSwitch( 'disable-gpu' )
	app.disableHardwareAcceleration()

} else {

	log.info( 'Setting: Enable GPU' )

}

// Prevent window from being garbage collected
let mainWindow
let chooserWindow

// Allows dragging and setting options
const lockWindow = ( lock, targetWindow = mainWindow ) => {

	log.info( `Locked: ${lock}` )

	windows.hideChooserWindow()
	windows.hideSettingsWindow()
	targetWindow.closable = !lock
	targetWindow.setFocusable( !lock )
	targetWindow.setIgnoreMouseEvents( lock )
	targetWindow.webContents.send( 'lock_window', lock )

	if ( lock ) {

		// Don't save bounds when locked
		if ( targetWindow === mainWindow ) {

			mainWindow.removeAllListeners( 'move' )

		}

		/* Actions */
		const followMouse = checkboxTrue( preferences.value( 'mouse.followMouse' ), 'followMouse' )
		const hideOnMouse = Number.parseInt( preferences.value( 'mouse.hideOnMouse' ), 10 )
		const hideOnKey = preferences.value( 'mouse.hideOnKey' )
		const tilt = checkboxTrue( preferences.value( 'mouse.tiltEnable' ), 'tiltEnable' )

		iohook.unregisterIOHook()

		if ( followMouse ) {

			registerFollowMouse()

		}

		if ( hideOnMouse !== -1 ) {

			registerHideOnMouse()

		}

		if ( hideOnKey ) {

			registerHideOnKey()

		}

		if ( tilt && ( preferences.value( 'mouse.tiltLeft' ) || preferences.value( 'mouse.tiltRight' ) ) ) {

			registerTilt()

		}

		// Values include normal, floating, torn-off-menu, modal-panel, main-menu, status, pop-up-menu, screen-saver
		targetWindow.setAlwaysOnTop( true, 'screen-saver' )

	} else {

		/* Unlock */

		// Unregister
		iohook.unregisterIOHook()

		// Enable saving bounds
		if ( targetWindow === mainWindow ) {

			register.saveWindowBounds()

		}

		// Allow dragging to Window on Mac
		targetWindow.setAlwaysOnTop( true, 'modal-panel' )

		// Bring window to front
		targetWindow.show()

	}

	dock.setVisible( !lock )

	preferences.value( 'hidden.locked', lock )

}

const registerFollowMouse = async () => {

	// Prevent saving bounds
	mainWindow.removeAllListeners( 'move' )

	log.info( 'Setting: Mouse Follow' )
	ioHook = await iohook.importIoHook()
	ioHook.removeAllListeners( 'mousemove' )

	// Register
	ioHook.on( 'mousemove', event => {

		mainWindow.setBounds( {
			x: event.x - ( APP_WIDTH / 2 ),
			y: event.y - ( APP_HEIGHT / 2 ),
		} )

	} )

}

const registerHideOnMouse = async () => {

	log.info( 'Setting: Mouse Hide' )
	ioHook = await iohook.importIoHook()

	const mouseButton = Number.parseInt( preferences.value( 'mouse.hideOnMouse' ), 10 )

	// Register
	ioHook.on( 'mousedown', event => {

		if ( event.button === mouseButton ) {

			windows.hideWindow()

		}

	} )

	ioHook.on( 'mouseup', event => {

		if ( event.button === mouseButton ) {

			windows.showWindow()

		}

	} )

	// Register and start hook
	ioHook.start()

}

const registerHideOnKey = async () => {

	log.info( 'Setting: Keyboard Hide' )
	ioHook = await iohook.importIoHook()

	const hideOnKey = preferences.value( 'mouse.hideOnKey' )

	if ( Object.prototype.hasOwnProperty.call( keycode, hideOnKey ) ) {

		const key = keycode[hideOnKey]

		// Register
		ioHook.registerShortcut(
			[ key ],
			_ => {

				windows.hideWindow()

			},
			_ => {

				windows.showWindow()

			},
		)

		// Register and start hook
		ioHook.start()

	}

}

const tiltCrosshair = angle => {

	if ( angle ) {

		mainWindow.webContents.send( 'tilt', angle )

	} else {

		mainWindow.webContents.send( 'untilt' )

	}

}

const registerTilt = async () => {

	let leftKey
	let rightKey
	const tiltAngle = Number.parseInt( preferences.value( 'mouse.tiltAngle' ), 10 )
	const tiltToggle = checkboxTrue( preferences.value( 'mouse.tiltToggle' ), 'tiltToggle' )
	const tiltLeft = preferences.value( 'mouse.tiltLeft' )
	const tiltRight = preferences.value( 'mouse.tiltRight' )

	log.info( 'Setting: Tilt' )
	ioHook = await iohook.importIoHook()

	if ( Object.prototype.hasOwnProperty.call( keycode, tiltLeft ) ) {

		leftKey = Number.parseInt( keycode[tiltLeft], 10 )

		if ( tiltToggle ) {

			ioHook.registerShortcut(
				[ leftKey ],
				_ => {

					const tilted = preferences.value( 'hidden.tilted' )
					if ( tilted ) {

						tiltCrosshair( 0 )

					} else {

						tiltCrosshair( tiltAngle * -1 )

					}

					preferences.value( 'hidden.tilted', !tilted )

				},
			)

		} else {

			ioHook.registerShortcut(
				[ leftKey ],
				_ => {

					tiltCrosshair( tiltAngle * -1 )

				},
				_ => {

					tiltCrosshair( 0 )

				},
			)

		}

	}

	if ( Object.prototype.hasOwnProperty.call( keycode, tiltRight ) ) {

		rightKey = Number.parseInt( keycode[tiltRight], 10 )

		if ( tiltToggle ) {

			ioHook.registerShortcut(
				[ rightKey ],
				_ => {

					const tilted = preferences.value( 'hidden.tilted' )
					if ( tilted ) {

						tiltCrosshair( 0 )

					} else {

						tiltCrosshair( tiltAngle )

					}

					preferences.value( 'hidden.tilted', !tilted )

				},
			)

		} else {

			ioHook.registerShortcut(
				[ rightKey ],
				_ => {

					tiltCrosshair( tiltAngle )

				},
				_ => {

					tiltCrosshair( 0 )

				},
			)

		}

	}

	if ( leftKey || rightKey ) {

		// Register and start hook
		ioHook.start()

	}

}

const setupApp = async () => {

	// Preferences
	preferences.value( 'hidden.showSettings', false )

	// IPC
	ipc.init()

	// Start on boot
	set.startOnBoot()

	// Set to previously selected crosshair
	const currentCrosshair = preferences.value( 'crosshair.crosshair' )

	if ( currentCrosshair ) {

		log.info( `Set crosshair: ${currentCrosshair}` )
		mainWindow.webContents.send( 'set_crosshair', currentCrosshair )

	}

	set.color( preferences.value( 'crosshair.color' ) )
	set.opacity( preferences.value( 'crosshair.opacity' ) )
	set.sight( preferences.value( 'crosshair.reticle' ) )
	set.size( preferences.value( 'crosshair.size' ) )

	// App centered by default - set position if exists
	if ( preferences.value( 'hidden.positionX' ) !== null && typeof preferences.value( 'hidden.positionX' ) !== 'undefined' ) {

		set.position( preferences.value( 'hidden.positionX' ), preferences.value( 'hidden.positionY' ) )

	}

	// Set lock state, timeout makes it pretty
	setTimeout( () => {

		// Keyboard shortcuts - delay fixes an unbreakable loop on reset, continually triggering resets
		crossover.registerKeyboardShortcuts()

		const locked = preferences.value( 'hidden.locked' )

		lockWindow( locked )

		// Show on first load if unlocked (unlocking shows already)
		// if locked we have to call show() if another window has focus
		if ( locked ) {

			mainWindow.show()

		}

	}, 500 )

	if ( !chooserWindow ) {

		chooserWindow = await windows.createChooser( currentCrosshair )

	}

	// Window Events after windows are created
	register.events()

	mainWindow.focus()

}

register.app()

const ready = async () => {

	log.info( 'App ready' )

	/* MENU */
	menu.init()

	mainWindow = await windows.init()

	// Values include normal, floating, torn-off-menu, modal-panel, main-menu, status, pop-up-menu, screen-saver
	mainWindow.setAlwaysOnTop( true, 'screen-saver' )
	// Log.info( mainWindow.getNativeWindowHandle() )

	sound.preload()

	/* AUTO-UPDATE */
	autoUpdate.update()

	// Allow command-line reset
	if ( process.env.CROSSOVER_RESET ) {

		log.info( 'Command-line reset triggered' )
		reset.app( true )

	}

	/* Press Play >>> */
	setupApp()

	console.timeEnd( 'init' )

}

module.exports = async () => {

	await app.whenReady()

	// Added 400 ms to fix the black background issue while using transparent window. More detais at https://github.com/electron/electron/issues/15947
	setTimeout( ready, 400 )

}
