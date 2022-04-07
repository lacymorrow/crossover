const { expect, test } = require( '@playwright/test' )
const { productName } = require( '../package.json' )
const { startApp, wait, delays } = require( './helpers.js' )

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

// Test( 'Validate Fixtures', async ({browser, browserName, page}) => {
// 	const mainWindow = await electronApp.evaluate( async ( app ) => {
// 		const { BrowserWindow } = app
// 		const mainWindow = await BrowserWindow.getAllWindows()[0]
// 		return mainWindow
// 	} )

// 	console.log(mainWindow)
// 	// console.log(context)
// 	console.log(browserName)
// 	console.log(Object.keys(browser))
// 	console.log(Object.keys(page))
// })

test( 'Test get mainWindow', async () => {

	await wait( delays.short )

	const result = await electronApp.evaluate( async ( { BrowserWindow }, windowName ) => BrowserWindow.getAllWindows().find( w => w.title === windowName ).title, productName )

	expect( result, 'should be productName' ).toBe( productName )

} )

test( 'Test playwright input', async () => {

	expect( await electronApp.windows()[0] ).toBe( mainPage )

} )

test( 'Test script', async () => {

	await mainPage.addScriptTag( { content: '(() => console.log(\'Added script tag.\'))()' } )

} )

test( 'Play sound from renderer', async () => {

	test.fixme()

	await wait( delays.short )

	// Evaluate this script in render process
	// requires webPreferences.nodeIntegration true and contextIsolation false
	const result = await mainPage.evaluate( async () => {

		const out = await window.crossover.invoke( 'invoke_test', 'tested!' )
		console.log( out )

		return out

	} )
	console.log( 'success?', result )
	await wait( delays.medium )

} )

test( 'Play sound', async () => {

	await electronApp.evaluate( async app => {

		await app.ipcMain.emit( 'play_sound', 'RESET' )
		// Await webContents.getAllWebContents().map(e=>e.send( 'play_sound', 'CENTER' ))
		// await new Promise( r => setTimeout( r, delays.medium ) )

	} )
	await wait( delays.medium )

} )
