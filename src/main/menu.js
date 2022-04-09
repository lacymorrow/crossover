const path = require( 'path' )
const { app, shell, Menu } = require( 'electron' )
const {
	aboutMenuItem,
	openUrlMenuItem,
	openNewGitHubIssue,
	is,
	appMenu,
} = require( 'electron-util' )

const errorHandling = require( './error-handling' )
const dialog = require( './dialog' )
const crossover = require( './crossover' )
const reset = require( './reset' )
const { productName } = require( '../../package.json' )
const windows = require( './windows' )

/* MENU ITEMS */
const closeWindowMenuItem = {
	label: 'Custom Image…',
	accelerator: 'CommandOrControl+W',
	async click() {

		// Open dialog
		windows.closeWindow()

	},
}

const preferencesMenuItems = [
	{
		label: 'Preferences…',
		accelerator: 'CommandOrControl+,',
		click() {

			crossover.openSettingsWindow()

		},
	},
	{
		label: 'Choose Crosshair…',
		accelerator: 'CommandOrControl+.',
		click() {

			crossover.openChooserWindow()

		},
	},
]

const openCustomImageMenuItem = {
	label: 'Custom Image…',
	accelerator: 'CommandOrControl+O',
	async click() {

		// Open dialog
		dialog.openCustomImageDialog()

	},
}

const resetMenuItem = {
	label: 'Reset CrossOver',
	accelerator: 'CommandOrControl+O',
	async click() {

		// Open dialog
		reset.app()

	},
}

const showAppMenuItem = {
	label: `Show ${productName}`,
	accelerator: 'CommandOrControl+O',
	async click() {

		crossover.lockWindow( false )

	},
}

/* SUBMENUS */
const helpSubmenu = [
	openUrlMenuItem( {
		label: 'Learn more about CrossOver',
		url: 'lacymorrow.github.io/crossover',
	} ),
	openUrlMenuItem( {
		label: 'Contribute on GitHub',
		url: 'https://github.com/lacymorrow/crossover',
	} ),
	openUrlMenuItem( {
		label: 'Support the Developer',
		url: 'https://www.patreon.com/lacymorrow',
	} ),
	{
		type: 'separator',
	},
	{
		label: 'Report an Issue…',
		click() {

			openNewGitHubIssue( {
				user: 'lacymorrow',
				repo: 'crossover',
				body: errorHandling.reportBody(),
			} )

		},
	},
	resetMenuItem,
	aboutMenuItem( {
		icon: path.join( __dirname, 'static', 'icon.png' ),
		text: 'Created by Lacy Morrow',
	} ),
]

const debugSubmenu = [
	{
		label: 'Show Preferences File',
		async click() {

			await shell.openPath( path.resolve( app.getPath( 'userData' ), 'preferences.json' ) )

		},
	},
	{
		label: 'Show App Data',
		async click() {

			await shell.openPath( app.getPath( 'userData' ) )

		},
	},
	{
		type: 'separator',
	},
	{
		label: 'Delete Preferences',
		click() {

			shell.trashItem( path.resolve( app.getPath( 'userData' ), 'preferences.json' ) )
			app.relaunch()
			app.quit()

		},
	},
	{
		label: 'Delete App Data',
		click() {

			shell.trashItem( app.getPath( 'userData' ) )
			app.relaunch()
			app.quit()

		},
	},
]

/* TEMPLATES */
const macosTemplate = [
	appMenu( [ ...preferencesMenuItems ] ),
	{
		role: 'fileMenu',
		submenu: [
			openCustomImageMenuItem,
			{
				type: 'separator',
			},
			closeWindowMenuItem,
		],
	},
	{
		role: 'windowMenu',
	},
	{
		role: 'help',
		submenu: helpSubmenu,
	},
]

// Linux and Windows
const otherTemplate = [
	{
		role: 'fileMenu',
		submenu: [
			...preferencesMenuItems,
			openCustomImageMenuItem,
			{
				type: 'separator',
			},
			closeWindowMenuItem,
			{
				role: 'quit',
			},
		],
	},
	{
		role: 'help',
		submenu: helpSubmenu,
	},
]

const init = () => {

	const template = is.macos ? macosTemplate : otherTemplate

	if ( is.development ) {

		template.push( {
			label: 'Debug',
			submenu: debugSubmenu,
		} )

	}

	Menu.setApplicationMenu( Menu.buildFromTemplate( template ) )

}

const menu = {
	init,
	closeWindowMenuItem,
	preferencesMenuItems,
	openCustomImageMenuItem,
	resetMenuItem,
	showAppMenuItem,
}
module.exports = menu
