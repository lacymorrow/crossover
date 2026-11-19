/*
	CrossOver 4 announcement

	Fetches ANNOUNCEMENT_URL (announcement.json in the root of the main branch)
	and, when there is something to show, opens the announcement window
	(src/renderer/announcement.html). Never inside the crosshair window, and
	never while the crosshair is locked: it waits for the next unlock or launch.
	Edit announcement.json to change which installs see it; set "enabled": false
	to take it down. The window's copy lives in the page.

	3.4.9 and older read banner.json instead, which stays disabled: their gate
	only knew the OS version, so it would offer v4 to 32-bit Windows, Store and
	snap installs, and old Linux. This file is only read by builds that carry
	v4Support() (src/main/v4-support.js), and machines that can't run v4 see
	nothing at all.

	{
		"id": "v4-launch",
		"enabled": true,
		"message": "...",              // 80 characters max, kept for older readers
		"action": {
			"label": "Update",
			"type": "update-v4",        // or "url"
			"url": "https://lacymorrow.github.io/crossover"
		}
	}

	"update-v4" downloads v4 in place where the install allows it (Windows
	installer, macOS in /Applications) and opens action.url everywhere else.

	QA: CROSSOVER_ANNOUNCEMENT_PREVIEW=offer|downloading|ready|failed opens the
	window in that state at launch, ignoring the remote flag and the lock.
	Buttons only close it in preview.
*/
const https = require( 'https' )
const path = require( 'path' )
const { app, BrowserWindow, screen, shell } = require( 'electron' )
const { autoUpdater } = require( 'electron-updater' )
const { ANNOUNCEMENT_URL, HOMEPAGE_URL } = require( '../config/config' )
const { checkboxTrue } = require( '../config/utils' )
const log = require( './log' )
const preferences = require( './preferences' ).init()
const { __renderer } = require( './paths.js' )
const windows = require( './windows' )
const { actionFor, shouldShow } = require( './announcement-logic' )
const { hasRunV4, v4Support } = require( './v4-support' )
const { updateToV4 } = require( './v4-update' )

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
			reject( new Error( `Announcement request failed: ${response.statusCode}` ) )

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

	request.on( 'timeout', () => request.destroy( new Error( 'Announcement request timed out' ) ) )
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

// Only accept the shape we expect; anything else shows nothing
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

const WIDTH = 456
const HEIGHT = 624
const PREVIEW_STATES = new Set( [
	'offer', 'downloading', 'ready', 'failed',
] )

let enabled = false
let win = null
let state = 'offer'
let shownThisSession = false
let backgroundV4Ready = false
let inFlight = false
let previewing = false

const openUrl = url => {

	if ( isSafeUrl( url ) ) {

		shell.openExternal( url )

	}

}

const downloadUrl = () => current?.action?.url || HOMEPAGE_URL

const push = ( next, pct = 0 ) => {

	state = next

	if ( win && !win.isDestroyed() ) {

		win.webContents.send( 'announcement_state', { state, pct } )

	}

}

const close = () => {

	if ( win && !win.isDestroyed() ) {

		win.close()

	}

}

const open = initialState => {

	if ( win && !win.isDestroyed() ) {

		return

	}

	shownThisSession = true
	state = initialState

	// Center on the display the crosshair is on
	const anchor = windows.win && !windows.win.isDestroyed() ? windows.win.getBounds() : null
	const display = anchor ? screen.getDisplayMatching( anchor ) : screen.getPrimaryDisplay()
	const { x, y, width, height } = display.workArea

	win = new BrowserWindow( {
		x: Math.round( x + ( ( width - WIDTH ) / 2 ) ),
		y: Math.round( y + ( ( height - HEIGHT ) / 2 ) ),
		width: WIDTH,
		height: HEIGHT,
		show: false,
		frame: false,
		transparent: true,
		resizable: false,
		maximizable: false,
		minimizable: false,
		fullscreenable: false,
		skipTaskbar: true,
		hasShadow: false,
		title: 'CrossOver 4',
		webPreferences: {
			contextIsolation: true,
			enableRemoteModule: false,
			nodeIntegration: false,
			sandbox: false,
			preload: path.join( __renderer, 'preload.js' ),
		},
	} )

	win.setAlwaysOnTop( true, 'floating' )
	win.on( 'closed', () => {

		win = null

	} )

	const query = initialState === 'downloading' ? { state: initialState, pct: '42' } : { state: initialState }

	win.loadFile( path.join( __renderer, 'announcement.html' ), { query } )
		.then( () => {

			// showInactive: never take focus from a game
			if ( win && !win.isDestroyed() ) {

				win.showInactive()

			}

		} )
		.catch( error => log.error( error ) )

}

const maybeShow = () => {

	if ( !enabled || shownThisSession || win ) {

		return

	}

	const ok = shouldShow( {
		announcement: current,
		supported: support().supported,
		rolledBack: rolledBack(),
		declined: preferences.value( 'hidden.v4Declined' ) === true,
		snoozedUntil: preferences.value( 'hidden.bannerSnoozedUntil' ) || 0,
		locked: preferences.value( 'hidden.locked' ) === true,
		backgroundV4Ready,
	} )

	if ( ok ) {

		open( 'offer' )

	}

}

const refresh = async () => {

	if ( !enabled ) {

		return

	}

	if ( !checkboxTrue( preferences.value( 'app.alerts' ), 'alerts' ) ) {

		current = null

		return

	}

	try {

		current = sanitize( await fetchJson( ANNOUNCEMENT_URL ) )

	} catch ( error ) {

		// Offline or nothing published: keep whatever we had
		log.info( 'Announcement: none fetched', error.message )

	}

	maybeShow()

}

const startUpdate = () => {

	if ( inFlight ) {

		return

	}

	log.info( 'Announcement: updating to CrossOver 4' )
	preferences.value( 'hidden.v4Declined', false )
	inFlight = true
	push( 'downloading', 0 )

	const onProgress = progress => push( 'downloading', progress?.percent )
	autoUpdater.on( 'download-progress', onProgress )

	// openUrl is a no-op here: on failure the window says so and the button opens the page
	updateToV4( { updater: autoUpdater, url: downloadUrl(), openUrl() {}, log } )
		.then( outcome => {

			log.info( 'Announcement: v4 update', outcome )
			push( outcome === 'ready' ? 'ready' : 'failed', 100 )

		} )
		.catch( error => {

			log.error( error )
			push( 'failed' )

		} )
		.finally( () => {

			autoUpdater.removeListener( 'download-progress', onProgress )
			inFlight = false

		} )

}

// A button in the window. The window's own state decides, not the page's.
const handle = channel => {

	if ( previewing ) {

		close()

		return

	}

	const action = actionFor( {
		channel,
		state,
		canUpdateInPlace: support().canUpdateInPlace,
		actionType: current?.action?.type,
	} )

	switch ( action ) {

	case 'start-update':
		startUpdate()
		break

	case 'install':
		autoUpdater.quitAndInstall()
		break

	case 'open-url':
		openUrl( downloadUrl() )
		close()
		break

	case 'snooze':
		// "Later": ask again in a month. The background update is unaffected.
		preferences.value( 'hidden.bannerSnoozedUntil', Date.now() + SNOOZE_MS )
		close()
		break

	case 'decline':
		// "Never update": this install stays on CrossOver 3. No announcement, and the
		// background update skips v4 (auto-update.js). v3 fixes still arrive.
		log.info( 'Announcement: staying on CrossOver 3' )
		preferences.value( 'hidden.v4Declined', true )
		close()
		break

	case 'close':
		close()
		break

	default:

	}

}

// The staged background update finished v4 on its own: it installs on quit, so
// there is nothing left to ask. Not our own button's download.
const onBackgroundV4Downloaded = () => {

	if ( !inFlight ) {

		backgroundV4Ready = true

	}

}

// crossover.lockWindow calls this: a person who unlocks is not mid-game
const onLockChange = () => maybeShow()

const init = ( { approved = false } = {} ) => {

	const preview = process.env.CROSSOVER_ANNOUNCEMENT_PREVIEW

	if ( PREVIEW_STATES.has( preview ) ) {

		previewing = true
		open( preview )

		return

	}

	enabled = approved
	refresh()
	clearInterval( timer )
	timer = setInterval( refresh, FOUR_HOURS )

}

module.exports = { handle, init, onBackgroundV4Downloaded, onLockChange, sanitize, SNOOZE_MS }
