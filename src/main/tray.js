const { Menu, Tray } = require( 'electron' )
const { is, aboutMenuItem } = require( './util' )
const path = require( 'path' )
const log = require( './log' )
const { preferencesMenuItems, openCustomImageMenuItem, resetMenuItem, showAppMenuItem } = require( './menu' )
const paths = require( './paths' )
const { productName } = require( '../../package.json' )

// mac needs dark/light versions
const systemIcon = () => {

	if ( is.macos ) {

		// icon needs to be in format 'xxxTemplate' to work with system theme on mac
		return 'tray-Template.png'

	}

	if ( is.windows ) {

		return 'icon.ico'

	}

	return 'icon.png'

}

const getIconPath = () => path.join(
	paths.__static,
	'icons',
	systemIcon(),
)

const init = () => {

	if ( tray.instance ) {

		return tray.instance

	}

	tray.instance = new Tray( getIconPath() )

	const contextMenu = Menu.buildFromTemplate( [
		aboutMenuItem(),
		showAppMenuItem,
		...preferencesMenuItems,
		openCustomImageMenuItem,
		resetMenuItem,
		{ role: 'quit' },
	] )
	tray.instance.setToolTip( `${productName} Control` )
	tray.instance.setContextMenu( contextMenu )

	return tray.instance

}

const setIcon = () => {

	const icon = getIconPath()
	tray.setImage( icon )
	log.info( `Setting tray icon: ${icon}` )

}

const tray = {
	init,
	instance: null,
	setIcon,
}

module.exports = tray
