const { Menu, nativeTheme, Tray } = require( 'electron' )
const { is } = require( 'electron-util' )
const path = require( 'path' )
const { productName } = require( '../../package.json' )
const { preferencesMenuItems, openCustomImageMenuItem } = require( './menu' )
const paths = require( './paths' )

// mac needs dark/light versions
const systemIcon = () => {

	if ( is.macos ) {

		return nativeTheme.shouldUseDarkColors ? 'mac_tray_light@2x.png' : 'mac_tray@2x.png'

	}

	if ( is.windows ) {

		return 'icon.ico'

	}

	return 'icon.png'

}

const icon = path.join(
	paths.__static,
	'icon',
	systemIcon(),
)

const init = () => {

	if ( tray.instance ) {

		return tray.instance

	}

	tray.instance = new Tray( icon )
	const contextMenu = Menu.buildFromTemplate( [
		...preferencesMenuItems,
		openCustomImageMenuItem,

		{ role: 'quit' },
	] )
	tray.instance.setToolTip( productName )
	tray.instance.setContextMenu( contextMenu )

	return tray.instance

}

const tray = {
	init,
	instance: null,
}

module.exports = tray
