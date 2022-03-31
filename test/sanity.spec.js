const { ElectronApplication, Page, _electron: electron } = require( 'playwright' )
const { expect, test } = require( '@playwright/test' )
const { startApp, wait } = require( './helpers.js' )
const { productName } = require('../package.json');


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

test.afterEach( async () => await wait(500) )

test.afterAll( async () => {

	await electronApp.close()

} )

// test( 'Validate Fixtures', async ({browser, browserName, page}) => {
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

	const result = await electronApp.evaluate( async ( app ) => {
		return await Promise.all(
			app.BrowserWindow.getAllWindows().filter(w => {
				return w.title === 'CrossOver'
			}).map(async w=>{
				return w.title
			})
		)
	})

	expect(result[0]).toBe(productName)
})


test( 'Test playwright input', async () => {

	expect(windows[0]).toBe(mainPage)
	expect(await electronApp.windows()[0]).toBe(mainPage)

})

test( 'Test script', async () => {

	await mainPage.addScriptTag( { content: `(() => console.log('Added script tag.'))()` } )

})
test( 'Test sound', async () => {

	await electronApp.evaluate( async ( app ) => {
		await app.ipcMain.emit( 'play_sound', 'RESET' )
		// await webContents.getAllWebContents().map(e=>e.send( 'play_sound', 'CENTER' ))
		// await new Promise( r => setTimeout( r, 2000 ) )
	} )
	await wait(2000)

})
