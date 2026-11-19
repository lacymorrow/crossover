/*
	Is this the first launch of a new install?

	Onboarding is for someone who has never seen CrossOver. Before 3.4.10 a
	startup race skipped it for almost everyone (see init.js), so existing
	installs still have hidden.onboardingCompleted = false. Without this check
	the fix would walk every long-time user through the tour.

	The userData folder is created on the first launch and never recreated
	(the preferences file is, on every save), so a folder older than this
	process means the app has run here before.
*/
const fs = require( 'fs' )

const SLACK_MS = 10_000

const isFirstLaunch = ( { birthtimeMs, now = Date.now(), uptimeMs = process.uptime() * 1000 } ) => {

	if ( !Number.isFinite( birthtimeMs ) || birthtimeMs <= 0 ) {

		return true

	}

	return birthtimeMs >= now - uptimeMs - SLACK_MS

}

const firstLaunch = userDataDir => {

	try {

		return isFirstLaunch( { birthtimeMs: fs.statSync( userDataDir ).birthtimeMs } )

	} catch {

		return true

	}

}

module.exports = { firstLaunch, isFirstLaunch }
