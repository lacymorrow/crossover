const { app } = require( 'electron' )
let WindowsStoreAutoLaunch

// Only load Windows-specific auto-launch on Windows platform
if ( process.platform === 'win32' ) {

	try {

		const module = require( 'electron-winstore-auto-launch' )
		WindowsStoreAutoLaunch = module.WindowsStoreAutoLaunch

	} catch ( error ) {

		console.log( 'Windows Store Auto Launch package not available:', error.message )

	}

}

const init = () => {

	if ( process.platform === 'win32' && WindowsStoreAutoLaunch ) {

		// Use Windows Store auto-launch for Windows Store apps
		try {

			WindowsStoreAutoLaunch.enable()
			console.log( 'Windows Store auto-launch enabled' )

		} catch ( error ) {

			console.log( 'Failed to enable Windows Store auto-launch:', error.message )

		}

	} else {

		// Use Electron's built-in auto-launch for other platforms and Windows desktop apps
		try {

			app.setLoginItemSettings( {
				openAtLogin: true,
				name: 'CrossOver',
			} )
			console.log( 'Auto-launch enabled via Electron API' )

		} catch ( error ) {

			console.log( 'Failed to enable auto-launch:', error.message )

		}

	}

}

const disable = () => {

	if ( process.platform === 'win32' && WindowsStoreAutoLaunch ) {

		try {

			WindowsStoreAutoLaunch.disable()
			console.log( 'Windows Store auto-launch disabled' )

		} catch ( error ) {

			console.log( 'Failed to disable Windows Store auto-launch:', error.message )

		}

	} else {

		try {

			app.setLoginItemSettings( {
				openAtLogin: false,
				name: 'CrossOver',
			} )
			console.log( 'Auto-launch disabled via Electron API' )

		} catch ( error ) {

			console.log( 'Failed to disable auto-launch:', error.message )

		}

	}

}

const getStatus = () => {

	if ( process.platform === 'win32' && WindowsStoreAutoLaunch ) {

		try {

			return WindowsStoreAutoLaunch.getStatus()

		} catch ( error ) {

			console.log( 'Failed to get Windows Store auto-launch status:', error.message )

			return false

		}

	} else {

		try {

			return app.getLoginItemSettings().openAtLogin

		} catch ( error ) {

			console.log( 'Failed to get auto-launch status:', error.message )

			return false

		}

	}

}

const autoLaunch = {
	init,
	disable,
	getStatus,
}

module.exports = autoLaunch
