const { checkboxTrue } = require( '../config/utils' )
const log = require( './log' )
const preferences = require( './preferences' ).init()
const sound = require( './sound' )
const windows = require( './windows' )
const { shell } = require( 'electron' )
const { is } = require( 'electron-util' )
const { autoUpdater } = require( 'electron-updater' )
const dock = require( './dock' )
const dialog = require( './dialog' )
const { RELEASES_URL } = require( '../config/config' )
const notification = require( './notification' )

const install = () => autoUpdater.quitAndInstall()

const update = () => {

	// Comment this before publishing your first version.
	// It's commented out as it throws an error if there are no published versions.
	if ( checkboxTrue( preferences.value( 'app.updates' ), 'updates' ) ) {

		log.info( 'Setting: Automatic Updates' )
		windows.win.setProgressBar( 50 / 100 || -1 )

		autoUpdater.logger = log
		autoUpdater.on( 'update-available', () => {

			sound.play( 'UPDATE' )
			windows.win.webContents.send( 'update_available' )

			if ( is.linux ) {

				dialog.openUpdateDialog( () => {

					// AutoUpdater.downloadUpdate()
					shell.openExternal( RELEASES_URL )

				} )

			}

		} )

		if ( !is.linux ) {

			autoUpdater.on( 'download-progress', progressObject => {

				let message = 'Download speed: ' + progressObject.bytesPerSecond
				message = message + ' - Downloaded ' + progressObject.percent + '%'
				message = message + ' (' + progressObject.transferred + '/' + progressObject.total + ')'
				log.info( message )

				// Dock progress bar
				windows.win.setProgressBar( progressObject.percent / 100 || -1 )

			} )

			autoUpdater.on( 'update-downloaded', () => {

				dock.setBadge( '!' )
				notification( { title: 'CrossOver has been Updated', body: 'Relaunch to take effect' } )
				// PlaySound( 'DONE' )

			} )
			const FOUR_HOURS = 1000 * 60 * 60 * 4
			setInterval( () => {

				autoUpdater.checkForUpdates()

			}, FOUR_HOURS )

			autoUpdater.checkForUpdatesAndNotify()

		}

	}

}

const autoUpdate = { install, update }
module.exports = autoUpdate
