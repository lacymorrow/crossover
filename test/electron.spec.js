const path = require( 'path' )
const { expect, test } = require( '@playwright/test' )
const jimp = require( 'jimp' )
const { productName } = require( '../package.json' )
const { startApp, wait, delays } = require( './helpers.js' )

let electronApp
let mainPage

test.beforeAll( async () => {

	const app = await startApp()
	electronApp = app.electronApp
	mainPage = app.mainPage

} )

test.afterEach( async () => wait( delays.short ) )
// End setup

// test( 'has working devtools', async t => {

// 	const open = await t.context.app.browserWindow.isDevToolsOpened()
// 	t.is( open, false )
// 	// T.context.app.browserWindow.webContents.openDevTools()
// 	// open = await t.context.app.browserWindow.isDevToolsOpened()
// 	// t.is(open, true)

// } )

test( 'Validate windows', async () => {

	const windows = electronApp.windows()
	const titles = await Promise.all(
		windows.map( async w => {

			const i = await w.title()

			return i

		} ),
	)

	console.log( 'All windows:', titles )

	test.fixme()
	if ( titles.includes( 'DevTools' ) ) {

		expect( windows.length ).toBe( 2 )

	} else {

		expect( windows.length ).toBe( 1 )

	}

	// Expect(titles).toEqual( expect.arrayContaining([productName, CHOOSER_WINDOW]) );
	expect( titles ).toEqual( expect.arrayContaining( [ productName ] ) )

} )

test( 'Check isPackaged', async () => {

	const isPackaged = await electronApp.evaluate( async ( { app } ) =>
		// This runs in Electron's main process, parameter here is always
		// the result of the require('electron') in the main app script.
		app.isPackaged,
	)
	console.log( `Packaged: ${isPackaged}` ) // False (because we're in development mode)

} )

test( 'Validate appPath', async () => {

	const appPath = await electronApp.evaluate( async ( { app } ) => app.getAppPath() )
	expect( appPath ).toBe( path.resolve( __dirname, '..' ) )

} )

test( 'Validate evaluateHandle', async () => {

	const appHandle = await electronApp.evaluateHandle( ( { app } ) => app )
	expect( await electronApp.evaluate( ( { app }, appHandle ) => app === appHandle, appHandle ) ).toBeTruthy()

} )

test( 'Verify screenshots of the same mainPage match', async () => {

	test.fixme()

	// Take a screenshot of the current mainPage
	const screenshot1 = await mainPage.screenshot()
	// Create a visual hash using Jimp
	const screenshot1hash = ( await jimp.read( screenshot1 ) ).hash()
	// Take a screenshot of the mainPage
	const screenshot2 = await mainPage.screenshot()
	// Create a visual hash using Jimp
	const screenshot2hash = ( await jimp.read( screenshot2 ) ).hash()
	// Compare the two hashes
	expect( screenshot1hash ).toEqual( screenshot2hash )

} )

// Quit
test( 'Validate close event', async () => {

	const events = []
	electronApp.on( 'close', () => events.push( 'application' ) )
	electronApp.context().on( 'close', () => events.push( 'context' ) )
	await electronApp.close()
	expect( events.join( '|' ) ).toBe( 'context|application' )
	// Give it some time to fire more events - there should not be any.
	await wait( 1000 )
	expect( events.join( '|' ) ).toBe( 'context|application' )

} )
