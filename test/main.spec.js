const { ElectronApplication, Page, _electron: electron } = require( 'playwright' )
const { expect, test } = require( '@playwright/test' )
const { startApp, wait } = require( './helpers.js' )
const { productName } = require('../package.json');
// Breakpoint: await mainPage.pause()

let electronApp
let mainPage

test.beforeAll( async () => {

	const app = await startApp()
	electronApp = app.electronApp
	mainPage = app.mainPage

} )

// test.afterEach( async () => await wait(500) )

test.afterAll( async () => {

	await electronApp.close()

} )

test( 'Validate app launches: launch.png', async () => {
	// Capture a screenshot.
	await mainPage.screenshot()

	// TODO: wait for app load
	await wait(1500)

	// Print the title.
	const title = await mainPage.title()
	expect( title ).toBe( productName )

	// App properties - focused, minimized, visible
	const focused = await electronApp.evaluate( async ( app ) => {
		const win = app.BrowserWindow.getAllWindows().filter(w => {
			return w.title === 'CrossOver'
		})[0]
		win.focus()
		return win.isFocused()
	})
	expect( focused ).toBe( true )

	const minimized = await electronApp.evaluate( async ( app ) => {
		const win = app.BrowserWindow.getAllWindows().filter(w => {
			return w.title === 'CrossOver'
		})[0]
		return win.isMinimized()
	})
	expect( minimized ).toBe( false )

	const visible = await electronApp.evaluate( async ( app ) => {
		const win = app.BrowserWindow.getAllWindows().filter(w => {
			return w.title === 'CrossOver'
		})[0]
		return win.isVisible()
	})
	expect( visible ).toBe( true )

} )

test( 'Validate feather icons loaded', async () => {

	// Await wait(500)

	// Number of buttons
	let button = mainPage.locator( '#main .button' )
	expect( await button.count() ).toBe( 4 )

	// Feather converts <i/> --> <svg/>
	button = mainPage.locator( '.close-button svg' )
	expect( await button.count() ).toBe( 1 )

	button = mainPage.locator( '.center-button svg' )
	expect( await button.count() ).toBe( 1 )

	button = mainPage.locator( '.settings-button svg' )
	expect( await button.count() ).toBe( 1 )

	// Info button has more
	button = mainPage.locator( '.info-button svg' )
	expect( await button.count() ).toBe( 2 )

} )

test( 'Validate custom image', async () => {} )
