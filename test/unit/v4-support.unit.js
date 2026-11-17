// Run with: npm run test:unit (node --test, no Electron)
const assert = require( 'node:assert/strict' )
const fs = require( 'node:fs' )
const os = require( 'node:os' )
const path = require( 'node:path' )
const { test } = require( 'node:test' )
const { hasRunV4, isAtLeast, v4Support } = require( '../../src/main/v4-support' )

const win = ( overrides = {} ) => v4Support( { platform: 'win32', release: '10.0.19045', arch: 'x64', env: {}, windowsStore: false, ...overrides } )

test( 'Windows 10 and 11 x64 installer builds update in place', () => {

	assert.deepEqual( { ...win(), reason: undefined }, { supported: true, canUpdateInPlace: true, reason: undefined } )
	assert.equal( win( { release: '10.0.22631' } ).canUpdateInPlace, true )

} )

test( 'Windows 7, 8 and 8.1 are not supported', () => {

	for ( const release of [
		'6.1.7601', '6.2.9200', '6.3.9600',
	] ) {

		assert.equal( win( { release } ).supported, false, release )

	}

} )

test( '32-bit process: the real OS comes from PROCESSOR_ARCHITEW6432', () => {

	assert.equal( win( { arch: 'ia32', env: { PROCESSOR_ARCHITECTURE: 'x86' } } ).supported, false )
	assert.equal( win( { arch: 'ia32', env: { PROCESSOR_ARCHITECTURE: 'x86', PROCESSOR_ARCHITEW6432: 'AMD64' } } ).canUpdateInPlace, true )

} )

test( 'ARM64 needs Windows 11 for x64 emulation', () => {

	const env = { PROCESSOR_ARCHITECTURE: 'x86', PROCESSOR_ARCHITEW6432: 'ARM64' }
	assert.equal( win( { arch: 'ia32', env, release: '10.0.19045' } ).supported, false )
	assert.equal( win( { arch: 'ia32', env, release: '10.0.22631' } ).supported, true )
	assert.equal( win( { arch: 'arm64', release: '10.0.22631' } ).supported, true )

} )

test( 'Store installs see nothing; portable opens the page', () => {

	assert.equal( win( { windowsStore: true } ).supported, false )
	const portable = win( { env: { PORTABLE_EXECUTABLE_DIR: 'C:\\Tools' } } )
	assert.equal( portable.supported, true )
	assert.equal( portable.canUpdateInPlace, false )

} )

test( 'macOS needs Darwin 21 and /Applications for in-place', () => {

	assert.equal( v4Support( { platform: 'darwin', release: '20.6.0' } ).supported, false )
	const inApps = v4Support( { platform: 'darwin', release: '21.6.0', isInApplicationsFolder: () => true } )
	assert.equal( inApps.canUpdateInPlace, true )
	const translocated = v4Support( { platform: 'darwin', release: '25.6.0', isInApplicationsFolder: () => false } )
	assert.equal( translocated.supported, true )
	assert.equal( translocated.canUpdateInPlace, false )
	const throws = v4Support( { platform: 'darwin', release: '25.6.0', isInApplicationsFolder() {

		throw new Error( 'no' )

	} } )
	assert.equal( throws.canUpdateInPlace, false )

} )

test( 'Linux: glibc floor, x64 only, never in place, no snap or flatpak', () => {

	const linux = overrides => v4Support( { platform: 'linux', release: '6.5.0', arch: 'x64', env: {}, glibc: '2.35', ...overrides } )
	assert.equal( linux().supported, true )
	assert.equal( linux().canUpdateInPlace, false )
	assert.equal( linux( { glibc: '2.26' } ).supported, false )
	assert.equal( linux( { glibc: '2.27' } ).supported, true )
	assert.equal( linux( { glibc: null } ).supported, false, 'musl' )
	assert.equal( linux( { arch: 'arm64' } ).supported, false )
	assert.equal( linux( { env: { SNAP: '/snap/crossover/1' } } ).supported, false )
	assert.equal( linux( { env: { FLATPAK_ID: 'com.lacymorrow.crossover' } } ).supported, false )

} )

test( 'isAtLeast compares numerically', () => {

	assert.equal( isAtLeast( '2.31', [ 2, 27 ] ), true )
	assert.equal( isAtLeast( '2.9', [ 2, 27 ] ), false )
	assert.equal( isAtLeast( '3.0', [ 2, 27 ] ), true )

} )

test( 'hasRunV4 looks for v4 config.json in userData', () => {

	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'crossover-v4-' ) )
	assert.equal( hasRunV4( dir ), false )
	fs.writeFileSync( path.join( dir, 'preferences.json' ), '{}' )
	assert.equal( hasRunV4( dir ), false )
	fs.writeFileSync( path.join( dir, 'config.json' ), '{}' )
	assert.equal( hasRunV4( dir ), true )
	fs.rmSync( dir, { recursive: true } )

} )
