const { checkboxTrue } = require( '../config/utils.js' )
const prefs = require( './preferences.js' )

const notification = options => {

	if ( checkboxTrue( prefs.value( 'app.notify' ), 'notify' ) ) {

		mainWindow.webContents.send( 'notify', options )

	}

}

module.exports = notification
