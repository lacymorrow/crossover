/* eslint unicorn/prefer-module: 0 */
const path = require( 'path' )
const { app, shell } = require( 'electron' )
const {
	aboutMenuItem,
	openUrlMenuItem,
	openNewGitHubIssue,
	debugInfo,
} = require( 'electron-util' )

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

			const body = `
<!-- Please succinctly describe your issue and steps to reproduce it. -->


---

${debugInfo()}`

			openNewGitHubIssue( {
				user: 'lacymorrow',
				repo: 'crossover',
				body,
			} )

		},
	},
	aboutMenuItem( {
		icon: path.join( __dirname, 'static', 'Icon.png' ),
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

			shell.moveItemToTrash( path.resolve( app.getPath( 'userData' ), 'preferences.json' ) )
			app.relaunch()
			app.quit()

		},
	},
	{
		label: 'Delete App Data',
		click() {

			shell.moveItemToTrash( app.getPath( 'userData' ) )
			app.relaunch()
			app.quit()

		},
	},
]

module.exports = {
	debugSubmenu,
	helpSubmenu,
}
