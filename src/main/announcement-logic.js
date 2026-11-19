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

/*
	Where the window goes: beside the crosshair, never over it. Tries right,
	left, below, then above the crosshair window, centered on it and kept
	inside the display's work area. Only a display too small for any of those
	gets the centered fallback.

	anchor and workArea are { x, y, width, height }; size is { width, height }.
*/
const placeBeside = ( anchor, workArea, size, gap = 0 ) => {

	const clamp = ( value, min, max ) => Math.round( Math.min( Math.max( value, min ), Math.max( min, max ) ) )
	const maxX = workArea.x + workArea.width - size.width
	const maxY = workArea.y + workArea.height - size.height
	const centered = {
		x: clamp( workArea.x + ( ( workArea.width - size.width ) / 2 ), workArea.x, maxX ),
		y: clamp( workArea.y + ( ( workArea.height - size.height ) / 2 ), workArea.y, maxY ),
	}

	if ( !anchor ) {

		return centered

	}

	const alongY = clamp( anchor.y + ( ( anchor.height - size.height ) / 2 ), workArea.y, maxY )
	const alongX = clamp( anchor.x + ( ( anchor.width - size.width ) / 2 ), workArea.x, maxX )
	const candidates = [
		{ x: anchor.x + anchor.width + gap, y: alongY },
		{ x: anchor.x - gap - size.width, y: alongY },
		{ x: alongX, y: anchor.y + anchor.height + gap },
		{ x: alongX, y: anchor.y - gap - size.height },
	]
	const fits = spot => spot.x >= workArea.x && spot.x <= maxX && spot.y >= workArea.y && spot.y <= maxY
	const spot = candidates.find( candidate => fits( candidate ) )

	return spot ? { x: Math.round( spot.x ), y: Math.round( spot.y ) } : centered

}

module.exports = { actionFor, placeBeside, shouldShow }
