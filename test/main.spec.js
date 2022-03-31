const { ElectronApplication, Page, _electron: electron } = require( 'playwright' )
const { expect, test } = require( '@playwright/test' )
const { startApp, wait } = require( './helpers.js' )

// Breakpoint: await mainWindow.pause()

let electronApp
let mainWindow

test.beforeAll( async () => {

	const app = await startApp()
	electronApp = app.electronApp
	mainWindow = app.mainWindow

} )

test.afterAll( async () => {

	await electronApp.close()

} )

test( 'check isPackaged', async () => {

	const isPackaged = await electronApp.evaluate( async ( {
  	app } ) =>
	// This runs in Electron's main process, parameter here is always
	// the result of the require('electron') in the main app script.
		app.isPackaged,
	)
	console.log( `Packaged: ${isPackaged}` ) // False (because we're in development mode)

} )

test( 'Validate BrowserWindows', async () => {

	const windows = electronApp.windows()
	if ( await windows[1].title() === 'DevTools' ) {

		expect( windows.length ).toBe( 3 )

	} else {

		expect( windows.length ).toBe( 2 )

	}

} )

test( 'Validate app launches: launch.png', async () => {

	// Print the title.
	const title = await mainWindow.title()
	expect( title ).toBe( 'CrossOver' )

	// Visible
	await mainWindow.waitForSelector( '#crosshair' )
	expect( mainWindow.locator( '#crosshair ' ) ).toBeVisible()

	// Capture a screenshot.
	await mainWindow.screenshot( { path: 'test/screenshots/launch.png' } )

} )

test( 'Validate feather icons loaded', async () => {

	// Await wait(500)

	// Number of buttons
	let button = mainWindow.locator( '#main .button' )
	expect( await button.count() ).toBe( 4 )

	// Feather converts <i/> --> <svg/>
	button = mainWindow.locator( '.close-button svg' )
	expect( await button.count() ).toBe( 1 )

	button = mainWindow.locator( '.center-button svg' )
	expect( await button.count() ).toBe( 1 )

	button = mainWindow.locator( '.settings-button svg' )
	expect( await button.count() ).toBe( 1 )

	// Info button has more
	button = mainWindow.locator( '.info-button svg' )
	expect( await button.count() ).toBe( 2 )

} )

test( 'Validate custom image', async () => {} )
