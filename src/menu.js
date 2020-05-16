'use strict'
const path = require( 'path' )
const { app, Menu, shell, BrowserWindow } = require( 'electron' )
const {
	is,
	appMenu,
	aboutMenuItem,
	openUrlMenuItem,
	openNewGitHubIssue,
	debugInfo
} = require( 'electron-util' )
const { config } = require( './config' )

const showBootLaunch = () => {

	if ( app.getLoginItemSettings().openAtLogin ) {

		console.log( 'Set open at login: true' )
		app.setLoginItemSettings( {
			openAtLogin: false
		} )

	} else {

		console.log( 'Set open at login: false' )
		app.setLoginItemSettings( {
			openAtLogin: true
		} )

	}

}

const showPreferences = () => {

	console.log( 'Show Preferences…' )

}

const moveWindow = direction => {

	const locked = config.get( 'window_locked' )
	if ( !locked ) {

		let newBound
		const mainWindow = BrowserWindow.getAllWindows()[1]
		const bounds = mainWindow.getBounds()
		switch ( direction ) {

			case 'up':
				newBound = bounds.y - 1
				config.set( 'position_y', newBound )
				mainWindow.setBounds( { y: newBound } )
				break
			case 'down':
				newBound = bounds.y + 1
				config.set( 'position_y', newBound )
				mainWindow.setBounds( { y: newBound } )

				break
			case 'left':
				newBound = bounds.x - 1
				config.set( 'position_x', newBound )
				mainWindow.setBounds( { x: newBound } )
				break
			case 'right':
				newBound = bounds.x + 1
				config.set( 'position_x', newBound )
				mainWindow.setBounds( { x: newBound } )
				break
			default:
				break

		}

	}

}

const helpSubmenu = [
	openUrlMenuItem( {
		label: 'Website',
		url: 'https://github.com/lacymorrow/crossover'
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

if ( !is.macos ) {

	helpSubmenu.push(
		{
			type: 'separator'
		},
		aboutMenuItem( {
			icon: path.join( __dirname, 'static', 'Icon.png' ),
			text: 'Created by Lacy Morrow'
		} )
	)

}

const debugSubmenu = [
	{
		label: 'Show Settings',
		click() {

			config.openInEditor()

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
		label: 'Delete Settings',
		click() {

			config.clear()
			app.relaunch()
			app.quit()

		}
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

const macosTemplate = [
	appMenu( [
		{
			label: 'Open at startup',
			type: 'checkbox',
			checked: false,
			click() {

				showBootLaunch()

			}
		},
		{
			label: 'Preferences…',
			accelerator: 'Command+,',
			click() {

				showPreferences()

			}
		}
	] ),
	{
		role: 'fileMenu',
		submenu: [
			{
				label: 'Move Up',
				accelerator: 'Control+Shift+Alt+Up',
				click() {

					moveWindow( 'up' )

				}
			},
			{
				label: 'Move Down',
				accelerator: 'Control+Shift+Alt+Down',
				click() {

					moveWindow( 'down' )

				}
			},
			{
				label: 'Move Left',
				accelerator: 'Control+Shift+Alt+Left',
				click() {

					moveWindow( 'left' )

				}
			},
			{
				label: 'Move Right',
				accelerator: 'Control+Shift+Alt+Right',
				click() {

					moveWindow( 'right' )

				}
			},
			{
				type: 'separator'
			},
			{
				label: 'Close Chooser',
				accelerator: 'Escape',
				click() {

					BrowserWindow.getAllWindows()[0].hide()

				}
			},
			{
				role: 'close'
			}
		]
	},
	{
		role: 'editMenu'
	},
	{
		role: 'viewMenu'
	},
	{
		role: 'windowMenu'
	},
	{
		role: 'help',
		submenu: helpSubmenu
	}
]

// Linux and Windows
const otherTemplate = [
	{
		role: 'fileMenu',
		submenu: [
			{
				label: 'Custom'
			},
			{
				type: 'separator'
			},
			{
				label: 'Settings',
				accelerator: 'Control+,',
				click() {

					showPreferences()

				}
			},
			{
				type: 'separator'
			},
			{
				role: 'quit'
			}
		]
	},
	{
		role: 'editMenu'
	},
	{
		role: 'viewMenu'
	},
	{
		role: 'help',
		submenu: helpSubmenu
	}
]

const template = process.platform === 'darwin' ? macosTemplate : otherTemplate

if ( is.development ) {

	template.push( {
		label: 'Debug',
		submenu: debugSubmenu
	} )

}

module.exports = Menu.buildFromTemplate( template )
