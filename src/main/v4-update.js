/*
	Moving a v3 install to CrossOver 4.

	CrossOver 4 is published as the GitHub "Latest" release with
	minimumSystemVersion and stagingPercentage in latest*.yml (see
	docs/v4-rollout.md). Background checks honor the staged rollout. A click on
	the announcement's "Update" button is consent, so it skips the staging
	bucket, but never the kill switch: stagingPercentage 0 stops clicks too.

	electron-updater is pinned to 6.3.0, where isStagingMatch is an instance
	method that isUpdateAvailable awaits. Overriding it on the instance is the
	least invasive way in; test/unit/v4-update.test.js pins the behavior.
*/
const { majorOf } = require( './v4-support' )

const MESSAGES = {
	downloading: 'Downloading CrossOver 4. It installs when you restart.',
	ready: 'CrossOver 4 is ready. Restart CrossOver to finish.',
	failed: 'Couldn\'t download CrossOver 4, so the download page is open.',
	notAvailable: 'CrossOver 4 isn\'t available for this computer yet.',
	opened: 'The CrossOver 4 download page is open.',
}

// Null or unparseable staging means "everyone"; only an explicit 0 stops a click
const bypassStaging = updater => {

	updater.isStagingMatch = async updateInfo => Number.parseInt( updateInfo?.stagingPercentage, 10 ) !== 0

}

// One download at a time, shared by the button and the background check
let pending = null

const download = ( updater, cancellationToken ) => {

	if ( !pending ) {

		pending = Promise.resolve()
			.then( () => updater.downloadUpdate( cancellationToken ) )
			.catch( error => {

				pending = null
				throw error

			} )

	}

	return pending

}

const resetForTests = () => {

	pending = null

}

/*
	The button. Resolves to one of: 'ready', 'failed', 'not-available'.
	report(message) updates the banner; openUrl(url) opens the browser.
*/
const updateToV4 = async ( { updater, url, openUrl, report = () => {}, log = console } ) => {

	bypassStaging( updater )
	updater.autoDownload = false

	let result

	try {

		result = await updater.checkForUpdates()

	} catch ( error ) {

		// Offline, GitHub down or rate-limited: hand over the download page
		log.warn( 'v4 update: check failed', error?.message )
		openUrl( url )
		report( MESSAGES.failed )

		return 'failed'

	}

	// No result: unpackaged build. No token: not available (kill switch, OS gate).
	if ( !result ) {

		openUrl( url )
		report( MESSAGES.failed )

		return 'failed'

	}

	if ( !result.cancellationToken || !( majorOf( result.updateInfo?.version ) >= 4 ) ) {

		report( MESSAGES.notAvailable )

		return 'not-available'

	}

	report( MESSAGES.downloading )

	try {

		await download( updater, result.cancellationToken )
		report( MESSAGES.ready )

		return 'ready'

	} catch ( error ) {

		log.warn( 'v4 update: download failed', error?.message )
		openUrl( url )
		report( MESSAGES.failed )

		return 'failed'

	}

}

/*
	Background policy for any update the check finds. v3 updates download as
	before. A v4 update downloads only where v4 runs, the install can be
	replaced in place, and the person hasn't already been to v4 and back.
*/
// A v3 user gets three days with the announcement on screen to say no
const NOTICE_MS = 1000 * 60 * 60 * 24 * 3

const shouldDownload = ( { version, support, rolledBack, declined, offeredAt, now = Date.now() } ) => {

	if ( !( majorOf( version ) >= 4 ) ) {

		return true

	}

	// Dismissing the announcement means "stay on CrossOver 3"
	if ( declined || rolledBack ) {

		return false

	}

	// Never silent: the announcement must have been showing for NOTICE_MS first
	if ( !offeredAt || now - offeredAt < NOTICE_MS ) {

		return false

	}

	return Boolean( support?.supported && support.canUpdateInPlace )

}

module.exports = { MESSAGES, NOTICE_MS, bypassStaging, download, resetForTests, shouldDownload, updateToV4 }
