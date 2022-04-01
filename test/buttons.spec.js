const { expect, test } = require( '@playwright/test' )
const { startApp, visualMouse, wait, delays, focusedMinimizedVisible, CHOOSER_WINDOW, SETTINGS_WINDOW, getBounds } = require( './helpers.js' )
const { productName } = require( '../package.json' )

let electronApp
let mainPage

test.beforeAll( async () => {

	const app = await startApp()
	electronApp = app.electronApp
	mainPage = app.mainPage

	await visualMouse( mainPage )

} )

// End setup
test( 'Validate dblclick to center', async () => {

	const button = await mainPage.locator( '#crosshair' )
	await button.dblclick()
	await wait( delays.short )

	// Get app bounds
	const bounds = await getBounds( { electronApp, windowName: productName } )

	// Move
	await electronApp.evaluate( async ( { ipcMain } ) => {

		await ipcMain.emit( 'move_window', { distance: 50, direction: 'right' } )
		await ipcMain.emit( 'move_window', { distance: 50, direction: 'down' } )

	} )
	await wait( delays.short )

	let newBounds = await getBounds( { electronApp, windowName: productName } )

	expect( newBounds.x ).toBe( bounds.x + 50 )
	expect( newBounds.y ).toBe( bounds.y + 50 )

	// Recenter
	await button.dblclick()
	await wait( delays.short )

	newBounds = await getBounds( { electronApp, windowName: productName } )

	expect( newBounds.x ).toBe( bounds.x )
	expect( newBounds.y ).toBe( bounds.y )

} )

test( 'Validate buttons: move + center button', async () => {

	const button = await mainPage.locator( '.center-button' )
	await button.dblclick()
	await wait( delays.short )

	// Get app bounds
	const bounds = await getBounds( { electronApp, windowName: productName } )

	// Move
	await electronApp.evaluate( async ( { ipcMain } ) => {

		await ipcMain.emit( 'move_window', { distance: 50, direction: 'right' } )
		await ipcMain.emit( 'move_window', { distance: 50, direction: 'down' } )

	} )
	await wait( delays.short )

	let newBounds = await getBounds( { electronApp, windowName: productName } )

	expect( newBounds.x ).toBe( bounds.x + 50 )
	expect( newBounds.y ).toBe( bounds.y + 50 )

	// Recenter
	await button.dblclick()
	await wait( delays.short )

	newBounds = await getBounds( { electronApp, windowName: productName } )

	expect( newBounds.x ).toBe( bounds.x )
	expect( newBounds.y ).toBe( bounds.y )

} )

test( 'Validate buttons: info button', async () => {

	expect( await mainPage.locator( '.info-button .move-icon' ) ).toBeVisible()
	expect( await mainPage.locator( '.info-button .info-icon' ) ).toBeHidden()

} )

test( 'Validate buttons: chooser button', async () => {

	const button = await mainPage.locator( '.center-button' )
	button.click()

	await wait( delays.short )

	const { focused, minimized, visible } = await focusedMinimizedVisible( { electronApp, windowName: CHOOSER_WINDOW } )

	expect( focused ).toBe( true )
	expect( minimized ).toBe( false )
	expect( visible ).toBe( true )

} )

test( 'Validate buttons: preferences', async () => {

	const button = await mainPage.locator( '.settings-button' )
	button.click()

	await wait( delays.medium )

	const windows = electronApp.windows()
	const titles = await Promise.all(
		windows.map( async w => {

			const i = await w.title()

			return i

		} ),
	)

	console.log( 'All windows:', titles )

	const { focused, minimized, visible } = await focusedMinimizedVisible( { electronApp, windowName: SETTINGS_WINDOW } )

	expect( focused ).toBe( true )
	expect( minimized ).toBe( false )
	expect( visible ).toBe( true )

} )

// Quit app
test( 'Validate buttons: close button', async () => {

	let PASS = false
	const isMac = Boolean( await mainPage.locator( '.mac' ) )
	if ( isMac ) {

		// Close button is hidden on mac - show it
		console.log( 'MacOS, skipping close button test' )
		await mainPage.addScriptTag( { content: 'document.body.classList.remove(\'mac\')' } )

	}

	expect( await mainPage.locator( '.close-button' ) ).toBeVisible()

	await mainPage.locator( '.close-button' ).click( { force: true } )
	try {

		console.log( 'This should throw an error!', await mainPage.title() )

	} catch {

		PASS = true

	}

	expect( PASS, 'app should be quit' ).toBeTruthy()

} )
