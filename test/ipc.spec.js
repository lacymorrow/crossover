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
// 	- restart_app
// 	- quit

const { expect, test } = require( '@playwright/test' )
const { startApp, wait, focusedMinimizedVisible, getBounds, delays, CHOOSER_WINDOW, SETTINGS_WINDOW } = require( './helpers.js' )
const { productName } = require( '../package.json' )

let electronApp

test.beforeAll( async () => {

	const app = await startApp()
	electronApp = app.electronApp

} )
// End setup

test( 'Validate center_window', async () => {

	await electronApp.evaluate( async app => app.ipcMain.emit( 'center_window' ) )
	await wait( delays.short )

	// Get app bounds
	const bounds = await getBounds( { electronApp, windowName: productName } )

	// Move
	await electronApp.evaluate( async app => {

		await app.ipcMain.emit( 'move_window', { distance: 50, direction: 'right' } )
		await app.ipcMain.emit( 'move_window', { distance: 50, direction: 'down' } )

	} )
	await wait( delays.short )

	let newBounds = await getBounds( { electronApp, windowName: productName } )

	expect( newBounds.x ).toBe( bounds.x + 50 )
	expect( newBounds.y ).toBe( bounds.y + 50 )

	// Recenter
	await electronApp.evaluate( async app => app.ipcMain.emit( 'center_window' ) )
	await wait( delays.short )

	newBounds = await getBounds( { electronApp, windowName: productName } )

	expect( newBounds.x ).toBe( bounds.x )
	expect( newBounds.y ).toBe( bounds.y )

} )

test( 'Validate open_chooser + close_chooser', async () => {

	await electronApp.evaluate( async app => app.ipcMain.emit( 'open_chooser' ) )
	await wait( delays.short )

	let fmv = await focusedMinimizedVisible( { electronApp, windowName: CHOOSER_WINDOW } )

	expect( fmv.focused ).toBe( true )
	expect( fmv.minimized ).toBe( false )
	expect( fmv.visible ).toBe( true )

	await electronApp.evaluate( async app => app.ipcMain.emit( 'close_chooser' ) )
	await wait( delays.short )

	fmv = await focusedMinimizedVisible( { electronApp, windowName: CHOOSER_WINDOW } )

	expect( fmv.focused ).toBe( false )
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
	await wait( delays.short )

	fmv = await focusedMinimizedVisible( { electronApp, windowName: productName } )

	expect( fmv.focused ).toBe( true )
	expect( fmv.minimized ).toBe( false )
	expect( fmv.visible ).toBe( true )

} )

test( 'Validate set_preference + reset_preference', async () => {

} )
