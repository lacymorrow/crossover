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
	aboutMenuItem( {
		icon: path.join( __dirname, 'static', 'Icon.png' ),
		text: 'Created by Lacy Morrow',
	} ),
]

const debugSubmenu = [ {
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
} ]

const preferencesMenu = [
	{
		label: 'Crosshairs…',
		accelerator: 'CommandOrControl+.',
		click() {

			crossover.openChooserWindow()

		},
	}, {
		label: 'Preferences…',
		accelerator: 'CommandOrControl+,',
		click() {

			crossover.openSettingsWindow()

		},
	},
]

const openCustomImageMenu = {
	label: 'Custom Image…',
	accelerator: 'Command+O',
	async click() {

		// Open dialog
		dialog.openCustomImageDialog()

	},
}

const macosTemplate = [
	appMenu( [
		...preferencesMenu,
		openCustomImageMenu,
	] ),
	{
		role: 'fileMenu',
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
const otherTemplate = [ {
	role: 'fileMenu',
	submenu: [
		...preferencesMenu,
		openCustomImageMenu,
		{
			type: 'separator',
		},
		{
			role: 'quit',
		},
	],
},
{
	role: 'help',
	submenu: helpSubmenu,
} ]

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
}
module.exports = menu
