// Via https://github.com/tkambler/electron-preferences
const { app } = require( 'electron' )
const path = require( 'path' )
const { debugInfo, is } = require( 'electron-util' )
const ElectronPreferences = require( 'electron-preferences' )
const { SETTINGS_WINDOW_DEVTOOLS } = require( './config.js' )

const preferences = new ElectronPreferences( {
	// Custom styles
	css: 'src/preferences.css',
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
		},
		mouse: {
			followMouse: [],
			hideOnMouse: '-1',
		},
		app: {
			updates: [ 'updates' ],
			boot: [],
			gpu: [ 'gpu' ],
		},
		keybinds: {
			reset: 'Control+Shift+Alt+R',
			lock: 'Control+Shift+Alt+X',
			center: 'Control+Shift+Alt+C',
			hide: 'Control+Shift+Alt+H',
			// HideHold: 'Control+Shift+Alt+Y',
			duplicate: 'Control+Shift+Alt+D',
			changeDisplay: 'Control+Shift+Alt+M',
			moveUp: 'Control+Shift+Alt+Up',
			moveDown: 'Control+Shift+Alt+Down',
			moveLeft: 'Control+Shift+Alt+Left',
			moveRight: 'Control+Shift+Alt+Right',
			about: 'Control+Shift+Alt+A',
		},
		hidden: {
			frame: false,
			locked: false,
			showSettings: false,
			positionX: null,
			positionY: null,
			test: true,

		},
	},

	browserWindowOverrides: {
		title: 'CrossOver Preferences',
		webPreferences: {
			devTools: is.development && SETTINGS_WINDOW_DEVTOOLS,
		},

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
								help: 'Center sight color',
							},
							// {
							// 	label: 'Custom Crosshair',
							// 	key: 'crosshair',
							// 	type: 'text',
							// 	help: 'What is your last name?'
							// },
							{
								label: 'Reticle',
								key: 'reticle',
								type: 'radio',
								options: [
									{ label: 'Dot', value: 'dot' },
									{ label: 'Cross', value: 'cross' },
									{ label: 'No sight', value: 'off' },
								],
							},
							// {
							// 	label: 'Reticle size',
							// 	key: 'reticleSize',
							// 	type: 'slider',
							// 	min: 1,
							// 	max: 50
							// },
							{
								label: 'Crosshair Size',
								key: 'size',
								type: 'slider',
								min: 1,
								max: 100,
							},
							{
								label: 'Opacity',
								key: 'opacity',
								type: 'slider',
								min: 1,
								max: 100,
							},

						],
					},
				],
			},
		},
		{
			id: 'mouse',
			label: 'Mouse Events',
			icon: 'turtle',
			form: {
				groups: [
					{
						label: 'Mouse Event Hooks (Beta)',
						fields: [
							{
								label: 'Follow mouse:',
								key: 'followMouse',
								type: 'checkbox',
								options: [
									{ label: 'Lock the crosshair to the mouse cursor', value: 'followMouse' },
								],
								help: 'Keeps CrossOver centered on the mouse cursor. This a beta feature, use at your own risk.',
							},
							{
								label: 'Hide crosshair when Aiming Down Sights (ADS):',
								key: 'hideOnMouse',
								type: 'radio',
								options: [
									{ label: 'Never', value: '-1' },
									{ label: 'Right mouse-button', value: '2' },
									{ label: 'Middle mouse-button', value: '3' },
									{ label: 'Left mouse-button', value: '1' },
									{ label: 'Backward mouse-button', value: '4' },
									{ label: 'Forward mouse-button', value: '5' },
								],
								help: 'CrossOver can be hidden while aiming down sights. This is a beta feature, use at your own risk.',
							},
						],
					},
				],
			},
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
									{ label: 'Allow CrossOver to automatically update', value: 'updates' },
								],
								help: 'CrossOver will make a network connection to GitHub.com. No personal data is sent.',
							},
							{
								label: 'Run at startup',
								key: 'system',
								type: 'checkbox',
								options: [
									{ label: 'Start on system boot', value: 'boot' },
								],
								help: 'CrossOver will start when your computer starts.',
							},
							{
								label: 'Hardware acceleration',
								key: 'gpu',
								type: 'checkbox',
								options: [
									{ label: 'Enable hardware acceleration', value: 'gpu' },
								],
								help: 'If you are having issues with FPS, try disabling hardware acceleration. You must restart CrossOver for this to take effect.',
							},
						],
					},
				],
			},
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
								content: '<p>You can clear or disable a keybind completely by using Backspace/Delete. Use <code>CTRL+ALT+SHIFT+R</code> to reset all settings.</p>',
								type: 'message',
							},

							{
								label: 'Lock Crosshair in Place',
								key: 'lock',
								type: 'accelerator',
								help: 'Unlock CrossOver to change settings, then lock the app in place to game.',
							},
							{
								label: 'Center Crosshair',
								key: 'center',
								type: 'accelerator',
								help: 'Center the crosshair window on the current screen.',
							},
							{
								label: 'Toggle Hide Crosshair',
								key: 'hide',
								type: 'accelerator',
								help: 'Hide CrossOver from the screen.',
							},
							// {
							// 	label: 'Hold Hide Crosshair',
							// 	key: 'hideHold',
							// 	type: 'accelerator',
							// 	help: 'Hide CrossOver from the screen while holding down the shortcut.'
							// },
							{
								label: 'Duplicate Crosshair',
								key: 'duplicate',
								type: 'accelerator',
								help: 'Create a duplicate "shadow" crosshair. Settings are not saved for shadow crosshairs.',
							},
							{
								label: 'Change Display',
								key: 'changeDisplay',
								type: 'accelerator',
								help: 'Center CrossOver on the next connected display.',
							},
							// {
							// 	label: 'Reset All Settings',
							// 	key: 'reset',
							// 	type: 'accelerator',
							// 	help: 'Reset all settings to default and center the crosshair.'
							// },
							// {
							// 	label: 'About CrossOver',
							// 	key: 'about',
							// 	type: 'accelerator',
							// 	help: 'Open the "About CrossOver" window for more information.'
							// }
							{
								label: 'Move Up',
								key: 'moveUp',
								type: 'accelerator',
								help: 'Move the crosshair up 1 pixel.',
							},
							{
								label: 'Move Down',
								key: 'moveDown',
								type: 'accelerator',
								help: 'Move the crosshair down 1 pixel.',
							},
							{
								label: 'Move Left',
								key: 'moveLeft',
								type: 'accelerator',
								help: 'Move the crosshair left 1 pixel.',
							},
							{
								label: 'Move Right',
								key: 'moveRight',
								type: 'accelerator',
								help: 'Move the crosshair right 1 pixel.',
							},
						],
					},
				],
			},
		},
		{
			id: 'about',
			label: 'About',
			icon: 'world',
			form: {
				groups: [
					{
						label: '🎯 About CrossOver',
						fields: [

							{
								heading: `CrossOver v${app.getVersion()}`,
								content: `
									<p>A crosshair overlay for any screen.<br /> \
									Feedback and bug reports welcome at <a target="_blank" href="https://github.com/lacymorrow/crossover/issues">lacymorrow/crossover</a>.<br /> \
									Developed by Lacy Morrow. Crosshairs thanks to /u/IrisFlame.</p> \
									<p>Copyright © Lacy Morrow ${new Date().getFullYear()}</p> \
									<p>${debugInfo()}</p> \
								`,
								type: 'message',
							},
						],
					},
				],
			},
		},
	],
} )

module.exports = preferences
