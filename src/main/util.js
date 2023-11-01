const { api, BrowserWindow, os } = require( 'electron' )
const isDev = require( 'electron-is-dev' )
const { productName } = require( '../../package.json' )

const activeWindow = BrowserWindow.getFocusedWindow()

const debugInfo = () => `
${api.app.getName()} ${api.app.getVersion()}
Electron ${exports.electronVersion}
${process.platform} ${os.release()}
Locale: ${api.app.getLocale()}
`.trim()

const is = {
	macos: process.platform === 'darwin',
	linux: process.platform === 'linux',
	windows: process.platform === 'win32',
	main: process.type === 'browser',
	renderer: process.type === 'renderer',
	development: isDev,
	macAppStore: process.mas === true,
	windowsStore: process.windowsStore === true,
}

const getWindowBoundsCentered = options => {

	options = {
		window: BrowserWindow.getFocusedWindow(),
		...options,
	}

	const currentDisplay = api.screen.getDisplayNearestPoint( api.screen.getCursorScreenPoint() )
	const [ width, height ] = options.window.getSize()
	const windowSize = options.size || { width, height }
	const screenSize = options.useFullBounds
		? currentDisplay.bounds
		: currentDisplay.workArea
	const x = Math.floor( screenSize.x + ( ( screenSize.width / 2 ) - ( windowSize.width / 2 ) ) )
	const y = Math.floor( ( ( screenSize.height + screenSize.y ) / 2 ) - ( windowSize.height / 2 ) )

	return {
		x,
		y,
		width: windowSize.width,
		height: windowSize.height,
	}

}

const newGithubIssueUrl = ( options = {} ) => {

	let repoUrl
	if ( options.repoUrl ) {

		repoUrl = options.repoUrl

	} else if ( options.user && options.repo ) {

		repoUrl = `https://github.com/${options.user}/${options.repo}`

	} else {

		throw new Error( 'You need to specify either the `repoUrl` option or both the `user` and `repo` options' )

	}

	const url = new URL( `${repoUrl}/issues/new` )

	const types = [
		'body',
		'title',
		'labels',
		'template',
		'milestone',
		'assignee',
		'projects',
	]

	for ( const type of types ) {

		let value = options[type]
		if ( value === undefined ) {

			continue

		}

		if ( type === 'labels' || type === 'projects' ) {

			if ( !Array.isArray( value ) ) {

				throw new TypeError( `The \`${type}\` option should be an array` )

			}

			value = value.join( ',' )

		}

		url.searchParams.set( type, value )

	}

	return url.toString()

}

const openNewGitHubIssue = options => {

	const url = newGithubIssueUrl( options )
	api.shell.openExternal( url )

}

const openUrlMenuItem = ( options = {} ) => {

	if ( !options.url ) {

		throw new Error( 'The `url` option is required' )

	}

	const { url } = options
	delete options.url

	const click = ( ...args ) => {

		if ( options.click ) {

			options.click( ...args )

		}

		api.shell.openExternal( url )

	}

	return {
		...options,
		click,
	}

}

const aboutMenuItem = ( options = {} ) => {

	options = {
		title: 'About',
		...options,
	}

	// TODO: When https://github.com/electron/electron/issues/15589 is fixed,
	// handle the macOS case here, so the user doesn't need a conditional
	// when used in a cross-platform app

	return {
		label: `${options.title}`,
		click() {

			exports.showAboutWindow( options )

		},
	}

}

const showAboutWindow = ( options = {} ) => {

	// TODO: When https://github.com/electron/electron/issues/18918 is fixed,
	// these defaults should not need to be set for Linux.
	// TODO: The defaults are standardized here, instead of being set in
	// Electron when https://github.com/electron/electron/issues/23851 is fixed.

	const appName = api.app.getName()
	const appVersion = api.app.getVersion()

	const aboutPanelOptions = {
		applicationName: appName,
		applicationVersion: appVersion,
	}

	if ( options.icon ) {

		aboutPanelOptions.iconPath = options.icon

	}

	if ( options.copyright ) {

		aboutPanelOptions.copyright = options.copyright

	}

	if ( options.text ) {

		aboutPanelOptions.copyright = ( options.copyright || '' ) + '\n\n' + options.text

	}

	if ( options.website ) {

		aboutPanelOptions.website = options.website

	}

	api.app.setAboutPanelOptions( aboutPanelOptions )
	api.app.showAboutPanel()

}

const appMenu = ( menuItems = [] ) => ( {
	label: productName,
	submenu: [
		{
			role: 'about',
		},
		{
			type: 'separator',
		},
		...menuItems,
		{
			type: 'separator',
		},
		{
			role: 'services',
		},
		{
			type: 'separator',
		},
		{
			role: 'hide',
		},
		{
			role: 'hideothers',
		},
		{
			role: 'unhide',
		},
		{
			type: 'separator',
		},
		{
			role: 'quit',
		},
	].filter( Boolean ),
} )

module.exports = {
	is,
	activeWindow,
	debugInfo,
	appMenu,
	aboutMenuItem,
	showAboutWindow,
	openUrlMenuItem,
	openNewGitHubIssue,
	getWindowBoundsCentered,
}
