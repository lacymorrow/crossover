const path = require( 'path' )
const { expect, test } = require( '@playwright/test' )
const { closeApp, startApp, wait, delays } = require( './helpers.js' )

let electronApp

const MAIN = path.resolve( 'src', 'main' )

// electronApp.evaluate has no `require` in scope; reach the singleton
// main-process modules through Node's shared require cache instead.
const main = ( fn, arg ) => electronApp.evaluate( async ( _electron, { dir, source, arg } ) => {

	const load = name => process.mainModule.require( `${dir}/${name}.js` )

	// eslint-disable-next-line no-new-func
	return new Function( 'load', 'arg', `return ( ${source} )( load, arg )` )( load, arg )

}, { dir: MAIN, source: fn.toString(), arg } )

test.beforeAll( async () => {

	const app = await startApp( { reset: true } )
	electronApp = app.electronApp

	// Start from a known, empty state. Unlock up front: toggling the lock closes
	// the preferences window, which would race every settings test below.
	await main( load => {

		const preferences = load( 'preferences' ).init()
		preferences.value( 'hidden.presets', [] )
		preferences.value( 'presets.active', '' )
		load( 'crossover' ).toggleWindowLock( false )

	} )

} )

test.afterAll( closeApp )

test( 'Saves the current settings as a named preset', async () => {

	const result = await main( ( load, arg ) => {

		const preferences = load( 'preferences' ).init()
		const presets = load( 'presets' )

		preferences.value( 'crosshair.size', arg.size )

		const saved = presets.save( arg.name )

		return { saved, list: presets.list().map( preset => preset.name ), active: presets.activeName() }

	}, { name: 'Sniper', size: 120 } )

	expect( result.saved.status ).toBe( 'saved' )
	expect( result.list ).toEqual( [ 'Sniper' ] )
	expect( result.active ).toBe( 'Sniper' )

} )

test( 'An unnamed preset gets a default name', async () => {

	const names = await main( load => {

		const presets = load( 'presets' )
		presets.save( '' )

		return presets.list().map( preset => preset.name )

	} )

	expect( names ).toEqual( [ 'Sniper', 'Preset 2' ] )

} )

test( 'Saving over a name replaces that preset', async () => {

	const result = await main( load => {

		const preferences = load( 'preferences' ).init()
		const presets = load( 'presets' )

		preferences.value( 'crosshair.size', 40 )

		const saved = presets.save( 'Sniper' )

		return { saved, count: presets.list().length, size: presets.list()[0].settings.crosshair.size }

	} )

	expect( result.saved.status ).toBe( 'updated' )
	expect( result.count ).toBe( 2 )
	expect( result.size ).toBe( 40 )

} )

test( 'A preset leaves keybinds and position alone', async () => {

	const preset = await main( load => load( 'presets' ).list()[0] )

	expect( Object.keys( preset.settings ).sort() ).toEqual( [ 'actions', 'crosshair' ] )
	expect( preset.settings.crosshair ).not.toHaveProperty( 'positionX' )
	expect( preset.settings.crosshair ).not.toHaveProperty( 'positionY' )

} )

test( 'The hotkey cycles through presets and wraps around', async () => {

	// Sniper holds size 40, Preset 2 holds size 120
	const sizes = await main( load => {

		const preferences = load( 'preferences' ).init()
		const presets = load( 'presets' )
		const read = () => ( { active: presets.activeName(), size: preferences.value( 'crosshair.size' ) } )

		presets.apply( 'Sniper' )
		const first = read()

		presets.cycle()
		const second = read()

		presets.cycle()
		const third = read()

		return { first, second, third }

	} )

	expect( sizes.first ).toEqual( { active: 'Sniper', size: 40 } )
	expect( sizes.second ).toEqual( { active: 'Preset 2', size: 120 } )
	expect( sizes.third ).toEqual( { active: 'Sniper', size: 40 } )

} )

test( 'The first preset picked after a launch is not swallowed', async () => {

	// Sniper holds size 40, Preset 2 holds size 120
	const result = await main( ( load, arg ) => {

		const preferences = load( 'preferences' ).init()
		const Module = process.mainModule.constructor
		const key = Object.keys( Module._cache ).find( file => file.endsWith( arg.file ) )
		const cached = Module._cache[key]

		// Sniper was the active preset when the app last shut down
		preferences.value( 'presets.active', 'Sniper' )
		delete Module._cache[key]

		// A cold load is the only moment the store still holds the name that was
		// active before a pick, so that is where the module has to read it
		const fresh = process.mainModule.require( key )

		// electron-preferences writes the picked value into its store before it
		// emits 'save', so the handler always sees the new name already in place
		preferences.value( 'presets.active', 'Preset 2' )

		const applied = fresh.handleSelection( 'Preset 2' )

		// Put the original instance back: register.js' save handler closed over it
		Module._cache[key] = cached

		return { applied, size: preferences.value( 'crosshair.size' ) }

	}, { file: '/presets.js' } )

	expect( result.applied ).toBe( 'Preset 2' )
	expect( result.size ).toBe( 120 )

} )

test( 'Deleting the active preset clears the selection and leaves the crosshair alone', async () => {

	const result = await main( load => {

		const preferences = load( 'preferences' ).init()
		const presets = load( 'presets' )

		// Preset 2 holds size 120
		presets.apply( 'Preset 2' )
		presets.remove( 'Preset 2' )

		return {
			list: presets.list().map( preset => preset.name ),
			active: presets.activeName(),
			size: preferences.value( 'crosshair.size' ),
		}

	} )

	expect( result.list ).toEqual( [ 'Sniper' ] )

	// Deliberately not 'Sniper'. Promoting the leftover preset would advertise
	// settings that were never applied, and because the dropdown would already be
	// displaying that name it could never fire a change event to correct itself.
	expect( result.active ).toBe( '' )

	// Deleting a preset is not a reason to change the crosshair on screen
	expect( result.size ).toBe( 120 )

} )

test( 'Cycling with no presets saved does nothing', async () => {

	const cycled = await main( load => {

		const presets = load( 'presets' )
		presets.remove( 'Sniper' )

		return presets.cycle()

	} )

	expect( cycled ).toBe( false )

} )

const openSettings = async () => {

	// The preferences window is rendered by electron-preferences, not by src/renderer
	const isSettings = page => !page.isClosed() && page.url().includes( 'electron-preferences' )

	// Close any window left open by an earlier test: electron-preferences reads
	// its section config once per load, so a reused window shows a stale dropdown
	await main( load => load( 'windows' ).hideSettingsWindow() )
	await wait( delays.short )

	const stale = new Set( electronApp.windows().filter( isSettings ) )

	await main( async load => {

		load( 'preferences' ).init().value( 'hidden.showSettings', false )
		await load( 'crossover' ).openSettingsWindow()

	} )

	let settingsPage
	const deadline = Date.now() + delays.long

	while ( !settingsPage && Date.now() < deadline ) {

		settingsPage = electronApp.windows().find( page => isSettings( page ) && !stale.has( page ) )

		if ( !settingsPage ) {

			// eslint-disable-next-line no-await-in-loop
			await wait( 100 )

		}

	}

	if ( !settingsPage ) {

		throw new Error( 'Preferences window never opened' )

	}

	await settingsPage.waitForSelector( '#tab-presets' )
	await settingsPage.click( '#tab-presets' )
	await wait( delays.short )

	return settingsPage

}

const presetOptions = settingsPage => settingsPage.locator( 'select' ).first().locator( 'option' ).allTextContents()

test( 'The Presets tab explains itself before anything is saved', async () => {

	test.setTimeout( 60_000 )

	await main( load => {

		const presets = load( 'presets' )
		load( 'preferences' ).init().value( 'hidden.presets', [] )
		presets.refreshOptions()

	} )

	const settings = await openSettings()

	expect( await presetOptions( settings ) ).toEqual( [ '-- Select One --' ] )
	await expect( settings.locator( 'text=Save your first preset below and it shows up here.' ) ).toBeVisible()

	await settings.screenshot( { path: 'test/results/presets-empty.png' } )

} )

test( 'The Presets tab lists the saved presets', async () => {

	test.setTimeout( 60_000 )

	await main( load => {

		const preferences = load( 'preferences' ).init()
		const presets = load( 'presets' )

		preferences.value( 'crosshair.size', 120 )
		presets.save( 'Sniper' )
		preferences.value( 'crosshair.size', 40 )
		presets.save( 'Hipfire' )
		presets.refreshOptions()

	} )

	const settings = await openSettings()

	// electron-preferences prepends its own placeholder option
	expect( await presetOptions( settings ) ).toEqual( [
		'-- Select One --', 'Sniper', 'Hipfire',
	] )

	await settings.screenshot( { path: 'test/results/presets-tab.png' } )

} )

test( 'The Save button stores a preset and refreshes the dropdown', async () => {

	test.setTimeout( 60_000 )

	const settings = await openSettings()

	await settings.locator( 'input[type="text"]:visible' ).first().fill( 'Shotgun' )

	// The text field saves on a debounce, so let it land before clicking
	await wait( delays.medium )
	await settings.click( 'button:has-text("Save Current Settings")' )

	// Saving reloads the window so the dropdown picks up the new preset
	await wait( delays.long )

	expect( await main( load => load( 'presets' ).list().map( preset => preset.name ) ) )
		.toEqual( [
			'Sniper', 'Hipfire', 'Shotgun',
		] )

	const refreshed = await openSettings()

	expect( await presetOptions( refreshed ) ).toEqual( [
		'-- Select One --', 'Sniper', 'Hipfire', 'Shotgun',
	] )

	await refreshed.screenshot( { path: 'test/results/presets-tab.png' } )

} )

test( 'The Delete button removes the active preset', async () => {

	test.setTimeout( 60_000 )

	const settings = await openSettings()

	await settings.click( 'button:has-text("Delete Active Preset")' )
	await wait( delays.long )

	expect( await main( load => load( 'presets' ).list().map( preset => preset.name ) ) )
		.toEqual( [ 'Sniper', 'Hipfire' ] )

} )

test( 'Picking a preset from the dropdown applies it, and the next edit cannot revert it', async () => {

	test.setTimeout( 60_000 )

	await main( load => {

		const preferences = load( 'preferences' ).init()
		const presets = load( 'presets' )

		preferences.value( 'hidden.presets', [] )

		preferences.value( 'crosshair.size', 120 )
		presets.save( 'Sniper' )
		preferences.value( 'crosshair.size', 40 )
		presets.save( 'Hipfire' )

		// Park the crosshair on a size neither preset holds, so an apply is visible
		preferences.value( 'crosshair.size', 80 )
		presets.refreshOptions()

	} )

	const settings = await openSettings()

	await settings.locator( 'select' ).first().selectOption( 'Sniper' )

	// Applying from the dropdown reloads the window, which is what discards the
	// renderer's snapshot of the store
	await wait( delays.long )

	const size = () => main( load => load( 'preferences' ).init().value( 'crosshair.size' ) )

	expect( await size() ).toBe( 120 )

	// The regression: the renderer ships its whole snapshot on every field write.
	// Without the reload above, this keystroke replayed the pre-preset snapshot
	// and put the crosshair back to 80.
	await settings.waitForSelector( 'input[type="text"]:visible' )
	await settings.locator( 'input[type="text"]:visible' ).first().fill( 'Scratch' )
	await wait( delays.medium )

	expect( await size() ).toBe( 120 )

} )
