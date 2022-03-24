// Auto-Update

const { app, dialog, shell } = require( 'electron' )
const log = require( 'electron-log' )
const { autoUpdater } = require( 'electron-updater' )
const { is } = require( 'electron-util' )
const { checkboxTrue } = require( '../config/utils.js' )
const { RELEASES_URL } = require( '../config/config.js' )

const prefs = require( './preferences.js' )

const autoUpdate = () => {

	// Comment this before publishing your first version.
	// It's commented out as it throws an error if there are no published versions.
	if ( checkboxTrue( prefs.value( 'app.updates' ), 'updates' ) ) {

		log.info( 'Setting: Automatic Updates' )
		mainWindow.setProgressBar( 50 / 100 || -1 )

		autoUpdater.logger = log
		autoUpdater.on( 'update-available', () => {

			playSound( 'UPDATE' )
			mainWindow.webContents.send( 'update_available' )

			if ( is.linux ) {

				dialog.showMessageBox( {
					type: 'info',
					title: 'CrossOver Update Available',
					message: '',
					buttons: [ 'Update', 'Ignore' ],
				} ).then( buttonIndex => {

					if ( buttonIndex === 0 ) {

						// AutoUpdater.downloadUpdate()
						shell.openExternal( RELEASES_URL )

					}

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
				mainWindow.setProgressBar( progressObject.percent / 100 || -1 )

			} )

			autoUpdater.on( 'update-downloaded', () => {

				app.dock.setBadge( '!' )
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

module.exports = autoUpdate
