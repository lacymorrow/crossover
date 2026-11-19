const { app, shell } = require( 'electron' )
const { autoUpdater } = require( 'electron-updater' )
const { checkboxTrue } = require( '../config/utils' )
const log = require( './log' )
const preferences = require( './preferences' ).init()
const sound = require( './sound' )
const windows = require( './windows' )
const { is } = require( './util' )
const dialog = require( './dialog' )
const { RELEASES_URL } = require( '../config/config' )
const notification = require( './notification' )
const dock = require( './dock' )
const { hasRunV4, majorOf, v4Support } = require( './v4-support' )
const v4Update = require( './v4-update' )

const FOUR_HOURS = 1000 * 60 * 60 * 4

const install = () => autoUpdater.quitAndInstall()

const onDownloadProgress = progressObject => {

	try {

		let message = 'Download speed: ' + progressObject.bytesPerSecond
		message = message + ' - Downloaded ' + progressObject.percent + '%'
		message = message + ' (' + progressObject.transferred + '/' + progressObject.total + ')'
		log.info( message )

		// Dock progress bar
		windows.setProgress( progressObject.percent / 100 )

	} catch ( error ) {

		log.error( error )

	}

}

const v4Policy = () => ( {
	support: v4Support( {
		isInApplicationsFolder: () => is.macos && app.isInApplicationsFolder(),
	} ),
	rolledBack: hasRunV4( app.getPath( 'userData' ) ),
	declined: preferences.value( 'hidden.v4Declined' ) === true,
	offeredAt: preferences.value( 'hidden.v4OfferedAt' ) || 0,
} )

const onUpdateAvailable = info => {

	try {

		// CrossOver 4 is Latest once it ships. Say nothing on machines that
		// can't run it, or to someone who already tried it and came back.
		const isV4 = majorOf( info?.version ) >= 4
		const policy = isV4 ? v4Policy() : null

		if ( isV4 && ( !policy.support.supported || policy.rolledBack || policy.declined ) ) {

			log.info( 'Update: not offering v4', policy.support.reason, policy.rolledBack ? '(came back from v4)' : '', policy.declined ? '(chose to stay on v3)' : '' )

			return

		}

		// autoDownload is off (see update()); decide here
		if ( !is.linux && v4Update.shouldDownload( { version: info?.version, ...policy } ) ) {

			v4Update.download( autoUpdater ).catch( error => log.error( error ) )

		}

		sound.play( 'UPDATE' )
		windows.win?.webContents.send( 'set_info_icon', 'info' )

		if ( is.linux ) {

			dialog.openUpdateDialog( () => {

				// AutoUpdater.downloadUpdate()
				shell.openExternal( RELEASES_URL )

			} )

		}

	} catch ( error ) {

		log.error( error )

	}

}

const onUpdateDownloaded = () => {

	try {

		windows.setProgress( -1 )
		dock.setBadge( '!' )
		notification( { title: 'CrossOver has been Updated', body: 'Relaunch to take effect' } )
		// sound.play( 'DONE' ) // uncomment if we make notification silent

	} catch ( error ) {

		log.error( error )

	}

}

const update = () => {

	// Comment this before publishing your first version.
	// It's commented out as it throws an error if there are no published versions.

	// We trycatch here because appx throws errors
	try {

		if ( checkboxTrue( preferences.value( 'app.updates' ), 'updates' ) ) {

			log.info( 'Setting: Automatic Updates' )

			autoUpdater.logger = log

			// Every download goes through onUpdateAvailable, which keeps v4 off
			// installs that can't take it (32-bit or ARM Windows 10, portable,
			// Store, macOS outside /Applications, people who came back from v4)
			autoUpdater.autoDownload = false

			// Opted into CrossOver 4 from the banner; v4 ships as a GitHub pre-release
			if ( preferences.value( 'hidden.updateChannel' ) === 'v4' ) {

				autoUpdater.allowPrerelease = true

			}

			autoUpdater.on( 'update-available', autoUpdate.onUpdateAvailable )

			if ( is.linux ) {

				return

			}

			autoUpdater.on( 'download-progress', autoUpdate.onDownloadProgress )

			autoUpdater.on( 'update-downloaded', autoUpdate.onUpdateDownloaded )

			setInterval( () => {

				autoUpdater.checkForUpdates()

			}, FOUR_HOURS )

			autoUpdater.checkForUpdatesAndNotify()

		}

	} catch ( error ) {

		log.error( error )

	}

}

const autoUpdate = {
	install,
	onDownloadProgress,
	onUpdateAvailable,
	onUpdateDownloaded,
	update,
}
module.exports = autoUpdate
