/* eslint no-useless-concat: 0 */
const path = require( 'path' )
const { app, dialog: electronDialog, shell } = require( 'electron' )
const log = require( 'electron-log' )
const { debugInfo, is, showAboutWindow } = require( './util' )

const { FILE_FILTERS } = require( '../config/config.js' )
const set = require( './set.js' )
const notification = require( './notification.js' )
const { __static } = require( './paths.js' )

const validButtonIndex = result => {

	if ( typeof result === 'object' && typeof result.response === 'number' ) {

		return result.response

	}

	return result

}

const openAboutWindow = () => {

	showAboutWindow( {
		icon: path.join( __static, 'icons', 'icon.png' ),
		copyright: `🎯 CrossOver ${app.getVersion()} | Copyright © Lacy Morrow`,
		text: `A crosshair overlay for any screen. Feedback and bug reports welcome. Created by Lacy Morrow. Crosshairs thanks to /u/IrisFlame. ${is.development && ' | ' + debugInfo()} GPU: ${app.getGPUFeatureStatus().gpu_compositing}`,
	} )

}

const openCustomImageDialog = async () => {

	await electronDialog.showOpenDialog( {
		title: 'Select Custom Image',
		message: 'Choose an image file to load into CrossOver',
		filters: FILE_FILTERS,
		properties: [ 'openFile', 'dontAddToRecent' ],
	} ).then( result => {

		const image = result.filePaths?.[0]

		if ( image ) {

			set.custom( image )

			notification( { title: 'Crosshair Changed', body: 'Your custom crosshair was loaded.' } )

		}

	} ).catch( log.info )

}

const openReportCrashDialog = async crash => {

	await electronDialog.showMessageBox( {
		title: 'An error occurred',
		message: crash.error.message,
		detail: crash.error.stack,
		type: 'error',
		buttons: [
			'Ignore', 'Report', 'Exit',
		],
	} )
		.then( result => {

			const buttonIndex = validButtonIndex( result )

			if ( buttonIndex === 1 ) {

				crash.submitIssue( 'https://github.com/lacymorrow/crossover/issues/new', {
					title: `Error report for ${crash.versions.app}`,
					body: 'Error:\n```' + crash.error.stack + '\n```\n' + `OS: ${crash.versions.os}`,
				} )

				return

			}

			if ( buttonIndex === 2 ) {

				app.quit()

			}

		} ).catch( log.warn )

}

const openUpdateDialog = async action => {

	await electronDialog.showMessageBox( {
		type: 'info',
		title: 'CrossOver Update Available',
		message: '',
		buttons: [ 'Update', 'Ignore' ],
	} ).then( result => {

		const buttonIndex = validButtonIndex( result )
		if ( buttonIndex === 0 && typeof action === 'function' ) {

			action()

		}

	} )

}

const openAccessibilityDialog = async () => {

	await electronDialog.showMessageBox( {
		type: 'info',
		title: 'Accessibility Permission Required',
		message: 'CrossOver needs accessibility permissions to capture global mouse and keyboard events.',
		detail: 'This enables features like:\n• Mouse follow mode\n• Hide crosshair on mouse/key press\n• Resize crosshair when aiming\n• Tilt crosshair controls\n\nGo to System Preferences > Security & Privacy > Accessibility and check the box next to CrossOver.',
		buttons: [ 'Open System Preferences', 'Skip' ],
	} ).then( result => {

		const buttonIndex = validButtonIndex( result )

		if ( buttonIndex === 0 ) {

			return shell.openExternal( 'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility' )

		}

	} )

}

const dialog = {
	openAboutWindow,
	openAccessibilityDialog,
	openCustomImageDialog,
	openReportCrashDialog,
	openUpdateDialog,
}

module.exports = dialog
