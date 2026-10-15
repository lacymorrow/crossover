const { expect, test } = require( '@playwright/test' )
const { closeApp, startApp, wait, delays } = require( './helpers.js' )
const {
	MAIN_DIR,
	RIGHT_MOUSE_BUTTON,
	configure,
	displays,
	emit,
	setDuplicateCount,
	stubAccessibility,
	tilts,
	widths,
} = require( './crosshair-helpers.js' )

// Alt is a single modifier, which is all the hide/tilt keybinds accept.
const ALT_KEYCODE = 56

const CROSSHAIR_SIZE = 80
const ADS_SIZE = 50
const TILT_ANGLE = 15

// Regression tests for #560 and #561: the hide hotkey, Hide on keypress, ADS
// resize and tilt all wrote to windows.win only, so a duplicate crosshair
// stayed on screen and stayed its original size while the main one reacted.
test.describe( 'Crosshair actions reach duplicate crosshairs', () => {

	let electronApp

	test.beforeAll( async () => {

		test.setTimeout( 120_000 )
		const app = await startApp()
		electronApp = app.electronApp

		await stubAccessibility( electronApp )

	} )

	test.afterAll( async () => closeApp() )

	// Toggles hide through the same function the Ctrl+Shift+Alt+H action calls.
	const toggleHide = async () => {

		await electronApp.evaluate( async ( _electron, { mainDir } ) => {

			const windows = process.mainModule.require( `${mainDir}/windows.js` )
			windows.showHideWindow()

		}, { mainDir: MAIN_DIR } )

		await wait( delays.short )

		return displays( electronApp )

	}

	const holdKey = async read => {

		await emit( electronApp, 'keydown', { keycode: ALT_KEYCODE } )
		await wait( delays.short )
		const held = await read( electronApp )
		await emit( electronApp, 'keyup', { keycode: ALT_KEYCODE } )
		await wait( delays.short )

		return { held, released: await read( electronApp ) }

	}

	const holdRightMouse = async read => {

		await emit( electronApp, 'mousedown', { button: RIGHT_MOUSE_BUTTON } )
		await wait( delays.short )
		const held = await read( electronApp )
		await emit( electronApp, 'mouseup', { button: RIGHT_MOUSE_BUTTON } )
		await wait( delays.short )

		return { held, released: await read( electronApp ) }

	}

	test( 'Hide hotkey hides every crosshair, and shows them all again', async () => {

		test.setTimeout( 60_000 )

		await configure( electronApp, {
			'crosshair.size': CROSSHAIR_SIZE,
			'actions.hideOnKey': '',
			'actions.hideOnMouse': '-1',
			'actions.resizeOnADS': 'off',
			'actions.tiltEnable': [],
		} )

		expect( await setDuplicateCount( electronApp, 1 ) ).toBe( 1 )

		expect( await toggleHide() ).toEqual( [ 'none', 'none' ] )
		expect( await toggleHide() ).toEqual( [ 'block', 'block' ] )

	} )

	test( 'Hide on keypress hides every crosshair', async () => {

		test.setTimeout( 60_000 )

		await configure( electronApp, {
			'crosshair.size': CROSSHAIR_SIZE,
			'actions.hideOnKey': 'Alt',
			'actions.hideOnMouse': '-1',
			'actions.resizeOnADS': 'off',
			'actions.tiltEnable': [],
		} )

		expect( await setDuplicateCount( electronApp, 1 ) ).toBe( 1 )

		const { held, released } = await holdKey( displays )

		expect( held ).toEqual( [ 'none', 'none' ] )
		expect( released ).toEqual( [ 'block', 'block' ] )

	} )

	test( 'ADS resize resizes every crosshair', async () => {

		test.setTimeout( 60_000 )

		await configure( electronApp, {
			'crosshair.size': CROSSHAIR_SIZE,
			'actions.ADSSize': ADS_SIZE,
			'actions.hideOnKey': '',
			'actions.hideOnMouse': '-1',
			'actions.resizeOnADS': 'hold',
			'actions.tiltEnable': [],
		} )

		expect( await setDuplicateCount( electronApp, 1 ) ).toBe( 1 )

		const { held, released } = await holdRightMouse( widths )

		expect( held ).toEqual( [ `${ADS_SIZE}px`, `${ADS_SIZE}px` ] )
		expect( released ).toEqual( [ `${CROSSHAIR_SIZE}px`, `${CROSSHAIR_SIZE}px` ] )

	} )

	test( 'Tilt tilts every crosshair', async () => {

		test.setTimeout( 60_000 )

		await configure( electronApp, {
			'crosshair.size': CROSSHAIR_SIZE,
			'actions.hideOnKey': '',
			'actions.hideOnMouse': '-1',
			'actions.resizeOnADS': 'off',
			'actions.tiltEnable': [ 'tiltEnable' ],
			'actions.tiltToggle': [],
			'actions.tiltAngle': TILT_ANGLE,
			'actions.tiltLeft': '',
			'actions.tiltRight': 'Alt',
		} )

		expect( await setDuplicateCount( electronApp, 1 ) ).toBe( 1 )

		const { held, released } = await holdKey( tilts )

		expect( held ).toEqual( [ `${TILT_ANGLE}deg`, `${TILT_ANGLE}deg` ] )
		expect( released ).toEqual( [ '0deg', '0deg' ] )

	} )

	test( 'A lone crosshair still hides and resizes on its own', async () => {

		test.setTimeout( 60_000 )

		await configure( electronApp, {
			'crosshair.size': CROSSHAIR_SIZE,
			'actions.ADSSize': ADS_SIZE,
			'actions.hideOnKey': '',
			'actions.hideOnMouse': '-1',
			'actions.resizeOnADS': 'hold',
			'actions.tiltEnable': [],
		} )

		expect( await setDuplicateCount( electronApp, 0 ) ).toBe( 0 )

		expect( await toggleHide() ).toEqual( [ 'none' ] )
		expect( await toggleHide() ).toEqual( [ 'block' ] )

		const { held, released } = await holdRightMouse( widths )

		expect( held ).toEqual( [ `${ADS_SIZE}px` ] )
		expect( released ).toEqual( [ `${CROSSHAIR_SIZE}px` ] )

	} )

} )
