const { expect, test } = require( '@playwright/test' )
const { startApp, visualMouse, wait } = require( './helpers.js' )

let electronApp
let mainPage

test.beforeAll( async () => {

	const app = await startApp()
	electronApp = app.electronApp
	mainPage = app.mainPage

	await visualMouse( mainPage )

} )
// End setup

test( 'Validate buttons: info button', async () => {

	expect( await mainPage.locator( '.info-button .move-icon' ) ).toBeVisible()
	expect( await mainPage.locator( '.info-button .info-icon' ) ).toBeHidden()

} )

test( 'Validate buttons: move + center button', async () => {

	const button = await mainPage.locator( '.center-button' )
	await button.dblclick()
	await wait( 500 )

	// Get app bounds
	const bounds = await electronApp.evaluate( async app => Promise.all(
		app.BrowserWindow.getAllWindows().filter( w => w.title === 'CrossOver' ).map( async w => w.getBounds() ),
	) ).then( array => array[0] )

	// Move
	await electronApp.evaluate( async app => {

		await app.ipcMain.emit( 'move_window', { distance: 50, direction: 'right' } )
		await app.ipcMain.emit( 'move_window', { distance: 50, direction: 'down' } )

	} )
	await wait( 500 )

	let newBounds = await electronApp.evaluate( async app => Promise.all(
		app.BrowserWindow.getAllWindows().filter( w => w.title === 'CrossOver' ).map( async w => w.getBounds() ),
	) ).then( array => array[0] )

	expect( newBounds.x ).toBe( bounds.x + 50 )
	expect( newBounds.y ).toBe( bounds.y + 50 )

	// Recenter
	await button.dblclick()
	await wait( 500 )

	newBounds = await electronApp.evaluate( async app => Promise.all(
		app.BrowserWindow.getAllWindows().filter( w => w.title === 'CrossOver' ).map( async w => w.getBounds() ),
	) ).then( array => array[0] )

	expect( newBounds.x ).toBe( bounds.x )
	expect( newBounds.y ).toBe( bounds.y )

} )

test( 'Validate buttons: chooser button', async () => {

	const button = await mainPage.locator( '.center-button' )
	button.click()

	await wait( 500 )

	const focused = await electronApp.evaluate( async app => {

		const win = app.BrowserWindow.getAllWindows().find( w => w.title === 'Crosshairs' )
		win.focus()

		return win.isFocused()

	} )
	expect( focused ).toBe( true )

	const minimized = await electronApp.evaluate( async app => {

		const win = app.BrowserWindow.getAllWindows().find( w => w.title === 'Crosshairs' )

		return win.isMinimized()

	} )
	expect( minimized ).toBe( false )

	const visible = await electronApp.evaluate( async app => {

		const win = app.BrowserWindow.getAllWindows().find( w => w.title === 'Crosshairs' )

		return win.isVisible()

	} )
	expect( visible ).toBe( true )

} )

test( 'Validate buttons: preferences', async () => {

	const button = await mainPage.locator( '.settings-button' )
	button.click()

	await wait( 500 )

	const windows = electronApp.windows()
	const titles = await Promise.all(
		windows.map( async w => {

			const i = await w.title()

			return i

		} ),
	)

	console.log( 'All windows:', titles )

	const focused = await electronApp.evaluate( async app => {

		const win = app.BrowserWindow.getAllWindows().find( w => w.title === 'Preferences' )
		win.focus()

		return win.isFocused()

	} )
	expect( focused ).toBe( true )

	const minimized = await electronApp.evaluate( async app => {

		const win = app.BrowserWindow.getAllWindows().find( w => w.title === 'Preferences' )

		return win.isMinimized()

	} )
	expect( minimized ).toBe( false )

	const visible = await electronApp.evaluate( async app => {

		const win = app.BrowserWindow.getAllWindows().find( w => w.title === 'Preferences' )

		return win.isVisible()

	} )
	expect( visible ).toBe( true )

} )

// Quit app
test( 'Validate buttons: close button', async () => {

	let PASS = false
	const isMac = Boolean( await mainPage.locator( '.mac' ) )
	if ( isMac ) {

		// Close button is hidden on mac
		console.log( 'MacOS, skipping close button test' )
		await mainPage.addScriptTag( { content: 'document.body.classList.remove(\'mac\')' } )

	}

	await wait( 500 )

	await mainPage.locator( '.close-button' ).click( { force: true } )
	try {

		console.log( 'This should throw an error!', await mainPage.title() )

	} catch {

		PASS = true

	}

	expect( PASS, 'app should be quit' ).toBeTruthy()

} )
