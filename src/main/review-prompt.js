const { shell, dialog } = require( 'electron' )
const log = require( './log' )
const { is } = require( './util' )
const preferences = require( './preferences' ).init()

const STORE_URL = 'ms-windows-store://review/?ProductId=9MTD5ZLN7NL1'
const MIN_LAUNCHES = 5
const MIN_DAYS = 7
const REMIND_LATER_DAYS = 14
const MS_PER_DAY = 1000 * 60 * 60 * 24

const daysSince = timestamp => {

	if ( !timestamp ) {

		return 0

	}

	return ( Date.now() - timestamp ) / MS_PER_DAY

}

const recordLaunch = () => {

	const state = preferences.value( 'hidden.reviewPromptState' ) || 'pending'

	if ( state === 'never' || state === 'done' ) {

		return

	}

	const count = ( preferences.value( 'hidden.reviewPromptLaunchCount' ) || 0 ) + 1
	preferences.value( 'hidden.reviewPromptLaunchCount', count )

	if ( !preferences.value( 'hidden.reviewPromptFirstLaunchDate' ) ) {

		preferences.value( 'hidden.reviewPromptFirstLaunchDate', Date.now() )

	}

}

const shouldShow = () => {

	const state = preferences.value( 'hidden.reviewPromptState' ) || 'pending'

	if ( state === 'never' || state === 'done' ) {

		return false

	}

	// Do not interrupt an active gaming session
	if ( preferences.value( 'hidden.locked' ) ) {

		return false

	}

	const launchCount = preferences.value( 'hidden.reviewPromptLaunchCount' ) || 0

	if ( launchCount < MIN_LAUNCHES ) {

		return false

	}

	const firstLaunchDate = preferences.value( 'hidden.reviewPromptFirstLaunchDate' )

	if ( daysSince( firstLaunchDate ) < MIN_DAYS ) {

		return false

	}

	if ( state === 'later' ) {

		const laterDate = preferences.value( 'hidden.reviewPromptLaterDate' )

		if ( daysSince( laterDate ) < REMIND_LATER_DAYS ) {

			return false

		}

	}

	return true

}

const check = async parentWindow => {

	if ( !is.windows ) {

		return

	}

	recordLaunch()

	if ( !shouldShow() ) {

		return

	}

	try {

		const opts = {
			type: 'info',
			title: 'Enjoying CrossOver?',
			message: 'Rate CrossOver on the Microsoft Store',
			detail: 'Your review helps others discover CrossOver and keeps the app improving. It only takes a moment!',
			buttons: [
				'Rate Now', 'Remind Me Later', 'Never Ask Again',
			],
			defaultId: 0,
			cancelId: 1,
		}

		const { response } = parentWindow
			? await dialog.showMessageBox( parentWindow, opts )
			: await dialog.showMessageBox( opts )

		if ( response === 0 ) {

			preferences.value( 'hidden.reviewPromptState', 'done' )
			await shell.openExternal( STORE_URL )

		} else if ( response === 1 ) {

			preferences.value( 'hidden.reviewPromptState', 'later' )
			preferences.value( 'hidden.reviewPromptLaterDate', Date.now() )

		} else if ( response === 2 ) {

			preferences.value( 'hidden.reviewPromptState', 'never' )

		}

	} catch ( error ) {

		log.error( error )

	}

}

module.exports = { check }
