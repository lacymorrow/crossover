const path = require( 'path' )
const { expect, test } = require( '@playwright/test' )
const { closeApp, startApp, wait, delays } = require( './helpers.js' )

const MAIN_DIR = path.resolve( 'src/main' )
const UIOHOOK = path.resolve( 'node_modules/uiohook-napi' )

const RIGHT_MOUSE_BUTTON = 2

// Regression tests for #536/#539: "hold a mouse button to hide while ADS"
// not hiding the crosshair.
test.describe( 'Hide crosshair on mouse button (ADS)', () => {

	let electronApp

	test.beforeAll( async () => {

		test.setTimeout( 120_000 )
		const app = await startApp()
		electronApp = app.electronApp

		// The hook itself is verified against real input separately; these tests
		// drive our listeners directly, so accessibility must not short-circuit.
		await electronApp.evaluate( async ( _electron, { mainDir } ) => {

			const accessibility = process.mainModule.require( `${mainDir}/accessibility.js` )
			accessibility.checkAccessibilityPermissions = () => true

		}, { mainDir: MAIN_DIR } )

	} )

	test.afterAll( async () => closeApp() )

	// Applies preferences, then re-locks so the iohook listeners re-register.
	const configure = async values => electronApp.evaluate( async ( _electron, { mainDir, values } ) => {

		const preferences = process.mainModule.require( `${mainDir}/preferences.js` ).init()
		const crossover = process.mainModule.require( `${mainDir}/crossover.js` )

		crossover.toggleWindowLock( false )

		for ( const [ key, value ] of Object.entries( values ) ) {

			preferences.value( key, value )

		}

		crossover.toggleWindowLock( true )

		return preferences.value( 'hidden.locked' )

	}, { mainDir: MAIN_DIR, values } )

	const emit = async ( event, button ) => electronApp.evaluate( async ( _electron, { uiohookPath, event, button } ) => {

		const { uIOhook } = process.mainModule.require( uiohookPath )
		uIOhook.emit( event, { button } )

	}, { uiohookPath: UIOHOOK, event, button } )

	// Opacity of every crosshair window (main first, then any duplicates).
	const opacities = async () => electronApp.evaluate( async ( _electron, { mainDir } ) => {

		const windows = process.mainModule.require( `${mainDir}/windows.js` )
		const all = [ windows.win, ...windows.shadowWindows ].filter( win => win && !win.isDestroyed() )

		return Promise.all( all.map( async win => win.webContents.executeJavaScript(
			'getComputedStyle( document.querySelector( "#crosshair" ) ).opacity',
		) ) )

	}, { mainDir: MAIN_DIR } )

	const hold = async () => {

		await emit( 'mousedown', RIGHT_MOUSE_BUTTON )
		await wait( delays.short )
		const held = await opacities()
		await emit( 'mouseup', RIGHT_MOUSE_BUTTON )
		await wait( delays.short )

		return { held, released: await opacities() }

	}

	test( 'Hold hides the crosshair and release restores it', async () => {

		test.setTimeout( 60_000 )

		await configure( {
			'crosshair.opacity': 100,
			'actions.hideOnMouse': '2',
			'actions.hideOnMouseToggle': [],
			'actions.showOnMouseInvert': [],
			'actions.resizeOnADS': 'off',
		} )

		const { held, released } = await hold()

		expect( held ).toEqual( [ '0' ] )
		expect( released ).toEqual( [ '1' ] )

	} )

	test( 'Hold hides duplicate (shadow) crosshairs too', async () => {

		test.setTimeout( 60_000 )

		await configure( {
			'crosshair.opacity': 100,
			'actions.hideOnMouse': '2',
			'actions.hideOnMouseToggle': [],
			'actions.showOnMouseInvert': [],
			'actions.resizeOnADS': 'off',
		} )

		// Shadow windows can only be created while unlocked.
		const count = await electronApp.evaluate( async ( _electron, { mainDir } ) => {

			const crossover = process.mainModule.require( `${mainDir}/crossover.js` )
			const windows = process.mainModule.require( `${mainDir}/windows.js` )

			crossover.toggleWindowLock( false )
			await crossover.initShadowWindow()
			crossover.toggleWindowLock( true )

			return windows.shadowWindows.size

		}, { mainDir: MAIN_DIR } )

		expect( count ).toBe( 1 )

		const { held, released } = await hold()

		expect( held ).toEqual( [ '0', '0' ] )
		expect( released ).toEqual( [ '1', '1' ] )

	} )

	test( 'Show-on-ADS still hides on release when ADS resize is also on', async () => {

		test.setTimeout( 60_000 )

		await electronApp.evaluate( async ( _electron, { mainDir } ) => {

			const windows = process.mainModule.require( `${mainDir}/windows.js` )
			for ( const shadow of [ ...windows.shadowWindows ] ) {

				shadow.destroy()

			}

		}, { mainDir: MAIN_DIR } )

		await configure( {
			'crosshair.opacity': 100,
			'actions.hideOnMouse': '2',
			'actions.hideOnMouseToggle': [],
			'actions.showOnMouseInvert': [ 'showOnMouseInvert' ],
			'actions.resizeOnADS': 'hold',
		} )

		const { held, released } = await hold()

		// Inverted: visible while held, hidden once released.
		expect( held ).toEqual( [ '1' ] )
		expect( released ).toEqual( [ '0' ] )

	} )

} )
