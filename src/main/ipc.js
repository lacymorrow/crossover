const { ipcMain } = require( 'electron' )
const autoUpdate = require( './auto-update' )
const crossover = require( './crossover' )
const preferences = require( './preferences' ).init()
const helpers = require( './helpers' )
const log = require( './log' )
const reset = require( './reset' )
const announcement = require( './announcement' )
const set = require( './set' )
const sound = require( './sound' )
const windows = require( './windows' )

const init = () => {

	/* IP Communication */
	ipcMain.on( 'log', ( _event, arg ) => {

		log.info( arg )

	} )

	ipcMain.on( 'error', ( event, arg ) => {

		log.error( arg )

	} )

	ipcMain.on( 'get_crosshairs', async _ => {

		// Setup crosshair chooser, must come before the check below
		if ( windows.chooserWindow ) {

			windows.chooserWindow.webContents.send( 'load_crosshairs', {
				crosshairs: await helpers.getCrosshairImages(),
				current: preferences.value( 'crosshair.crosshair' ),
			} )

		}

	} )

	ipcMain.on( 'close_chooser', _ => {

		windows.hideChooserWindow()

	} )

	ipcMain.on( 'close_window', event => {

		// Close a shadow window
		windows.closeShadow( event.sender.id )

	} )

	ipcMain.on( 'center_window', () => {

		log.info( 'Center window' )
		sound.play( 'CENTER' )
		windows.center()

	} )

	ipcMain.on( 'focus_window', async _ => {

		await windows.init()
		windows.win.focus()

	} )

	ipcMain.on( 'open_chooser', _ => {

		crossover.openChooserWindow()

	} )

	ipcMain.on( 'open_settings', _ => {

		crossover.openSettingsWindow()

	} )

	ipcMain.on( 'save_custom_image', ( event, arg ) => {

		log.info( `Setting custom image: ${arg}` )
		set.custom( arg )

	} )

	ipcMain.on( 'save_crosshair', ( event, arg ) => {

		crossover.changeCrosshair( arg )

	} )

	ipcMain.on( 'update_and_restart', () => {

		autoUpdate.install()

	} )

	ipcMain.on( 'reset_preferences', ( _event, _arg ) => {

		log.info( 'RESET' )
		reset.allPreferences()

	} )

	ipcMain.on( 'quit', () => {

		crossover.quit()

	} )

	// Used for testing
	ipcMain.on( 'move_window', arg => {

		windows.moveWindow( arg )

	} )

	ipcMain.on( 'play_sound', arg => {

		sound.play( arg )

	} )

	for ( const channel of [
		'announcement_primary', 'announcement_later', 'announcement_never',
	] ) {

		ipcMain.on( channel, () => announcement.handle( channel ) )

	}

	ipcMain.on( 'set_preference', arg => {

		if ( arg.key && arg.value ) {

			preferences.value( arg.key, arg.value )

		}

	} )

	/* Internal main-process events */

	// Rebuild the app menu and the tray menu. crossover.js fires this when the
	// keybinds master switch flips (#299); it cannot call menu.init() itself
	// because menu.js and tray.js both require crossover.js. Required lazily so
	// the load order is the same as before: menu.js builds its items at module
	// load and ipc.init() runs before the first window exists.
	ipcMain.on( 'refresh_menus', () => {

		require( './menu' ).init()
		require( './tray' ).refreshMenu()

	} )

	// ipcMain.handle( 'invoke_test', async ( event, arg ) => {
	// 	console.log( 'invoke_test', arg )
	// 	return 'ok'
	// } )

}

const ipc = {
	init,
}
module.exports = ipc
