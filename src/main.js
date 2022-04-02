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

const errorHandling = require( './main/error-handling.js' )
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
		windows.win.webContents.send( 'set_crosshair', currentCrosshair )

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

		crossover.lockWindow( locked )

		// Show on first load if unlocked (unlocking shows already)
		// if locked we have to call show() if another window has focus
		if ( locked ) {

			windows.win.show()

		}

	}, 500 )

	if ( !windows.chooserWindow ) {

		windows.chooserWindow = await windows.createChooser( currentCrosshair )

	}

	// Window Events after windows are created
	register.events()

	windows.win.focus()

}

register.appEvents()

const ready = async () => {

	log.info( 'App ready' )

	/* MENU */
	menu.init()

	await windows.init()

	// Values include normal, floating, torn-off-menu, modal-panel, main-menu, status, pop-up-menu, screen-saver
	windows.win.setAlwaysOnTop( true, 'screen-saver' )
	// Log.info( windows.win.getNativeWindowHandle() )

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
