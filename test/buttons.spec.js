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

test( 'Validate buttons: info button', async () => {

	await expect( await mainWindow.locator( '.info-button .move-icon' ) ).toBeVisible()
	await expect( await mainWindow.locator( '.info-button .info-icon' ) ).toBeHidden()

} )

test( 'Validate buttons: drag + center button', async () => {

	// await mainWindow.pause()

	await mainWindow.dragAndDrop( '.info-button', '.center-button' )

	const drag = await mainWindow.locator( '.info-button' )
	const button = await mainWindow.locator( '.center-button' )
	const { x: x1, y: y1 } = await drag.boundingBox()
	console.log( x1, y1 )
	await mainWindow.mouse.move( x1 + 4, y1 + 4 )
	await mainWindow.mouse.down()
	const { x: x2, y: y2 } = await button.boundingBox()
	await mainWindow.mouse.move( x2, y2 )
	await mainWindow.mouse.up()

	await button.dblclick()

} )

test( 'Validate buttons: close button', async () => {

	let PASS = false
 	await visualMouse( mainWindow )
	const isMac = Boolean( await mainWindow.locator( '.mac' ) )
	if ( isMac ) {

		// Close button is hidden on mac
		console.log( 'MacOS, skipping close button test' )
		await electronApp.close()
		PASS = true

	} else {

		await mainWindow.locator( '.close-button' ).click({ force: true })
		try {

			console.log( 'This should throw an error!', await mainWindow.title() )

		} catch {

			PASS = true

		}

	}

	await expect( PASS, 'app should be quit' ).toBeTruthy()

} )
