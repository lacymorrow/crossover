/* eslint unicorn/prefer-module: 0 */
const path = require( 'path' )
const { app, shell } = require( 'electron' )
const {
	openUrlMenuItem,
	openNewGitHubIssue,
	debugInfo
} = require( 'electron-util' )

const helpSubmenu = [
	openUrlMenuItem( {
		label: 'Website',
		url: 'https://www.electronjs.org/apps/crossover'
	} ),
	openUrlMenuItem( {
		label: 'Source Code',
		url: 'https://github.com/lacymorrow/crossover'
	} ),
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
				body
			} )

		}
	}
]

const debugSubmenu = [
	{
		label: 'Show Preferences…',
		click() {

			shell.openItem( path.resolve( app.getPath( 'userData' ), 'preferences.json' ) )

		}
	},
	{
		label: 'Show App Data',
		click() {

			shell.openItem( app.getPath( 'userData' ) )

		}
	},
	{
		type: 'separator'
	},
	{
		label: 'Delete App Data',
		click() {

			shell.moveItemToTrash( app.getPath( 'userData' ) )
			app.relaunch()
			app.quit()

		}
	}
]

exports.debugSubmenu = debugSubmenu
exports.helpSubmenu = helpSubmenu
