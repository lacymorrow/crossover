/*
	Pure decisions for the CrossOver 4 announcement window (src/main/announcement.js).
	No Electron in here so node --test can run it.
*/

// Show it only when there is something to show and nobody is mid-game
const shouldShow = ( { announcement, supported, rolledBack, declined, snoozedUntil = 0, now = Date.now(), locked, backgroundV4Ready = false } ) => {

	if ( !announcement || !supported || rolledBack || declined || locked || backgroundV4Ready ) {

		return false

	}

	return now >= snoozedUntil

}

/*
	What a button does in a given state. Returns one of:
	start-update, install, open-url, snooze, decline, close, none.
	"open-url", "snooze" and "decline" all close the window afterwards.
*/
const actionFor = ( { channel, state, canUpdateInPlace = false, actionType = 'url' } ) => {

	if ( channel === 'announcement_primary' ) {

		if ( state === 'offer' ) {

			return actionType === 'update-v4' && canUpdateInPlace ? 'start-update' : 'open-url'

		}

		if ( state === 'ready' ) {

			return 'install'

		}

		return state === 'failed' ? 'open-url' : 'none'

	}

	if ( channel === 'announcement_later' ) {

		// Ready installs on quit, downloading carries on: neither needs a snooze
		return state === 'offer' || state === 'failed' ? 'snooze' : 'close'

	}

	if ( channel === 'announcement_never' ) {

		return state === 'offer' || state === 'failed' ? 'decline' : 'close'

	}

	return 'none'

}

module.exports = { actionFor, shouldShow }
