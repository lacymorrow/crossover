const { app } = require( 'electron' )
const { is } = require( 'electron-util' )

// MacOS only, dock badge
const setBadge = text => app?.dock?.setBadge( String( text ) )

// Hides the app from the dock and CMD+Tab, necessary for staying on top macOS fullscreen windows
const setVisible = visible => {

	if ( is.macos ) {

		if ( visible ) {

			app.dock.show()

		} else {

			app.dock.hide()

		}

	}

}

const dock = {
	setBadge,

	setVisible,
}

module.exports = dock
