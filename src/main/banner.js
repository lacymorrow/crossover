/*
	CrossOver 4 announcement

	Fetches ANNOUNCEMENT_URL (announcement.json in the root of the main branch)
	and shows a small banner in the crosshair window while it is unlocked. Edit
	that file to change the message for every 3.4.10+ install; set
	"enabled": false to take it down.

	3.4.9 and older read banner.json instead, which stays disabled: their gate
	only knew the OS version, so it would offer v4 to 32-bit Windows, Store and
	snap installs, and old Linux. This file is only read by builds that carry
	v4Support() (src/main/v4-support.js), and machines that can't run v4 see
	nothing at all.

	{
		"id": "v4-launch",             // change the id to show a dismissed banner again
		"enabled": true,
		"message": "...",              // 80 characters max
		"action": {
			"label": "Update",
			"type": "update-v4",        // or "url"
			"url": "https://lacymorrow.github.io/crossover"
		}
	}

	"update-v4" downloads v4 in place where the install allows it (Windows
	installer, macOS in /Applications) and opens action.url everywhere else.
*/
const https = require( 'https' )
const { app, shell } = require( 'electron' )
const { autoUpdater } = require( 'electron-updater' )
const { ANNOUNCEMENT_URL } = require( '../config/config' )
const { checkboxTrue } = require( '../config/utils' )
const log = require( './log' )
const preferences = require( './preferences' ).init()
const { hasRunV4, v4Support } = require( './v4-support' )
const { MESSAGES, updateToV4 } = require( './v4-update' )

const FOUR_HOURS = 1000 * 60 * 60 * 4
const SNOOZE_MS = 1000 * 60 * 60 * 24 * 30
const MAX_MESSAGE_LENGTH = 80 // two lines in the smallest window
const MAX_LABEL_LENGTH = 24

let current = null
let timer = null

const fetchJson = url => new Promise( ( resolve, reject ) => {

	const request = https.get( url, { timeout: 10_000 }, response => {

		if ( response.statusCode !== 200 ) {

			response.resume()
			reject( new Error( `Banner request failed: ${response.statusCode}` ) )

			return

		}

		let body = ''
		response.setEncoding( 'utf8' )
		response.on( 'data', chunk => {

			body += chunk

		} )
		response.on( 'end', () => {

			try {

				resolve( JSON.parse( body ) )

			} catch ( error ) {

				reject( error )

			}

		} )

	} )

	request.on( 'timeout', () => request.destroy( new Error( 'Banner request timed out' ) ) )
	request.on( 'error', reject )

} )

const isSafeUrl = url => {

	try {

		return new URL( url ).protocol === 'https:'

	} catch {

		return false

	}

}

const support = () => v4Support( {
	isInApplicationsFolder: () => process.platform === 'darwin' && app.isInApplicationsFolder(),
} )

// Someone who already went to v4 and came back has decided; don't ask again
const rolledBack = () => hasRunV4( app.getPath( 'userData' ) )

// Only accept the shape we expect; anything else hides the banner
const sanitize = data => {

	if ( !data || data.enabled !== true || typeof data.id !== 'string' || typeof data.message !== 'string' ) {

		return null

	}

	const action = data.action && typeof data.action.label === 'string' ? {
		label: data.action.label.slice( 0, MAX_LABEL_LENGTH ),
		type: data.action.type === 'update-v4' ? 'update-v4' : 'url',
		url: isSafeUrl( data.action.url ) ? data.action.url : '',
	} : null

	// Every announcement is about v4: machines that can't run it see nothing
	if ( !support().supported || rolledBack() ) {

		return null

	}

	if ( action?.type === 'url' && !action.url ) {

		return { id: data.id, message: data.message.slice( 0, MAX_MESSAGE_LENGTH ), action: null }

	}

	return { id: data.id, message: data.message.slice( 0, MAX_MESSAGE_LENGTH ), action }

}

const send = win => {

	if ( !win || win.isDestroyed() ) {

		return

	}

	// "Later" hides it for a month; "Never update" hides it for good
	const snoozed = Date.now() < ( preferences.value( 'hidden.bannerSnoozedUntil' ) || 0 )
	const never = preferences.value( 'hidden.v4Declined' ) === true
	const shown = current && !snoozed && !never ? current : null

	win.webContents.send( 'set_banner', shown )

}

const refresh = async win => {

	if ( !checkboxTrue( preferences.value( 'app.alerts' ), 'alerts' ) ) {

		current = null
		send( win )

		return

	}

	try {

		current = sanitize( await fetchJson( ANNOUNCEMENT_URL ) )

	} catch ( error ) {

		// Offline or no banner published: keep whatever we last showed
		log.info( 'Banner: none fetched', error.message )

	}

	send( win )

}

const init = win => {

	refresh( win )
	clearInterval( timer )
	timer = setInterval( () => refresh( win ), FOUR_HOURS )

}

// "Later": ask again in a month. The background update is unaffected.
const dismiss = () => {

	preferences.value( 'hidden.bannerSnoozedUntil', Date.now() + SNOOZE_MS )

}

// "Never update": this install stays on CrossOver 3. No announcement, and the
// background update skips v4 (auto-update.js). v3 fixes still arrive.
const never = () => {

	log.info( 'Banner: staying on CrossOver 3' )
	preferences.value( 'hidden.v4Declined', true )

}

let inFlight = false

// Called from the renderer's button. report(message) updates the banner text.
const act = ( report = () => {} ) => {

	const action = current?.action

	if ( !action || inFlight ) {

		return

	}

	const openUrl = url => {

		if ( isSafeUrl( url ) ) {

			shell.openExternal( url )

		}

	}

	if ( action.type === 'update-v4' && support().canUpdateInPlace ) {

		log.info( 'Banner: updating to CrossOver 4' )
		preferences.value( 'hidden.v4Declined', false )
		inFlight = true
		updateToV4( { updater: autoUpdater, url: action.url, openUrl, report, log } )
			.then( outcome => log.info( 'Banner: v4 update', outcome ) )
			.catch( error => log.error( error ) )
			.finally( () => {

				inFlight = false

			} )

		return

	}

	if ( action.url ) {

		openUrl( action.url )
		report( action.type === 'update-v4' ? MESSAGES.opened : null )

	}

}

module.exports = { act, dismiss, init, never, refresh, sanitize, SNOOZE_MS }
