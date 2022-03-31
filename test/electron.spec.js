const path = require( 'path' )
const { ElectronApplication, Page, _electron: electron } = require( 'playwright' )
const { expect, test } = require( '@playwright/test' )
const jimp = require('jimp')
const { startApp, visualMouse, wait } = require( './helpers.js' )
const { productName } = require('../package.json');

let electronApp
let mainPage

test.beforeAll( async () => {

	const app = await startApp()
	electronApp = app.electronApp
	mainPage = app.mainPage

} )

test.afterEach( async () => await wait(500) )
// End setup


// test( 'has working devtools', async t => {

// 	const open = await t.context.app.browserWindow.isDevToolsOpened()
// 	t.is( open, false )
// 	// T.context.app.browserWindow.webContents.openDevTools()
// 	// open = await t.context.app.browserWindow.isDevToolsOpened()
// 	// t.is(open, true)

// } )

// test( 'has working window bounds', async t => {

// 	const bounds = await t.context.app.browserWindow.getBounds()
// 	t.true( bounds.width > 0 )
// 	t.true( bounds.height > 0 )

// 	// Windows builds need time to process - else race condition
// 	await delay( 1000 )

// 	bounds.x += 10
// 	bounds.y += 10
// 	t.context.app.browserWindow.setBounds( { x: bounds.x, y: bounds.y } )
// 	const newBounds = await t.context.app.browserWindow.getBounds()

// 	t.is( newBounds.x, bounds.x )
// 	t.is( newBounds.y, bounds.y )

// } )

test( 'Validate windows', async () => {

	const windows = electronApp.windows()
	const titles = await Promise.all(
		windows.map(async w=>{
			const i = await w.title()
			return await i
		})
	)

	console.log('All windows: ', titles)
	if ( titles.includes('DevTools' ) ) {

		expect( windows.length ).toBe( 2 )

	} else {

		expect( windows.length ).toBe( 1 )

	}

    // expect(titles).toEqual( expect.arrayContaining([productName, 'Crosshairs']) );
    expect(titles).toEqual( expect.arrayContaining([productName]) );

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

	await wait(1000)

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
test( 'Validate close event', async ( { playwright } ) => {

	const events = []
	electronApp.on( 'close', () => events.push( 'application' ) )
	electronApp.context().on( 'close', () => events.push( 'context' ) )
	await electronApp.close()
	expect( events.join( '|' ) ).toBe( 'context|application' )
	// Give it some time to fire more events - there should not be any.
	await wait( 1000 )
	expect( events.join( '|' ) ).toBe( 'context|application' )

} )
