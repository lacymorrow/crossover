const path = require( 'path' )
const { ElectronApplication, Page, _electron: electron } = require( 'playwright' )
const { expect, test } = require( '@playwright/test' )
const { startApp, visualMouse, wait } = require( './helpers.js' )

let electronApp
let mainWindow

test.beforeAll( async () => {

	const app = await startApp()
	electronApp = app.electronApp
	mainWindow = app.mainWindow

} )
// End setup

test( 'should script application', async () => {

	const appPath = await electronApp.evaluate( async ( { app } ) => app.getAppPath() )
	await expect( appPath ).toBe( path.resolve( __dirname, '..' ) )

} )

test( 'should evaluate handle', async () => {

	const appHandle = await electronApp.evaluateHandle( ( { app } ) => app )
	await expect( await electronApp.evaluate( ( { app }, appHandle ) => app === appHandle, appHandle ) ).toBeTruthy()

} )

// Quit
test( 'should fire close event', async ( { playwright } ) => {

	const events = []
	electronApp.on( 'close', () => events.push( 'application' ) )
	electronApp.context().on( 'close', () => events.push( 'context' ) )
	await electronApp.close()
	expect( events.join( '|' ) ).toBe( 'context|application' )
	// Give it some time to fire more events - there should not be any.
	await wait( 1000 )
	await expect( events.join( '|' ) ).toBe( 'context|application' )

} )
