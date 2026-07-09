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
	app.setPath( 'userData', dataDir )
	app.setPath( 'logs', path.join( dataDir, 'logs' ) )
	app.setPath( 'crashDumps', path.join( dataDir, 'crashDumps' ) )

	return true

}

module.exports = { initPortablePaths }
