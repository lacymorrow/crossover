const fs = require( 'fs' )
const path = require( 'path' )
const { app } = require( 'electron' )

// When electron-builder's portable target launches the exe, it sets
// PORTABLE_EXECUTABLE_DIR to the directory containing the .exe. Redirect
// userData, logs, and crash dumps into a `data/` folder alongside the exe
// so the portable build actually keeps its state in that folder instead
// of %APPDATA%\CrossOver.
// See: https://www.electron.build/configuration/nsis#portable
const initPortablePaths = () => {

	const portableDir = process.env.PORTABLE_EXECUTABLE_DIR
	if ( !portableDir ) {

		return false

	}

	const dataDir = path.join( portableDir, 'data' )
	const logsDir = path.join( dataDir, 'logs' )
	const crashDir = path.join( dataDir, 'crashDumps' )

	try {

		fs.mkdirSync( logsDir, { recursive: true } )
		fs.mkdirSync( crashDir, { recursive: true } )
		app.setPath( 'userData', dataDir )
		app.setPath( 'logs', logsDir )
		app.setPath( 'crashDumps', crashDir )

	} catch ( error ) {

		// If the portable directory isn't writable (e.g. read-only media),
		// fall back to the default %APPDATA% paths rather than crashing.
		console.error( '[portable] failed to init portable paths, falling back to defaults:', error )

		return false

	}

	return true

}

module.exports = { initPortablePaths }
