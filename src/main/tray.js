const { Menu, nativeTheme, Tray } = require( 'electron' )
const { is } = require( 'electron-util' )
const path = require( 'path' )
const { productName } = require( '../../package.json' )
const { preferencesMenu, openCustomImageMenu } = require( './menu' )
const paths = require( './paths' )

// mac needs dark/light versions
const icon = path.join( paths.__static, 'icon', is.windows ? 'icon.ico' : nativeTheme.shouldUseDarkColors ? 'mac_tray_light.png' : 'mac_tray.png' )

const init = () => {

	if ( tray.instance ) {

		return tray.instance

	}

	tray.instance = new Tray( icon )
	const contextMenu = Menu.buildFromTemplate( [
		...preferencesMenu,
		openCustomImageMenu,
		{ role: 'separator' },
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
