const { shell, dialog: electronDialog } = require( 'electron' )
const log = require( './log' )
const { TROUBLESHOOTING_URL } = require( '../config/config' )
const preferences = require( './preferences' ).init()

const MIN_LOCKS = 2

const shouldShow = () => {

	const state = preferences.value( 'hidden.helpPromptState' ) || 'pending'

	if ( state !== 'pending' ) {

		return false

	}

	const lockCount = preferences.value( 'hidden.helpPromptLockCount' ) || 0

	return lockCount >= MIN_LOCKS

}

const recordLock = () => {

	const count = ( preferences.value( 'hidden.helpPromptLockCount' ) || 0 ) + 1
	preferences.value( 'hidden.helpPromptLockCount', count )

}

const check = async () => {

	recordLock()

	if ( !shouldShow() ) {

		return

	}

	preferences.value( 'hidden.helpPromptState', 'shown' )

	await electronDialog.showMessageBox( {
		type: 'info',
		title: 'Game Compatibility Tip',
		message: 'Is the crosshair visible in your game?',
		detail: 'Many fullscreen and Vulkan games hide overlays. Switching to Borderless Windowed mode in your game settings usually fixes this. The Troubleshooting Guide has more solutions.',
		buttons: [ 'Open Troubleshooting Guide', 'Got it' ],
		defaultId: 0,
		cancelId: 1,
	} ).then( result => {

		const index = typeof result === 'object' ? result.response : result

		if ( index === 0 ) {

			shell.openExternal( TROUBLESHOOTING_URL ).catch( log.error )

		}

	} ).catch( log.error )

}

module.exports = { check }
