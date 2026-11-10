const process = require( 'process' )

const { app } = require( 'electron' )

/*
	`--reset` has to survive a Linux launcher.

	#450 reported `crossover --reset` doing nothing on Linux. The flag was read
	only through `app.commandLine.hasSwitch( 'reset' )`, and the AppImage, Snap
	and Flatpak wrappers hand our arguments to the binary without passing them
	through Chromium's switch parser, so there is no switch left to read. The
	argument does still land in `process.argv`, which is why the fallback below
	scans argv directly.

	Three spellings are accepted because the launchers, the readme and the issue
	threads have each used a different one: `--reset`, `-reset`, and a bare
	`reset`. `CROSSOVER_RESET` stays the escape hatch for a desktop entry or
	wrapper script we do not own.

	argv[0] is the executable and is skipped on purpose: a binary that happens to
	sit in a path named `reset` must not wipe preferences on every launch.
*/

const RESET_ARGS = new Set( [
	'--reset', '-reset', 'reset',
] )
const RESET_ENV = 'CROSSOVER_RESET'
// A reset is destructive, so an env var that spells out "off" means off rather
// than "any value at all is truthy".
const ENV_OFF = new Set( [
	'', '0', 'false', 'no', 'off',
] )

const envRequestsReset = () => {

	const value = process.env[RESET_ENV]

	if ( value === undefined ) {

		return false

	}

	return !ENV_OFF.has( String( value ).trim().toLowerCase() )

}

const argvRequestsReset = () => process.argv.slice( 1 ).some( arg => RESET_ARGS.has( arg ) )

const isResetRequested = () => envRequestsReset() || app.commandLine.hasSwitch( 'reset' ) || argvRequestsReset()

module.exports = { isResetRequested }
