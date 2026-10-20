// #299 — master switch that turns off every keybind, including Ctrl+Comma.
const path = require( 'path' )
const { expect, test } = require( '@playwright/test' )
const { closeApp, startApp, wait, delays } = require( './helpers.js' )

const CROSSOVER_PATH = path.resolve( 'src/main/crossover.js' )
const PREFERENCES_PATH = path.resolve( 'src/main/preferences.js' )

const MOVE_UP = 'Control+Shift+Alt+Up'
const LOCK = 'Control+Shift+Alt+X'
const RESET = 'Control+Shift+Alt+R'

let electronApp

// Flips the master switch (and optionally the hidden escape hatch), then reports
// what is actually registered with the OS and what the app menu shows.
const applySwitch = async ( { disableAll, disableSafety } ) => electronApp.evaluate(
	async ( { globalShortcut, Menu }, { crossoverPath, preferencesPath, disableAll, disableSafety, accelerators } ) => {

		const crossover = process.mainModule.require( crossoverPath )
		const preferences = process.mainModule.require( preferencesPath ).init()

		preferences.value( 'keybinds.disableAll', disableAll ? [ 'disableAll' ] : [] )
		preferences.value( 'hidden.disableSafetyKeybinds', disableSafety )
		crossover.syncSettings()

		const findPreferencesItem = items => {

			for ( const item of items ) {

				if ( item.label === 'Preferences...' ) {

					return item

				}

				if ( item.submenu ) {

					const found = findPreferencesItem( item.submenu.items )
					if ( found ) {

						return found

					}

				}

			}

			return null

		}

		const registered = {}
		for ( const accelerator of accelerators ) {

			registered[accelerator] = globalShortcut.isRegistered( accelerator )

		}

		const preferencesItem = findPreferencesItem( Menu.getApplicationMenu().items )

		return { registered, preferencesAccelerator: preferencesItem?.accelerator ?? null }

	},
	{
		crossoverPath: CROSSOVER_PATH,
		preferencesPath: PREFERENCES_PATH,
		disableAll,
		disableSafety,
		accelerators: [
			MOVE_UP, LOCK, RESET,
		],
	},
)

test.beforeAll( async () => {

	const app = await startApp()
	electronApp = app.electronApp

} )

test.afterEach( async () => wait( delays.short ) )

test.afterAll( closeApp )

test( 'keybinds are registered by default', async () => {

	const { registered, preferencesAccelerator } = await applySwitch( { disableAll: false, disableSafety: false } )

	expect( registered[MOVE_UP] ).toBe( true )
	expect( registered[LOCK] ).toBe( true )
	expect( registered[RESET] ).toBe( true )
	expect( preferencesAccelerator ).toBe( 'CommandOrControl+,' )

} )

test( 'master switch clears every keybind but Lock and Reset', async () => {

	const { registered, preferencesAccelerator } = await applySwitch( { disableAll: true, disableSafety: false } )

	expect( registered[MOVE_UP] ).toBe( false )
	expect( registered[LOCK] ).toBe( true )
	expect( registered[RESET] ).toBe( true )
	expect( preferencesAccelerator ).toBeFalsy()

} )

test( 'hidden preference drops Lock and Reset too', async () => {

	const { registered, preferencesAccelerator } = await applySwitch( { disableAll: true, disableSafety: true } )

	expect( registered[MOVE_UP] ).toBe( false )
	expect( registered[LOCK] ).toBe( false )
	expect( registered[RESET] ).toBe( false )
	expect( preferencesAccelerator ).toBeFalsy()

} )

test( 'turning the switch back off restores keybinds', async () => {

	const { registered, preferencesAccelerator } = await applySwitch( { disableAll: false, disableSafety: false } )

	expect( registered[MOVE_UP] ).toBe( true )
	expect( registered[LOCK] ).toBe( true )
	expect( registered[RESET] ).toBe( true )
	expect( preferencesAccelerator ).toBe( 'CommandOrControl+,' )

} )

// The pane has to admit when the list below it is inert. Fields stay editable:
// the switch is meant to be flipped back on, so hiding your bindings would
// mean toggling twice to read them.
test( 'the settings pane says the keybinds are off and keeps the fields', async () => {

	await applySwitch( { disableAll: false, disableSafety: false } )

	await electronApp.evaluate( ( _electron, crossoverPath ) => {

		process.mainModule.require( crossoverPath ).openSettingsWindow()

	}, CROSSOVER_PATH )

	await wait( delays.long )

	const settings = electronApp.windows().find( page => page.url().includes( 'electron-preferences/build' ) )

	if ( !settings ) {

		throw new Error( 'Preferences window never opened' )

	}

	await settings.click( 'text=Keybinds' )
	await wait( delays.medium )

	const notice = settings.locator( 'text=These keybinds are turned off.' )
	const moveUp = settings.locator( 'text=Move Up' ).first()
	const masterSwitch = 'text=Turn off every keybind, including Preferences'

	await expect( moveUp ).toBeVisible()
	await expect( notice ).toHaveCount( 0 )

	await settings.click( masterSwitch )
	await wait( delays.medium )

	await expect( notice ).toBeVisible()
	await expect( moveUp ).toBeVisible()

	// Put the pane back the way we found it.
	await settings.click( masterSwitch )
	await wait( delays.medium )
	await expect( notice ).toHaveCount( 0 )

} )
