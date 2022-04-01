// Play a sound at the end of the test

const { test } = require( '@playwright/test' )
const { startApp, wait, delays } = require( './helpers.js' )

test( 'Play sound', async () => {

	const app = await startApp()

	await app.electronApp.evaluate( async ( { ipcMain } ) => {

		await ipcMain.emit( 'play_sound', 'HERO' )

	} )
	await wait( delays.medium )

	await app.electronApp.close()

} )

