/*
	Remote banner

	Fetches BANNER_URL (banner.json in the root of the main branch) and shows a small
	banner in the crosshair window while it is unlocked. Edit that file to change the
	message for every install; set "enabled": false to take it down.

	{
		"id": "v4-preview",            // change the id to show a dismissed banner again
		"enabled": true,
		"message": "CrossOver 4 is ready to try.",  // 80 characters max
		"action": {
			"label": "Try it",
			"type": "update-v4",        // or "url"
			"url": "https://github.com/lacymorrow/crossover/releases"
		}
	}

	"update-v4" opts this install into pre-release updates (where v4 is published) and
	downloads it. Installs that can't auto-update open action.url instead.
*/
const https = require( 'https' )
const { shell } = require( 'electron' )
const { autoUpdater } = require( 'electron-updater' )
const { BANNER_URL } = require( '../config/config' )
const { checkboxTrue } = require( '../config/utils' )
const log = require( './log' )
const preferences = require( './preferences' ).init()
const { is } = require( './util' )

const FOUR_HOURS = 1000 * 60 * 60 * 4
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

	if ( action?.type === 'url' && !action.url ) {

		return { id: data.id, message: data.message.slice( 0, MAX_MESSAGE_LENGTH ), action: null }

	}

	return { id: data.id, message: data.message.slice( 0, MAX_MESSAGE_LENGTH ), action }

}

const send = win => {

	if ( !win || win.isDestroyed() ) {

		return

	}

	const dismissed = preferences.value( 'hidden.bannerDismissedId' )
	win.webContents.send( 'set_banner', current && current.id !== dismissed ? current : null )

}

const refresh = async win => {

	if ( !checkboxTrue( preferences.value( 'app.alerts' ), 'alerts' ) ) {

		current = null
		send( win )

		return

	}

	try {

		current = sanitize( await fetchJson( BANNER_URL ) )

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

const dismiss = () => {

	if ( current ) {

		preferences.value( 'hidden.bannerDismissedId', current.id )

	}

}

// NSIS installs on Windows are the only builds electron-updater can update in place
const canAutoUpdate = () => is.windows
	&& !process.windowsStore
	&& !process.env.PORTABLE_EXECUTABLE_DIR
	&& checkboxTrue( preferences.value( 'app.updates' ), 'updates' )

// Returns what the renderer should say next
const act = () => {

	const action = current?.action

	if ( !action ) {

		return null

	}

	if ( action.type === 'update-v4' && canAutoUpdate() ) {

		log.info( 'Banner: opted into v4 updates' )
		preferences.value( 'hidden.updateChannel', 'v4' )
		autoUpdater.allowPrerelease = true
		autoUpdater.checkForUpdates().catch( error => log.error( error ) )

		return 'Downloading CrossOver 4. It installs when you restart.'

	}

	if ( action.url ) {

		shell.openExternal( action.url )

	}

	return null

}

module.exports = { act, dismiss, init, refresh }
