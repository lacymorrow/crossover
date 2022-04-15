module.exports = {
	preload,
	play,
}

const VOLUME = 0.15

/* Cache of Audio elements, for instant playback */
const cache = {}

const sounds = {
	HERO: {
		url: 'hero_decorative-celebration-01.wav',
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
	// },
	RESET: {
		url: 'navigation_selection-complete-celebration.wav',
		volume: VOLUME,
	},
}

function preload( basepath = '' ) {

	let audio
	for ( const name in sounds ) {

		if ( !cache[name] ) {

			cache[name] = new window.Audio()

			const sound = sounds[name]
			audio = cache[name]
			audio.volume = sound.volume
			audio.src = 'file://' + basepath + sound.url

		}

	}

	return audio

}

function play( name ) {

	let audio = cache[name]
	if ( !audio ) {

		audio = preload()

	}

	audio.currentTime = 0
	audio.play()

}
