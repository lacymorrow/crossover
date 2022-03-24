/* eslint no-useless-concat: 0 */
const path = require( 'path' )
const { app, dialog } = require( 'electron' )
const log = require( 'electron-log' )
const { debugInfo, is, showAboutWindow } = require( 'electron-util' )

const { __static } = require( '../config/config.js' )

const openAboutWindow = () => {

	showAboutWindow( {
		icon: path.join( __static, 'Icon.png' ),
		copyright: `🎯 CrossOver ${app.getVersion()} | Copyright © Lacy Morrow`,
		text: `A crosshair overlay for any screen. Feedback and bug reports welcome. Created by Lacy Morrow. Crosshairs thanks to /u/IrisFlame. ${is.development && ' | ' + debugInfo()} GPU: ${app.getGPUFeatureStatus().gpu_compositing}`,
	} )

}

const openReportCrashDialog = crash => {

	dialog.showMessageBox( {
		title: 'An error occurred',
		message: crash.error.message,
		detail: crash.error.stack,
		type: 'error',
		buttons: [ 'Ignore', 'Report', 'Exit' ],
	} )
		.then( result => {

			if ( result.response === 1 ) {

				crash.submitIssue( 'https://github.com/lacymorrow/crossover/issues/new', {
					title: `Error report for ${crash.versions.app}`,
					body: 'Error:\n```' + crash.error.stack + '\n```\n' + `OS: ${crash.versions.os}`,
				} )

				return

			}

			if ( result.response === 2 ) {

				app.quit()

			}

		} ).catch( log.warn )

}

module.exports = {
	openAboutWindow,
	openReportCrashDialog,
}
