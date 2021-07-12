const electron = require( 'electron' )
const { app } = electron
const path = require( 'path' )
const ElectronPreferences = require( 'electron-preferences' )

const preferences = new ElectronPreferences( {
	/**
	 * Where should preferences be saved?
	 */
	dataStore: path.resolve( app.getPath( 'userData' ), 'preferences.json' ),
	/**
	 * Default values.
	 */
	defaults: {
		crosshair: {
			crosshair: 'static/crosshairs/Actual/leupold-dot.png',
			color: '#FFF83B',
			size: 80,
			opacity: 80,
			reticle: 'dot',
			reticleSize: 80,
			hideOnMouse: false
		},
		app: {
			updates: true,
			boot: false,
			gpu: true
		},
		keybinds: {
			lock: 'Control+Shift+Alt+X'
		},
		advanced: {},
		hidden: {
			frame: false,
			locked: false,
			positionX: null,
			positionY: null,
			test: true

		}
	},

	browserWindowOverrides: {
		title: 'CrossOver Preferences',
		webPreferences: {
			devTools: true
		}

	},
	/**
	 * The preferences window is divided into sections. Each section has a label, an icon, and one or
	 * more fields associated with it. Each section should also be given a unique ID.
	 */
	sections: [
		{
			id: 'crosshair',
			label: 'Crosshair Settings',
			icon: 'vector',
			form: {
				groups: [
					{
						/**
						 * Group heading is optional.
						 */
						label: 'Crosshair Settings',
						fields: [
							{
								label: 'Color',
								key: 'color',
								type: 'color',
								format: 'hex', // Can be hex, hsl or rgb
								help: 'Center sight color'
							},
							{
								label: 'Custom Crosshair',
								key: 'crosshair',
								type: 'text',
								help: 'What is your last name?'
							},
							{
								label: 'Reticle',
								key: 'reticle',
								type: 'radio',
								options: [
									{ label: 'Dot', value: 'dot' },
									{ label: 'Cross', value: 'cross' },
									{ label: 'No sight', value: 'off' }
								]
							},
							{
								label: 'Reticle size',
								key: 'reticleSize',
								type: 'slider',
								min: 1,
								max: 50
							},
							{
								label: 'Crosshair Size',
								key: 'size',
								type: 'slider',
								min: 1,
								max: 100
							},
							{
								label: 'Opacity',
								key: 'opacity',
								type: 'slider',
								min: 1,
								max: 100
							},
							{
								label: 'Mouse Event Hooks',
								key: 'hideOnMouse',
								type: 'checkbox',
								options: [
									{ label: 'Hide crosshair on right-click', value: 'hideOnMouse' }
								],
								help: 'CrossOver be hidden when aiming down sights. This is a beta feature, use at your own risk.'
							}
						]
					}
				]
			}
		},
		{
			id: 'app',
			label: 'System Settings',
			icon: 'preferences',
			form: {
				groups: [
					{
						label: 'System Settings',
						fields: [
							{
								label: 'Automatic Updates',
								key: 'updates',
								type: 'checkbox',
								options: [
									{ label: 'Allow CrossOver to automatically update', value: 'updates' }
								],
								help: 'CrossOver will make a network connection to GitHub.com. No personal data is sent.'
							},
							{
								label: 'Run at startup',
								key: 'system',
								type: 'checkbox',
								options: [
									{ label: 'Start on system boot', value: 'boot' }
								],
								help: 'CrossOver will start when your computer starts.'
							},
							{
								label: 'Hardware acceleration',
								key: 'gpu',
								type: 'checkbox',
								options: [
									{ label: 'Enable hardware acceleration', value: 'gpu' }
								],
								help: 'If you are having issues with FPS, try disabling hardware acceleration.'
							},
							{
								label: 'Read notes from folder',
								key: 'folder',
								type: 'directory',
								help: 'The location where your notes will be stored.'
							},
							{
								heading: 'Important Message',
								content: '<p>The quick brown fox jumps over the long white fence. The quick brown fox jumps over the long white fence. The quick brown fox jumps over the long white fence. The quick brown fox jumps over the long white fence.</p>',
								type: 'message'
							}
						]
					}
				]
			}
		},
		{
			id: 'keybinds',
			label: 'Keybinds',
			icon: 'handout',
			form: {
				groups: [
					{
						label: 'Custom Keybinds (Beta)',
						fields: [
							{
								label: 'Lock Crosshair in Place',
								key: 'lock',
								type: 'accelerator',
								help: 'Unlock CrossOver to change settings, then lock the app in place to game.'
							},
							{
								label: 'Center Crosshair',
								key: 'center',
								type: 'accelerator',
								help: 'Center the crosshair window on the current screen.'
							},
							{
								label: 'Hide Crosshair',
								key: 'hide',
								type: 'accelerator',
								help: 'Hide CrossOver from the screen.'
							},
							{
								label: 'Duplicate Crosshair',
								key: 'duplicate',
								type: 'accelerator',
								help: 'Create a duplicate "shadow" crosshair. Settings are not saved for shadow crosshairs.'
							},
							{
								label: 'Change Display',
								key: 'changeDisplay',
								type: 'accelerator',
								help: 'Center CrossOver on the next connected display.'
							},
							{
								label: 'Reset All Settings',
								key: 'reset',
								type: 'accelerator',
								help: 'Reset all settings to default and center the crosshair.'
							},
							{
								label: 'Move Up',
								key: 'moveUp',
								type: 'accelerator',
								help: 'Move the crosshair up 1 pixel.'
							},
							{
								label: 'Move Down',
								key: 'moveDown',
								type: 'accelerator',
								help: 'Move the crosshair down 1 pixel.'
							},
							{
								label: 'Move Left',
								key: 'moveLeft',
								type: 'accelerator',
								help: 'Move the crosshair left 1 pixel.'
							},
							{
								label: 'Move Right',
								key: 'moveRight',
								type: 'accelerator',
								help: 'Move the crosshair right 1 pixel.'
							},
							{
								label: 'About CrossOver',
								key: 'about',
								type: 'accelerator',
								help: 'Open the "About CrossOver" window for more information.'
							}
						]
					}
				]
			}
		}
	]
} )

module.exports = preferences
