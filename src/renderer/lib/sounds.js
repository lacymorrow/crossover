module.exports = {
	preload,
	play,
}

const VOLUME = 0.15

/* Cache of Audio elements, for instant playback */
const cache = {}

const sounds = {
	RESET: {
		url: 'navigation_selection-complete-celebration.wav',
		volume: VOLUME,
	},
	DONE: {
		url: 'notification_simple-02.wav',
		volume: VOLUME,
	},
	ERROR: {
		url: 'alert_error-03.wav',
		volume: VOLUME,
	},
	CENTER: {
		url: 'navigation-cancel.wav',
		volume: VOLUME,
	},
	UPDATE: {
		url: 'notification_simple-01.wav',
		volume: VOLUME,
	},
	LOCK: {
		url: 'ui_lock.wav',
		volume: VOLUME,
	},
	UNLOCK: {
		url: 'ui_unlock.wav',
		volume: VOLUME,
	},
	// STARTUP: {
	// 	url: 'startup.wav',
	// 	volume: VOLUME * 2
	// }
}

function preload( basepath = '' ) {

	for ( const name in sounds ) {

		if ( !cache[name] ) {

			cache[name] = new window.Audio()

			const sound = sounds[name]
			const audio = cache[name]
			audio.volume = sound.volume
			audio.src = 'file://' + basepath + sound.url

		}

	}

}

function play( name ) {

	const audio = cache[name]
	if ( !audio ) {

		preload()

	}

	audio.currentTime = 0
	audio.play()

}
