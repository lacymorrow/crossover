const path = require( 'path' )
const { checkboxTrue } = require( '../config/utils.js' )
const __static = require( './static-path' )

const preloadSounds = () => {

	mainWindow.webContents.send( 'preload_sounds', path.join( __static, 'sounds' ) + path.sep )

}

const playSound = sound => {

	if ( checkboxTrue( prefs.value( 'app.sounds' ), 'sounds' ) ) {

		mainWindow.webContents.send( 'play_sound', sound )

	}

}

module.exports = {
	playSound,
	preloadSounds,
}
