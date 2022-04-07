// Not tested:
// - keybinds
// - drag File
// - drag window
// - native close button
// - Notification
// - Sounds

// Test:
// - Main
// 	- 2nd instance
// 	- will-quit remove shortcuts
// 	- exit code
// 	- Menu
// 	- Dock
// 	- Always visible
// - Features
// - Functions
// 	- Create child window
// - Settings
// 	- IOHooks
// - Accelerators
// 	- moveX
// 	- Lock
// 	- duplicate
// 	- center
// 	- reset
// 	- changeDisplay
// 	- hide
// - IPC
// 	- reset_preferences
// 	- close_window
// 	- save_custom_image
// 	- get_crosshairs
// 	- save_crosshair
// 	- update_and_restart
// 	- quit

const { expect, test } = require( '@playwright/test' )
const { startApp, wait, focusedMinimizedVisible, getBounds, delays, CHOOSER_WINDOW, SETTINGS_WINDOW } = require( './helpers.js' )
const { productName } = require( '../package.json' )

let electronApp
let mainPage

test.beforeAll( async () => {

	const app = await startApp()
	electronApp = app.electronApp
	mainPage = app.mainPage

} )

test.afterAll( async () => {

	if ( electronApp.windows().length > 0 ) {

		await electronApp.close()

	}

} )
// End setup

test( 'Validate center_window', async () => {

	await electronApp.evaluate( async app => app.ipcMain.emit( 'center_window' ) )
	await wait( delays.short )

	// Get app bounds
	const bounds = await getBounds( { electronApp, windowName: productName } )

	// Move
	await electronApp.evaluate( async app => {

		await app.ipcMain.emit( 'move_window', { distance: 100, direction: 'right' } )
		await app.ipcMain.emit( 'move_window', { distance: 100, direction: 'down' } )

	} )
	await wait( delays.short )

	let newBounds = await getBounds( { electronApp, windowName: productName } )

	expect( newBounds.x ).toBe( bounds.x + 100 )
	expect( newBounds.y ).toBe( bounds.y + 100 )

	// Recenter
	await electronApp.evaluate( async app => app.ipcMain.emit( 'center_window' ) )
	await wait( delays.short )

	newBounds = await getBounds( { electronApp, windowName: productName } )

	expect( newBounds.x ).toBe( bounds.x )
	expect( newBounds.y ).toBe( bounds.y )

} )

test( 'Validate open_chooser + close_chooser', async () => {

	await electronApp.evaluate( async app => app.ipcMain.emit( 'open_chooser' ) )
	await wait( delays.medium )

	let fmv = await focusedMinimizedVisible( { electronApp, windowName: CHOOSER_WINDOW } )
	// expect( fmv.focused ).toBe( true )
	expect( fmv.minimized ).toBe( false )
	expect( fmv.visible ).toBe( true )

	await electronApp.evaluate( async app => app.ipcMain.emit( 'close_chooser' ) )
	await wait( delays.medium )

	fmv = await focusedMinimizedVisible( { electronApp, windowName: CHOOSER_WINDOW } )
	// expect( fmv.focused ).toBe( false )
	expect( fmv.minimized ).toBe( false )
	expect( fmv.visible ).toBe( false )

} )

test( 'Validate open_settings + focus', async () => {

	await electronApp.evaluate( async app => app.ipcMain.emit( 'open_settings' ) )
	await wait( delays.medium )

	let fmv = await focusedMinimizedVisible( { electronApp, windowName: SETTINGS_WINDOW } )

	expect( fmv.focused ).toBe( true )
	expect( fmv.minimized ).toBe( false )
	expect( fmv.visible ).toBe( true )

	await electronApp.evaluate( async app => app.ipcMain.emit( 'focus_window' ) )
	await wait( delays.medium )

	fmv = await focusedMinimizedVisible( { electronApp, windowName: productName } )

	expect( fmv.focused ).toBe( true )
	expect( fmv.minimized ).toBe( false )
	expect( fmv.visible ).toBe( true )

} )

test( 'Validate set_preference + reset_preference', async () => {

} )

test( 'Validate quit', async () => {

	let PASS = false

	// quit app
	await electronApp.evaluate( async app => app.ipcMain.emit( 'quit' ) )

	try {

		console.log( 'This should throw an error!', await mainPage.title() )

	} catch {

		PASS = true

	}

	expect( PASS, 'app should be quit' ).toBeTruthy()

} )
