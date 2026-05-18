const preferences = require( './preferences' ).init()
const log = require( './log' )

const SESSIONS_BEFORE_PROMPT = 5
const LATER_DELAY_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

const shouldShow = () => {

	const state = preferences.value( 'hidden.reviewPromptState' )
	if ( state === 'dismissed' ) {

		return false

	}

	const count = preferences.value( 'hidden.reviewPromptLaunchCount' ) || 0
	if ( count < SESSIONS_BEFORE_PROMPT ) {

		return false

	}

	if ( state === 'later' ) {

		const laterDate = preferences.value( 'hidden.reviewPromptLaterDate' )
		if ( laterDate && Date.now() - new Date( laterDate ).getTime() < LATER_DELAY_MS ) {

			return false

		}

	}

	return true

}

const check = win => {

	const count = ( preferences.value( 'hidden.reviewPromptLaunchCount' ) || 0 ) + 1
	preferences.value( 'hidden.reviewPromptLaunchCount', count )

	if ( !preferences.value( 'hidden.reviewPromptFirstLaunchDate' ) ) {

		preferences.value( 'hidden.reviewPromptFirstLaunchDate', new Date().toISOString() )

	}

	log.info( `Review prompt: session ${count}, state=${preferences.value( 'hidden.reviewPromptState' )}` )

	if ( !shouldShow() ) {

		return

	}

	if ( win && !win.isDestroyed() ) {

		win.webContents.send( 'show_review_prompt' )

	}

}

const dismiss = () => {

	preferences.value( 'hidden.reviewPromptState', 'dismissed' )

}

const later = () => {

	preferences.value( 'hidden.reviewPromptState', 'later' )
	preferences.value( 'hidden.reviewPromptLaterDate', new Date().toISOString() )

}

module.exports = { check, dismiss, later }
