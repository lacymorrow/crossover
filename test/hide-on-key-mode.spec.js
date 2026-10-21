// #340 — the keyboard hide key was hold-only. It now has hold/toggle/press modes.
const path = require( 'path' )
const { expect, test } = require( '@playwright/test' )
const { closeApp, startApp, wait, delays } = require( './helpers.js' )

const ACCESSIBILITY_PATH = path.resolve( 'src/main/accessibility.js' )
const IOHOOK_PATH = path.resolve( 'src/main/iohook.js' )
const PREFERENCES_PATH = path.resolve( 'src/main/preferences.js' )
const WINDOWS_PATH = path.resolve( 'src/main/windows.js' )

const HIDE_KEY = 'V'
const RIGHT_MOUSE_BUTTON = 2

let electronApp
let mainPage

// Arms iohook.hideOnKey() in one mode, replays a list of fake input events
// through uiohook, and reports windows.hidden after each one.
const replay = async ( { mode, events } ) => electronApp.evaluate(
	async ( _electron, { accessibilityPath, iohookPath, preferencesPath, windowsPath, mode, events, hideKey } ) => {

		const accessibility = process.mainModule.require( accessibilityPath )
		const iohook = process.mainModule.require( iohookPath )
		const preferences = process.mainModule.require( preferencesPath ).init()
		const windows = process.mainModule.require( windowsPath )
		const { uIOhook, UiohookKey } = process.mainModule.require( 'uiohook-napi' )

		// macOS TCC is per-binary and the test Electron isn't trusted, and we
		// replay events by hand so the native hook never needs to run.
		accessibility.checkAccessibilityPermissions = () => true
		uIOhook.start = () => {}
		uIOhook.stop = () => {}

		iohook.unregisterIOHook()
		windows.showWindow()

		preferences.value( 'actions.hideOnKey', hideKey )
		preferences.value( 'actions.hideOnKeyMode', mode )
		await iohook.hideOnKey()

		const states = []
		for ( const event of events ) {

			if ( event.type === 'unlock' ) {

				iohook.unregisterIOHook()

			} else if ( event.type === 'mousedown' ) {

				uIOhook.emit( 'mousedown', { button: event.button } )

			} else {

				uIOhook.emit( event.type, { keycode: UiohookKey[hideKey] } )

			}

			states.push( windows.hidden )

		}

		iohook.unregisterIOHook()
		windows.showWindow()

		return states

	},
	{
		accessibilityPath: ACCESSIBILITY_PATH,
		iohookPath: IOHOOK_PATH,
		preferencesPath: PREFERENCES_PATH,
		windowsPath: WINDOWS_PATH,
		hideKey: HIDE_KEY,
		mode,
		events,
	},
)

test.beforeAll( async () => {

	const app = await startApp()
	electronApp = app.electronApp
	mainPage = app.mainPage

} )

test.afterAll( async () => {

	await closeApp()

} )

test.describe( 'Hide on keypress modes (#340)', () => {

	test( 'hold: hidden only while the key is down', async () => {

		const states = await replay( { mode: 'hold', events: [
			{ type: 'keydown' },
			{ type: 'keyup' },
		] } )

		expect( states ).toEqual( [ true, false ] )

	} )

	test( 'toggle: each press flips, releasing the key changes nothing', async () => {

		const states = await replay( { mode: 'toggle', events: [
			{ type: 'keydown' },
			{ type: 'keyup' },
			{ type: 'keydown' },
			{ type: 'keyup' },
		] } )

		expect( states ).toEqual( [
			true, true, false, false,
		] )

	} )

	// The OS fires keydown over and over while the key is held down.
	test( 'toggle: holding the key flips once, not once per repeat', async () => {

		const states = await replay( { mode: 'toggle', events: [
			{ type: 'keydown' },
			{ type: 'keydown' },
			{ type: 'keydown' },
			{ type: 'keyup' },
		] } )

		expect( states ).toEqual( [
			true, true, true, true,
		] )

	} )

	test( 'press: repeats do not break the next press after a reveal', async () => {

		const states = await replay( { mode: 'press', events: [
			{ type: 'keydown' },
			{ type: 'keydown' },
			{ type: 'keyup' },
			{ type: 'mousedown', button: RIGHT_MOUSE_BUTTON },
			{ type: 'keydown' },
		] } )

		expect( states ).toEqual( [
			true, true, true, false, true,
		] )

	} )

	test( 'press: stays hidden after release, the next ADS click brings it back', async () => {

		const states = await replay( { mode: 'press', events: [
			{ type: 'keydown' },
			{ type: 'keyup' },
			{ type: 'mousedown', button: RIGHT_MOUSE_BUTTON },
		] } )

		expect( states ).toEqual( [
			true, true, false,
		] )

	} )

	test( 'press: a different mouse button does not reveal the crosshair', async () => {

		const states = await replay( { mode: 'press', events: [
			{ type: 'keydown' },
			{ type: 'mousedown', button: 1 },
		] } )

		expect( states ).toEqual( [ true, true ] )

	} )

	test( 'unlocking restores a crosshair the hide key had latched away', async () => {

		const states = await replay( { mode: 'toggle', events: [
			{ type: 'keydown' },
			{ type: 'unlock' },
		] } )

		expect( states ).toEqual( [ true, false ] )

	} )

	test( 'the renderer actually un-hides the crosshair body', async () => {

		await replay( { mode: 'press', events: [ { type: 'keydown' } ] } )
		await wait( delays.short )

		// replay() leaves the crosshair shown; the class must be gone with it.
		await expect( mainPage.locator( 'body' ) ).not.toHaveClass( /hidden/ )

	} )

} )
