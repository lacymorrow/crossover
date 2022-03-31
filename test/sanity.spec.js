const { expect, test } = require( '@playwright/test' )
const { productName } = require( '../package.json' )
const { startApp, wait } = require( './helpers.js' )

// Breakpoint: await mainPage.pause()

let electronApp
let mainPage
let windows

test.beforeAll( async () => {

	const app = await startApp()
	electronApp = app.electronApp
	mainPage = app.mainPage
	windows = app.windows

} )

test.afterEach( async () => wait( 500 ) )

test.afterAll( async () => {

	await electronApp.close()

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

	const result = await electronApp.evaluate( async app => app.BrowserWindow.getAllWindows().find( w => w.title === 'CrossOver' ).title )

	expect( result ).toBe( productName )

} )

test( 'Test playwright input', async () => {

	expect( windows[0] ).toBe( mainPage )
	expect( await electronApp.windows()[0] ).toBe( mainPage )

} )

test( 'Test script', async () => {

	await mainPage.addScriptTag( { content: '(() => console.log(\'Added script tag.\'))()' } )

} )

test( 'Play sound from renderer', async () => {

	test.fixme()

	await wait( 500 )

	// Evaluate this script in render process
	// requires webPreferences.nodeIntegration true and contextIsolation false
	const result = await mainPage.evaluate( async () => {

		const out = await window.crossover.invoke( 'invoke-test', 'tested!' )
		console.log( out )

		return out

	} )
	console.log( 'success?', result )
	await wait( 2000 )

} )

test( 'Play sound', async () => {

	await electronApp.evaluate( async app => {

		await app.ipcMain.emit( 'play_sound', 'RESET' )
		// Await webContents.getAllWebContents().map(e=>e.send( 'play_sound', 'CENTER' ))
		// await new Promise( r => setTimeout( r, 2000 ) )

	} )
	await wait( 2000 )

} )
