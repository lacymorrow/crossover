const path = require( 'path' )
const { app, shell, Menu } = require( 'electron' )
const {
	aboutMenuItem,
	openUrlMenuItem,
	openNewGitHubIssue,
	is,
	appMenu,
} = require( './util' )
const { TROUBLESHOOTING_URL, COMPATIBILITY_URL } = require( '../config/config' )

const errorHandling = require( './error-handling' )
const dialog = require( './dialog' )
const crossover = require( './crossover' )
const reset = require( './reset' )
const { productName } = require( '../../package.json' )
const windows = require( './windows' )

/* MENU ITEMS */
const closeWindowMenuItem = {
	label: 'Close Window',
	async click() {

		// Open dialog
		windows.closeWindow()

	},
}

const preferencesMenuItems = [
	{
		label: 'Preferences...',
		accelerator: 'CommandOrControl+,',
		click() {

			crossover.openSettingsWindow()

		},
	},
	{
		label: 'Choose Crosshair...',
		click() {

			crossover.openChooserWindow()

		},
	},
]

const openCustomImageMenuItem = {
	label: 'Custom Image...',
	async click() {

		// Open dialog
		dialog.openCustomImageDialog()

	},
}

const resetMenuItem = {
	label: 'Reset CrossOver',
	async click() {

		const { dialog } = require( 'electron' )
		const { response } = await dialog.showMessageBox( {
			type: 'warning',
			buttons: [ 'Cancel', 'Reset' ],
			defaultId: 0,
			cancelId: 0,
			title: 'Reset CrossOver',
			message: 'Are you sure you want to reset all settings?',
			detail:
				'This will remove all customizations and restore default settings. This cannot be undone.',
		} )
		if ( response === 1 ) {

			reset.app()

		}

	},
}

const showAppMenuItem = {
	label: `Show ${productName}`,
	async click() {

		crossover.lockWindow( false )

	},
}

const troubleshootingMenuItem = openUrlMenuItem( {
	label: 'Game Not Working? Troubleshooting Guide',
	url: TROUBLESHOOTING_URL,
} )

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
	troubleshootingMenuItem,
	openUrlMenuItem( {
		label: 'Game Compatibility List',
		url: COMPATIBILITY_URL,
	} ),
	{
		type: 'separator',
	},
	{
		label: 'Report an Issue...',
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
		icon: path.join( __dirname, 'static', 'icons', 'icon.png' ),
		text: 'Created by Lacy Morrow',
	} ),
]

const debugSubmenu = [
	{
		label: 'Show Preferences File',
		async click() {

			await shell.openPath(
				path.resolve( app.getPath( 'userData' ), 'preferences.json' ),
			)

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

			shell.trashItem(
				path.resolve( app.getPath( 'userData' ), 'preferences.json' ),
			)
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
	troubleshootingMenuItem,
}
module.exports = menu
