// Run with: npm run test:unit (node --test, no Electron)
const assert = require( 'node:assert/strict' )
const { beforeEach, test } = require( 'node:test' )
const v4Update = require( '../../src/main/v4-update' )

const { MESSAGES, bypassStaging, resetForTests, shouldDownload, updateToV4 } = v4Update
const quiet = { warn() {} }

beforeEach( resetForTests )

// Mirrors electron-updater 6.3.0: isUpdateAvailable awaits this.isStagingMatch
const fakeUpdater = ( { stagingPercentage, version = '4.0.0', checkError, downloadError } = {} ) => ( {
	downloads: 0,
	isStagingMatch: async () => false,
	async checkForUpdates() {

		if ( checkError ) {

			throw checkError

		}

		const updateInfo = { version, stagingPercentage }
		const available = await this.isStagingMatch( updateInfo )

		return available ? { updateInfo, cancellationToken: {}, downloadPromise: null } : { updateInfo }

	},
	async downloadUpdate() {

		this.downloads++
		if ( downloadError ) {

			throw downloadError

		}

		return [ 'CrossOver-Installer-4.0.0.exe' ]

	},
} )

const run = updater => {

	const reports = []
	const opened = []

	return updateToV4( { updater, url: 'https://example.com', openUrl: u => opened.push( u ), report: m => reports.push( m ), log: quiet } )
		.then( outcome => ( { outcome, reports, opened } ) )

}

test( 'the button skips the staging bucket', async () => {

	const updater = fakeUpdater( { stagingPercentage: 5 } )
	const { outcome, reports, opened } = await run( updater )
	assert.equal( outcome, 'ready' )
	assert.equal( updater.autoDownload, false )
	assert.equal( updater.downloads, 1 )
	assert.deepEqual( reports, [ MESSAGES.downloading, MESSAGES.ready ] )
	assert.deepEqual( opened, [] )

} )

test( 'stagingPercentage 0 is a kill switch, even for the button', async () => {

	const { outcome, opened } = await run( fakeUpdater( { stagingPercentage: 0 } ) )
	assert.equal( outcome, 'not-available' )
	assert.deepEqual( opened, [] )

} )

test( 'bypassStaging: null and 100 pass, "0" and 0 stop', async () => {

	const updater = {}
	bypassStaging( updater )
	assert.equal( await updater.isStagingMatch( {} ), true )
	assert.equal( await updater.isStagingMatch( { stagingPercentage: 100 } ), true )
	assert.equal( await updater.isStagingMatch( { stagingPercentage: '0' } ), false )
	assert.equal( await updater.isStagingMatch( { stagingPercentage: 0 } ), false )

} )

test( 'offline: open the download page and say so', async () => {

	const { outcome, reports, opened } = await run( fakeUpdater( { checkError: new Error( 'net::ERR_INTERNET_DISCONNECTED' ) } ) )
	assert.equal( outcome, 'failed' )
	assert.deepEqual( opened, [ 'https://example.com' ] )
	assert.deepEqual( reports, [ MESSAGES.failed ] )

} )

test( 'download failure: open the download page and say so', async () => {

	const { outcome, reports, opened } = await run( fakeUpdater( { stagingPercentage: 50, downloadError: new Error( 'sha512 mismatch' ) } ) )
	assert.equal( outcome, 'failed' )
	assert.deepEqual( opened, [ 'https://example.com' ] )
	assert.equal( reports.at( -1 ), MESSAGES.failed )

} )

test( 'a v3 result from the check is not a v4 update', async () => {

	const { outcome } = await run( fakeUpdater( { version: '3.4.11' } ) )
	assert.equal( outcome, 'not-available' )

} )

test( 'unpackaged build (null result) falls back to the page', async () => {

	const updater = fakeUpdater()
	updater.checkForUpdates = async () => null
	const { outcome, opened } = await run( updater )
	assert.equal( outcome, 'failed' )
	assert.equal( opened.length, 1 )

} )

test( 'button and background share one download', async () => {

	const updater = fakeUpdater()
	await Promise.all( [ v4Update.download( updater ), v4Update.download( updater ) ] )
	assert.equal( updater.downloads, 1 )

} )

test( 'background policy keeps v4 off installs that cannot take it', () => {

	const inPlace = { supported: true, canUpdateInPlace: true }
	assert.equal( shouldDownload( { version: '3.4.11', support: { supported: false } } ), true, 'v3 updates unchanged' )
	assert.equal( shouldDownload( { version: '4.0.0', support: inPlace, rolledBack: false } ), true, 'no prompt needed: the rollout percentage is the gate' )
	assert.equal( shouldDownload( { version: '4.0.0', support: inPlace, rolledBack: true } ), false )
	assert.equal( shouldDownload( { version: '4.0.0', support: inPlace, declined: true } ), false, 'Never update: stays on v3' )
	assert.equal( shouldDownload( { version: '3.4.11', support: inPlace, declined: true } ), true, 'Never update still takes v3 fixes' )
	assert.equal( shouldDownload( { version: '4.0.0', support: { supported: true, canUpdateInPlace: false } } ), false )
	assert.equal( shouldDownload( { version: '4.0.0', support: { supported: false, canUpdateInPlace: false } } ), false )

} )

// bypassStaging overrides an instance method. That only works while the pinned
// electron-updater still calls it through `this`; fail loudly if a bump changes that.
test( 'pinned electron-updater still routes staging through this.isStagingMatch', () => {

	const fs = require( 'node:fs' )
	const pkgPath = require.resolve( 'electron-updater/package.json' )
	assert.equal( require( pkgPath ).version, '6.3.0' )
	const source = fs.readFileSync( require.resolve( 'electron-updater/out/AppUpdater.js' ), 'utf8' )
	assert.match( source, /await this\.isStagingMatch\(updateInfo\)/ )
	assert.match( source, /lt\)\(currentOSVersion, minimumSystemVersion\)/ )

} )
