const path = require( 'path' )
const { expect, test } = require( '@playwright/test' )
const { closeApp, startApp } = require( './helpers.js' )

// Regression test for GH #546: the crosshair did not draw over a macOS
// fullscreen game. Hiding the dock transforms the process into a UIElement
// app, and macOS only lets a window float over another app's fullscreen Space
// when the process was already a UIElement at the moment that window was
// created. src/main/windows.js used to call dock.setVisible( false ) just
// after `new BrowserWindow( options )`, so the crosshair was born on the
// desktop space and stayed there. Measured on macOS 26.7.1 with both the
// released 3.4.1 and 3.4.7 builds.

test( 'the dock is hidden before the crosshair window is created (#546)', async () => {

	const { electronApp } = await startApp()

	const events = await electronApp.evaluate( async ( { app }, modulePaths ) => {

		const windows = process.mainModule.require( modulePaths.windows )
		const dock = process.mainModule.require( modulePaths.dock )

		const order = []
		const originalSetVisible = dock.setVisible

		dock.setVisible = visible => {

			order.push( `dock:${visible}` )

			return originalSetVisible( visible )

		}

		const onCreated = () => order.push( 'window-created' )

		app.on( 'browser-window-created', onCreated )

		try {

			const { win } = windows.create( { isShadowWindow: true } )
			win.destroy()

		} finally {

			app.removeListener( 'browser-window-created', onCreated )
			dock.setVisible = originalSetVisible

		}

		return order

	}, {
		windows: path.resolve( 'src/main/windows.js' ),
		dock: path.resolve( 'src/main/dock.js' ),
	} )

	const hidden = events.indexOf( 'dock:false' )
	const created = events.indexOf( 'window-created' )

	expect( hidden, 'create() must hide the dock' ).toBeGreaterThan( -1 )
	expect( created, 'window creation must emit browser-window-created' ).toBeGreaterThan( -1 )
	expect( hidden, 'dock must be hidden before the window exists' ).toBeLessThan( created )

	await closeApp()

} )
