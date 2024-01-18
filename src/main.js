/*
	BUGS:
	- current crosshair border doesn't work 1st time
	- Windows: Flashes when hiding/showing on hidemouse/hidekey
	- Windows: dragging image onto webkit-app-region: drag doesn't work
	- Keybind settings don't display on first load ?

	- size: fullscreen windows open offscreen (fix)
	- followmouse didnt work without another hook running
	- shadow window opaque (fix)
	- debounce shorter (fix)
	- restore position after unlocking after followmouse (fix)
	- followmouse broken (fix)
	- iohook hide on mouse broken (fix)
	- sync settings brings crosshair in front of settings (fix)
	- tilt left/right default binds (fix)
	- Resize doesn't work in top right info-icon windows (fixed)
	- windows file chooser doesn't work for file types (fixed)

	Todo:
		- Add labels or tooltips for buttons
		- electron builder dont bundle unneeded files
		- click tray show menu; dblclick show app
		- SECURITY: remove unsafe-eval; turn off remote module

	Todo: when updating electron to 12+:
		- Test iohook
		- Test closing the devtools windows, opacity should not go to 100%

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
const debug = require( 'electron-debug' )
const { checkboxTrue } = require( './config/utils.js' )

const { is } = require( './main/util' )
const errorHandling = require( './main/error-handling.js' )
const log = require( './main/log.js' )
const preferences = require( './main/preferences.js' ).init()
const sound = require( './main/sound.js' )
const autoUpdate = require( './main/auto-update.js' )
const menu = require( './main/menu.js' )
const register = require( './main/register.js' )
const init = require( './main/init.js' )
const reset = require( './main/reset.js' )
const tray = require( './main/tray.js' )
const { appId } = require( '../package.json' )
const { menuBarHeight } = require( 'electron-util' )

const start = async () => {

	// Handle errors early
	await errorHandling.init()

	/* App setup */
	console.log( '***************' )
	log.info( `CrossOver ${app.getVersion()} ${is.development ? '* Development *' : ''}` )

	// Enable sandbox globally
	// app.enableSandbox()

	// Prevent multiple instances of the app
	if ( !app.requestSingleInstanceLock() ) {

		app.quit()

	}

	// Note: Must match `build.appId` in package.json
	app.setAppUserModelId( appId )

	// Debug Settings
	debug( {
		showDevTools: is.development && !is.linux,
		devToolsMode: 'undocked',
	} )

	// Electron reloader is janky sometimes
	// try {
	//  require( 'electron-reloader' )( module )
	// } catch {}

	// Const contextMenu = require('electron-context-menu')
	// contextMenu()

	/* LINUX FIXES */
	// More flags: https://www.electronjs.org/docs/latest/api/command-line-switches/

	// Disable hardware acceleration
	if ( checkboxTrue( preferences.value( 'app.gpu' ), 'gpu' ) ) {

		log.info( 'Setting: Enable GPU' )

	} else {

		// Disable hardware acceleration
		log.info( 'Setting: Disable GPU' )
		app.commandLine.appendSwitch( 'enable-transparent-visuals' )
		app.commandLine.appendSwitch( 'disable-gpu' )
		app.disableHardwareAcceleration()

	}

	// Fix for Linux transparency issues: wayland on linux/sway
	// This switch runs the GPU process in the same process as the browser, which can help avoid the issues with transparency.
	// https://github.com/microsoft/vscode/issues/146464
	// https://www.electronjs.org/docs/latest/api/command-line-switches/#in-process-gpu
	if ( !checkboxTrue( preferences.value( 'app.gpuprocess' ), 'gpuprocess' ) ) {

		log.info( 'Setting: Sharing GPU process and browser' )

		app.commandLine.appendSwitch( 'in-process-gpu' )
		app.commandLine.appendSwitch( 'use-gl=desktop' )

	}

}

const ready = async () => {

	// Things in here are only run once, ever.
	// If it resets on startup, put it in init() (YOU PROBABLY WANT INIT)

	log.info( 'App ready' )

	// Allow command-line reset
	if ( process.env.CROSSOVER_RESET ) {

		log.info( 'Command-line reset triggered' )
		reset.app( true )

		return

	}

	/* Press Play >>> */
	await init()

	/* TRAY */
	tray.init()

	/* MENU */
	menu.init()

	/* SOUND */
	sound.preload()

	/* AUTO-UPDATE */
	autoUpdate.update()

	// Alert from developer
	// alert.init()

	console.timeEnd( 'init' )

	console.log( menuBarHeight() )

}

module.exports = async () => {

	// Error handling, debug, appId, and command-line flags
	await start()

	// app.on(...)
	register.appEvents()

	// Quit app when all windows are closed; Fix for Linux tray
	app.on( 'before-quit', _ => {

		// https://electronjs.org/docs/api/app#event-before-quit
		// https://electronjs.org/docs/api/tray#traydestroy
		tray.instance?.destroy()

	} )

	// wait for app.on('ready')
	await app.whenReady()
	//  Remove tray in Linux to fully quit

	console.timeLog( 'init' )

	// Added 400 ms to fix the black background issue while using transparent window. More details at https://github.com/electron/electron/issues/15947
	setTimeout( ready, 500 )

}
