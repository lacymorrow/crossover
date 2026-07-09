const { expect, test } = require( '@playwright/test' )
const { startApp, closeApp, wait, focusedMinimizedVisible, getBounds, delays, CHOOSER_WINDOW, SETTINGS_WINDOW } = require( './helpers.js' )
const { productName } = require( '../package.json' )

let electronApp
let mainPage

test.beforeAll( async () => {

	const app = await startApp()
	electronApp = app.electronApp
	mainPage = app.mainPage

} )

test.afterAll( closeApp )
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

	// Test set_preference
	await electronApp.evaluate( async app => app.ipcMain.emit( 'set_preference', {}, { key: 'crosshair.opacity', value: 50 } ) )
	await wait( delays.short )

	const opacity = await electronApp.evaluate( async () => {

		const preferences = process.mainModule.require( './src/main/preferences.js' ).init()

		return preferences.value( 'crosshair.opacity' )

	} )
	expect( opacity ).toBe( 50 )

	// Test reset_preferences
	await electronApp.evaluate( async app => app.ipcMain.emit( 'reset_preferences', {} ) )
	await wait( delays.short )

	// Verify reset
	const newOpacity = await electronApp.evaluate( async () => {

		const preferences = process.mainModule.require( './src/main/preferences.js' ).init()

		return preferences.value( 'crosshair.opacity' )

	} )
	// Verify default opacity value is restored to 80
	expect( newOpacity ).toBe( 80 )

} )

test( 'Validate quit', async () => {

	let PASS = false

	// quit app
	await electronApp.evaluate( async app => app.ipcMain.emit( 'quit' ) )
	await wait( delays.medium )

	try {

		await mainPage.title()

	} catch {

		PASS = true

	}

	expect( PASS, 'app should be quit' ).toBeTruthy()

} )
