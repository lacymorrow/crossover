/*
	Can this machine run CrossOver 4, and can v3 install it in place?

	CrossOver 4 is Electron 40:
	- Windows 10 or later, 64-bit OS (x64 build; ARM64 only via Windows 11's x64 emulation)
	- macOS 12 or later (Darwin 21)
	- Linux glibc 2.27 or later (Ubuntu 18.04, Electron's stated floor; the binary's
	  own symbol floor is GLIBC_2.25). musl has no glibc and is not supported.

	Every input is injectable so this stays a pure function under node --test.
	Returns { supported, canUpdateInPlace, reason }. `reason` is for logs only.
*/
const fs = require( 'fs' )
const os = require( 'os' )
const path = require( 'path' )

const MIN_DARWIN = 21
const MIN_GLIBC = [ 2, 27 ]
const WIN11_BUILD = 22_000

const parseNumbers = value => String( value || '' ).split( '.' ).map( n => Number.parseInt( n, 10 ) )

const glibcRuntime = () => {

	try {

		return process.report.getReport().header.glibcVersionRuntime || null

	} catch {

		return null

	}

}

const isAtLeast = ( version, min ) => {

	const parts = parseNumbers( version )

	for ( const [ i, want ] of min.entries() ) {

		const have = parts[i] || 0

		if ( Number.isNaN( have ) ) {

			return false

		}

		if ( have !== want ) {

			return have > want

		}

	}

	return true

}

const result = ( supported, canUpdateInPlace, reason ) => ( { supported, canUpdateInPlace: supported && canUpdateInPlace, reason } )

const windowsSupport = ( { release, arch, env, windowsStore } ) => {

	const [
		major, , build,
	] = parseNumbers( release )

	if ( !( major >= 10 ) ) {

		return result( false, false, `Windows NT ${release} is older than 10` )

	}

	// An x64 or arm64 process means a 64-bit OS that already runs x64 code.
	// A 32-bit process (old combined installers) only sees the real OS
	// through PROCESSOR_ARCHITEW6432 (AMD64 or ARM64); unset means 32-bit Windows.
	const osArch = arch === 'ia32' ? String( env.PROCESSOR_ARCHITEW6432 || '' ).toUpperCase() : 'AMD64'

	if ( osArch !== 'AMD64' && osArch !== 'ARM64' ) {

		return result( false, false, '32-bit Windows' )

	}

	// Windows 10 on ARM emulates x86 only; x64 emulation arrived in Windows 11
	if ( osArch === 'ARM64' && !( build >= WIN11_BUILD ) ) {

		return result( false, false, 'Windows 10 on ARM cannot run x64 apps' )

	}

	if ( windowsStore ) {

		return result( false, false, 'Microsoft Store install updates through the Store' )

	}

	if ( env.PORTABLE_EXECUTABLE_DIR ) {

		return result( true, false, 'portable build: open the download page' )

	}

	return result( true, true, 'Windows installer build' )

}

const macSupport = ( { release, isInApplicationsFolder } ) => {

	const [ major ] = parseNumbers( release )

	if ( !( major >= MIN_DARWIN ) ) {

		return result( false, false, `Darwin ${release} is older than macOS 12` )

	}

	// Squirrel.Mac can't replace a translocated or read-only (DMG) copy
	let inApplications = false

	try {

		inApplications = Boolean( isInApplicationsFolder() )

	} catch {}

	return result( true, inApplications, inApplications ? 'macOS in /Applications' : 'macOS outside /Applications: open the download page' )

}

const linuxSupport = ( { arch, env, glibc } ) => {

	if ( env.SNAP ) {

		return result( false, false, 'snap install updates through the Snap Store' )

	}

	if ( env.FLATPAK_ID || env.container === 'flatpak' ) {

		return result( false, false, 'flatpak install' )

	}

	if ( arch !== 'x64' ) {

		return result( false, false, `Linux ${arch} has no CrossOver 4 build` )

	}

	if ( !glibc || !isAtLeast( glibc, MIN_GLIBC ) ) {

		return result( false, false, `glibc ${glibc || 'missing'} is older than ${MIN_GLIBC.join( '.' )}` )

	}

	return result( true, false, 'Linux: open the download page' )

}

const v4Support = ( options = {} ) => {

	const platform = options.platform || process.platform
	const input = {
		release: options.release ?? os.release(),
		arch: options.arch || process.arch,
		env: options.env || process.env,
		windowsStore: options.windowsStore ?? Boolean( process.windowsStore ),
		glibc: 'glibc' in options ? options.glibc : ( platform === 'linux' ? glibcRuntime() : null ),
		isInApplicationsFolder: options.isInApplicationsFolder || ( () => false ),
	}

	if ( platform === 'win32' ) {

		return windowsSupport( input )

	}

	if ( platform === 'darwin' ) {

		return macSupport( input )

	}

	if ( platform === 'linux' ) {

		return linuxSupport( input )

	}

	return result( false, false, `${platform} is not supported` )

}

/*
	True once CrossOver 4 has run on this machine. v4 keeps its settings in
	<userData>/config.json (electron-store) next to v3's preferences.json, and
	both apps share userData. v3 never writes config.json, so seeing it from v3
	means the person went to v4 and came back. Don't push them again.
*/
const hasRunV4 = userData => {

	try {

		return fs.existsSync( path.join( userData, 'config.json' ) )

	} catch {

		return false

	}

}

const majorOf = version => Number.parseInt( String( version || '' ).split( '.' )[0], 10 )

module.exports = { hasRunV4, isAtLeast, majorOf, v4Support }
