// https://playwright.dev/docs/api/
// https://jestjs.io/docs/expect
const { expect, test } = require( '@playwright/test' )
const { productName } = require( '../package.json' )
const { startApp, wait, delays, focusedMinimizedVisible } = require( './helpers.js' )
// Breakpoint: await mainPage.pause()

let electronApp
let mainPage

test.beforeAll( async () => {

	const app = await startApp()
	electronApp = app.electronApp
	mainPage = app.mainPage

} )

test.afterEach( async () => wait( delays.short ) )

test.afterAll( async () => {

	if ( electronApp.windows().length > 0 ) {

		await electronApp.close()

	}

} )

test( 'Validate app launches: launch.png', async () => {

	// Capture a screenshot.
	await mainPage.screenshot()

	// TODO: wait for app load
	await wait( delays.medium )

	// Print the title.
	const title = await mainPage.title()
	expect( title ).toBe( productName )

	// App properties - focused, minimized, visible
	const { focused, minimized, visible } = await focusedMinimizedVisible( { electronApp, windowName: productName } )

	expect( focused ).toBe( true )
	expect( minimized ).toBe( false )
	expect( visible ).toBe( true )

} )

test( 'Validate feather icons loaded', async () => {

	// Await wait(delays.short)

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

	// Info button has more icons: move, resize, info
	button = mainPage.locator( '.info-button svg' )
	expect( await button.count() ).toBe( 3 )

} )

test( 'Validate custom image', async () => {} )
