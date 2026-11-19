// Run with: npm run test:unit (node --test, no Electron)
//
// 3.4.10 removed presets (they were not tested well enough). A 3.4.9
// preferences.json that holds presets and a cyclePreset keybind must still
// load, and the stored data must stay on disk untouched so CrossOver 4's
// importer can find it.
const assert = require( 'node:assert/strict' )
const fs = require( 'node:fs' )
const os = require( 'node:os' )
const path = require( 'node:path' )
const Module = require( 'node:module' )
const { test } = require( 'node:test' )

const userData = fs.mkdtempSync( path.join( os.tmpdir(), 'crossover-prefs-' ) )
const dataStore = path.join( userData, 'preferences.json' )

const stored = {
	crosshair: { size: 55, reticle: 'cross' },
	presets: { active: 'Ranked', name: 'Ranked' },
	keybinds: { cyclePreset: 'Control+Shift+Alt+K', about: 'Control+Shift+Alt+A' },
	hidden: {
		presets: [
			{ name: 'Ranked', settings: { crosshair: { size: 70 }, actions: { tiltAngle: 30 } } },
			{ name: 'Casual', settings: { crosshair: { size: 40 } } },
		],
		locked: true,
	},
}

fs.writeFileSync( dataStore, JSON.stringify( stored, null, 4 ) )

// Minimal electron stand-in so the real preferences module can load in plain node
const noop = () => {}
const electronStub = new Proxy( {
	app: { getPath: () => userData, getVersion: () => '3.4.10', getName: () => 'CrossOver', isPackaged: false, on: noop, whenReady: () => Promise.resolve() },
	ipcMain: { on: noop, handle: noop },
	BrowserWindow: class {},
	webContents: {},
	dialog: {},
	safeStorage: {},
	screen: {},
}, { get: ( target, key ) => ( key in target ? target[key] : {} ) } )

const originalLoad = Module._load
Module._load = ( request, ...rest ) => {

	if ( request === 'electron' ) {

		return electronStub

	}

	if ( request === 'electron-util' ) {

		return { debugInfo: () => '', is: { development: false } }

	}

	return originalLoad( request, ...rest )

}

test( 'a 3.4.9 preferences.json with presets loads in 3.4.10 and keeps its data', async () => {

	const preferences = require( '../../src/main/preferences' )
	const instance = preferences.init()

	// Settings that still exist load as stored
	assert.equal( instance.value( 'crosshair.size' ), 55 )
	assert.equal( instance.value( 'keybinds.about' ), 'Control+Shift+Alt+A' )
	assert.equal( instance.value( 'hidden.locked' ), true )

	// Defaults for settings the file never had are filled in
	assert.equal( instance.value( 'keybinds.quit' ), preferences.getDefaults().keybinds.quit )

	// Nothing registers or builds UI for presets any more
	assert.equal( preferences.getDefaults().keybinds.cyclePreset, undefined )
	assert.equal( preferences.getDefaults().hidden.presets, undefined )
	assert.equal( instance.options.sections.some( section => section.id === 'presets' ), false )

	// The stored preset data is still in memory and on disk, unchanged
	assert.deepEqual( instance.value( 'hidden.presets' ), stored.hidden.presets )
	assert.equal( instance.value( 'keybinds.cyclePreset' ), 'Control+Shift+Alt+K' )
	assert.deepEqual( instance.value( 'presets' ), stored.presets )

	// The constructor saves the merged preferences; wait for the write, then read it back
	await new Promise( resolve => {

		setTimeout( resolve, 300 )

	} )
	const onDisk = JSON.parse( fs.readFileSync( dataStore, 'utf8' ) )
	assert.deepEqual( onDisk.hidden.presets, stored.hidden.presets )
	assert.equal( onDisk.keybinds.cyclePreset, 'Control+Shift+Alt+K' )
	assert.deepEqual( onDisk.presets, stored.presets )

} )
