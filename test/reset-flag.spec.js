const path = require( 'path' )
const Module = require( 'module' )
const { expect, test } = require( '@playwright/test' )

// Regression tests for #450: `crossover --reset` did nothing on Linux.
//
// The flag used to be read only off Chromium's switch parser. AppImage, Snap and
// Flatpak wrappers pass our arguments to the binary without handing them to that
// parser, so `hasSwitch( 'reset' )` answered no while `--reset` sat in argv the
// whole time. Every case below runs both ways: with switches parsed, the way a
// plain `./crossover --reset` behaves, and with them stripped, the way the
// launchers behave.
//
// These are unit tests on purpose. The reporters are on Mint, Nobara and
// Silverblue, we have no Linux runner, and the detection itself is pure: fake
// argv and env and the answer is the same on any platform.

const RESET_FLAG_PATH = require.resolve( path.join( __dirname, '../src/main/reset-flag.js' ) )
const EXECUTABLE = '/usr/bin/crossover'

/**
 * Ask reset-flag.js what it thinks of a command line.
 *
 * `switchesStripped` is the launcher case: the arguments reach argv but never
 * reach Chromium, so `app.commandLine` has nothing to report.
 */
const asks = ( { argv = [], env = {}, executable = EXECUTABLE, switchesStripped = false } = {} ) => {

	const switches = {}
	for ( const arg of switchesStripped ? [] : argv ) {

		const [ key, value ] = arg.replace( /^--?/, '' ).split( '=' )
		switches[key] = value ?? ''

	}

	const electronStub = { app: { commandLine: { hasSwitch: key => key in switches } } }

	const savedEnv = { ...process.env }
	const savedArgv = process.argv
	const originalLoad = Module._load

	Module._load = function ( request, ...rest ) {

		return request === 'electron' ? electronStub : originalLoad.call( this, request, ...rest )

	}

	delete require.cache[RESET_FLAG_PATH]
	delete process.env.CROSSOVER_RESET
	Object.assign( process.env, env )
	process.argv = [ executable, ...argv ]

	try {

		return require( RESET_FLAG_PATH ).isResetRequested()

	} finally {

		Module._load = originalLoad
		delete require.cache[RESET_FLAG_PATH]
		process.argv = savedArgv
		for ( const key of Object.keys( process.env ) ) {

			if ( !( key in savedEnv ) ) {

				delete process.env[key]

			}

		}

		Object.assign( process.env, savedEnv )

	}

}

test( '`--reset` is seen when Chromium parsed it', () => {

	expect( asks( { argv: [ '--reset' ] } ) ).toBe( true )

} )

test( '`--reset` is still seen when the launcher stripped the switch (#450)', () => {

	expect( asks( { argv: [ '--reset' ], switchesStripped: true } ) ).toBe( true )

} )

test( 'the `-reset` and bare `reset` spellings work on a stripped command line', () => {

	expect( asks( { argv: [ '-reset' ], switchesStripped: true } ) ).toBe( true )
	expect( asks( { argv: [ 'reset' ], switchesStripped: true } ) ).toBe( true )

} )

test( 'reset travels with the other switches a launcher passes', () => {

	expect( asks( { argv: [
		'--no-sandbox', '--reset', '--ozone-platform=x11',
	], switchesStripped: true } ) ).toBe( true )

} )

test( 'a normal launch does not reset', () => {

	expect( asks() ).toBe( false )
	expect( asks( { argv: [ '--no-sandbox' ] } ) ).toBe( false )
	expect( asks( { argv: [ '--no-sandbox' ], switchesStripped: true } ) ).toBe( false )

} )

test( 'a flag that merely starts with reset does not reset', () => {

	expect( asks( { argv: [ '--resets' ], switchesStripped: true } ) ).toBe( false )
	expect( asks( { argv: [ '--reset-position' ], switchesStripped: true } ) ).toBe( false )

} )

test( 'an install path containing the word reset does not reset', () => {

	expect( asks( { executable: '/opt/reset/crossover' } ) ).toBe( false )
	expect( asks( { executable: '/opt/crossover/reset' } ) ).toBe( false )

} )

test( 'CROSSOVER_RESET covers the launchers we do not own', () => {

	expect( asks( { env: { CROSSOVER_RESET: '1' } } ) ).toBe( true )
	expect( asks( { env: { CROSSOVER_RESET: 'true' } } ) ).toBe( true )

} )

test( 'CROSSOVER_RESET spelled off is off, because a reset cannot be undone', () => {

	expect( asks( { env: { CROSSOVER_RESET: '0' } } ) ).toBe( false )
	expect( asks( { env: { CROSSOVER_RESET: 'false' } } ) ).toBe( false )
	expect( asks( { env: { CROSSOVER_RESET: '' } } ) ).toBe( false )

} )
