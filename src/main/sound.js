const path = require( 'path' )
const { checkboxTrue } = require( '../config/utils' )
const preferences = require( './electron-preferences.js' )
const windows = require( './windows.js' )
const { __static } = require( './paths' )

const preload = () => {

	windows.win.webContents.send( 'preload_sounds', path.join( __static, 'sounds' ) + path.sep )

}

const play = sound => {

	if ( checkboxTrue( preferences.value( 'app.sounds' ), 'sounds' ) ) {

		windows.win.webContents.send( 'play_sound', sound )

	}

}

const sound = {
	play,
	preload,
}

module.exports = sound
