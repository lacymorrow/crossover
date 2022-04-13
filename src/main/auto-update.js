const { checkboxTrue } = require( '../config/utils' )
const log = require( './log' )
const preferences = require( './preferences' ).init()
const sound = require( './sound' )
const windows = require( './windows' )
const { shell } = require( 'electron' )
const { is } = require( 'electron-util' )
const { autoUpdater } = require( 'electron-updater' )
const dialog = require( './dialog' )
const { RELEASES_URL } = require( '../config/config' )
const notification = require( './notification' )
const dock = require( './dock' )

const FOUR_HOURS = 1000 * 60 * 60 * 4

const install = () => autoUpdater.quitAndInstall()

const onDownloadProgress = progressObject => {

	let message = 'Download speed: ' + progressObject.bytesPerSecond
	message = message + ' - Downloaded ' + progressObject.percent + '%'
	message = message + ' (' + progressObject.transferred + '/' + progressObject.total + ')'
	log.info( message )

	// Dock progress bar
	windows.setProgress( progressObject.percent / 100 )

}

const onUpdateAvailable = () => {

	sound.play( 'UPDATE' )
	windows.win.webContents.send( 'set_info_icon', 'info' )

	if ( is.linux ) {

		dialog.openUpdateDialog( () => {

			// AutoUpdater.downloadUpdate()
			shell.openExternal( RELEASES_URL )

		} )

	}

}

const onUpdateDownloaded = () => {

	windows.setProgress( -1 )
	dock.setBadge( '!' )
	notification( { title: 'CrossOver has been Updated', body: 'Relaunch to take effect' } )
	// sound.play( 'DONE' ) // uncomment if we make notification silent

}

const update = () => {

	// Comment this before publishing your first version.
	// It's commented out as it throws an error if there are no published versions.

	// We trycatch here because appx throws errors
	try {

		if ( checkboxTrue( preferences.value( 'app.updates' ), 'updates' ) ) {

			log.info( 'Setting: Automatic Updates' )

			autoUpdater.logger = log
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
