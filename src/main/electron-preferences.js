// Via https://github.com/tkambler/electron-preferences
const { app } = require( 'electron' )
const path = require( 'path' )
const { debugInfo, is } = require( 'electron-util' )
const ElectronPreferences = require( 'electron-preferences' )
const { DEFAULT_THEME, FILE_FILTERS, SETTINGS_WINDOW_DEVTOOLS, SUPPORTED_IMAGE_FILE_TYPES } = require( '../config/config.js' )

const preferences = new ElectronPreferences( {
	// Custom styles
	css: 'src/renderer/styles/dist/preferences.css',
	/**
     * Where should preferences be saved?
     */
	dataStore: path.resolve( app.getPath( 'userData' ), 'preferences.json' ),
	debug: is.development && !is.linux,

	browserWindowOverrides: {
		title: 'CrossOver Preferences',
		webPreferences: {
			devTools: is.development && SETTINGS_WINDOW_DEVTOOLS,
		},

	},

	/**
     * Default values.
     */
	defaults: {
		crosshair: {
			crosshair: '../static/crosshairs/Actual/leupold-dot.png',
			color: '#FFF83B',
			size: 80,
			opacity: 80,
			reticle: 'dot',
			reticleSize: 80,
		},
		mouse: {
			followMouse: [],
			hideOnMouse: '-1',
			tiltEnable: [],
			tiltToggle: [],
			tiltAngle: 25,
		},
		app: {
			theme: DEFAULT_THEME,
			updates: [ 'updates' ],
			sounds: [ 'sounds' ],
			notify: [ 'notify' ],
			gpu: [ 'gpu' ],
			startUnlocked: [ 'startUnlocked' ],
			boot: [],
		},
		keybinds: {
			reset: 'Control+Shift+Alt+R',
			lock: 'Control+Shift+Alt+X',
			center: 'Control+Shift+Alt+C',
			hide: 'Control+Shift+Alt+H',
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
			tilted: false,
		},
	},
	/**
     * The preferences window is divided into sections. Each section has a label, an icon, and one or
     * more fields associated with it. Each section should also be given a unique ID.
     */
	sections: [ {
		id: 'crosshair',
		label: 'Crosshair Settings',
		icon: 'vector',
		form: {
			groups: [ {
				/**
                     * Group heading is optional.
                     */
				label: 'Crosshair Settings',
				fields: [
					{
						label: 'Select a Crosshair',
						buttonLabel: 'Choose Crosshair',
						key: 'chooseCrosshair',
						type: 'button',
						help: 'Pick from the list of built-in crosshairs',
					},
					{
						buttonLabel: 'Select Custom Image',
						label: 'Custom Crosshair',
						key: 'crosshair',
						type: 'file',
						help: `Use any image as a custom crosshair. Supported file types: ${JSON.stringify( SUPPORTED_IMAGE_FILE_TYPES )}`,
						filters: FILE_FILTERS,
						multiSelections: false, // Allow multiple paths to be selected
						showHiddenFiles: false, // Show hidden files in dialog
						noResolveAliases: false, // (macos) Disable the automatic alias (symlink) path resolution. Selected aliases will now return the alias path instead of their target path.
						treatPackageAsDirectory: false, // (macos) Treat packages, such as .app folders, as a directory instead of a file.
						dontAddToRecent: true, // (windows) Do not add the item being opened to the recent documents list.
					},
					{
						label: 'Color',
						key: 'color',
						type: 'color',
						format: 'hex', // Can be hex, hsl or rgb
						help: 'Center sight color',
					},
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
					//  label: 'Reticle size',
					//  key: 'reticleSize',
					//  type: 'slider',
					//  min: 1,
					//  max: 50
					// },
					{
						label: 'Crosshair Size',
						key: 'size',
						type: 'slider',
						min: 1,
						max: 125,
					},
					{
						label: 'Opacity',
						key: 'opacity',
						type: 'slider',
						min: 1,
						max: 100,
					},
					{
						heading: 'SVG Customization Options',
					},
					{
						label: 'Fill Color',
						key: 'fillColor',
						type: 'color',
						format: 'hex', // Can be hex, hsl or rgb
						help: 'SVG fill, often the background color.',
					},
					{
						label: 'Stroke Color',
						key: 'strokeColor',
						type: 'color',
						format: 'hex', // Can be hex, hsl or rgb
						help: 'SVG stroke color.',
					},
					{
						label: 'Stroke Width',
						key: 'strokeWidth',
						type: 'slider',
						min: 1,
						max: 25,
						help: 'SVG stroke width.',
					},
				],
			} ],
		},
	},
	{
		id: 'mouse',
		label: 'Crosshair Actions',
		icon: 'turtle',
		form: {
			groups: [ {
				label: 'Mouse Actions',
				fields: [ {
					label: 'Follow Mouse',
					key: 'followMouse',
					type: 'checkbox',
					options: [
						{ label: 'Lock the crosshair to the mouse cursor', value: 'followMouse' },
					],
					help: 'Keeps CrossOver centered on the mouse cursor. ',
				},
				{
					label: 'Hide Crosshair on Mouse Button',
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
					help: 'Hides the crosshair when the specified mouse button is held.',
				} ],
			},
			{
				label: 'Keyboard Actions',
				fields: [ {
					label: 'Hide on keypress',
					key: 'hideOnKey',
					type: 'accelerator',
					help: 'Hides the crosshair when the above key is held. Single key only. Delete/Backspace to disable.',
					allowOnlyModifier: true,
				},
				{
					heading: 'Crosshair Tilt Left/Right',
				},
				{
					label: 'Enable Tilt',
					key: 'tiltEnable',
					type: 'checkbox',
					options: [
						{ label: 'Enable tilting left/right on keypress', value: 'tiltEnable' },
					],
					help: 'Crosshair will tilt at an angle while the key is held.',
				},
				{
					label: 'Toggle/Hold to Tilt',
					key: 'tiltToggle',
					type: 'checkbox',
					options: [
						{ label: 'Toggle tilt on/off when pressed (instead of hold)', value: 'tiltToggle' },
					],
					help: 'Keypress toggles tilt on and off i.e. Use toggle-to-tilt instead of hold-to-tilt.',
				},
				{
					label: 'Tilt Left',
					key: 'tiltLeft',
					type: 'accelerator',
					allowOnlyModifier: true,
				},
				{
					label: 'Tilt Right',
					key: 'tiltRight',
					type: 'accelerator',
					allowOnlyModifier: true,
				},
				{
					label: 'Tilt Angle',
					key: 'tiltAngle',
					type: 'slider',
					min: 1,
					max: 90,
				} ],
			} ],
		},
	},
	{
		id: 'keybinds',
		label: 'Keybinds',
		icon: 'handout',
		form: {
			groups: [ {
				label: 'Keyboard Actions',
				fields: [ {
					content: '<p>You can clear or disable a keybind completely by using Backspace/Delete.</p><p>Use <code>CTRL+ALT+SHIFT+R</code> to reset all settings.</p>',
					type: 'message',
				} ],
			},
			{
				label: 'Custom Keybinds',
				fields: [ {
					label: 'Lock Crosshair in Place',
					key: 'lock',
					type: 'accelerator',
					help: 'Unlock CrossOver to change settings, then lock the app in place to game.',
					modifierRequired: true,
				},
				{
					label: 'Center Crosshair',
					key: 'center',
					type: 'accelerator',
					help: 'Center the crosshair window on the current screen.',
					modifierRequired: true,
				},
				{
					label: 'Toggle Hide Crosshair',
					key: 'hide',
					type: 'accelerator',
					help: 'Hide CrossOver from the screen.',
					modifierRequired: true,
				},
				{
					label: 'Duplicate Crosshair',
					key: 'duplicate',
					type: 'accelerator',
					help: 'Create a duplicate "shadow" crosshair. Settings are not saved for shadow crosshairs.',
					modifierRequired: true,
				},
				{
					label: 'Change Display',
					key: 'changeDisplay',
					type: 'accelerator',
					help: 'Center CrossOver on the next connected display.',
					modifierRequired: true,
				},
				// Currently we don't allow changing the Reset shortcut
				// {
				//  label: 'Reset All Settings',
				//  key: 'reset',
				//  type: 'accelerator',
				//  help: 'Reset all settings to default and center the crosshair.'
				// modifierRequired: true,
				// },
				{
					label: 'Move Up',
					key: 'moveUp',
					type: 'accelerator',
					help: 'Move the crosshair up 1 pixel.',
					modifierRequired: true,
				},
				{
					label: 'Move Down',
					key: 'moveDown',
					type: 'accelerator',
					help: 'Move the crosshair down 1 pixel.',
					modifierRequired: true,
				},
				{
					label: 'Move Left',
					key: 'moveLeft',
					type: 'accelerator',
					help: 'Move the crosshair left 1 pixel.',
					modifierRequired: true,
				},
				{
					label: 'Move Right',
					key: 'moveRight',
					type: 'accelerator',
					help: 'Move the crosshair right 1 pixel.',
					modifierRequired: true,
				} ],
			} ],
		},
	},
	{
		id: 'app',
		label: 'System Settings',
		icon: 'preferences',
		form: {
			groups: [ {
				label: 'System Settings',
				fields: [ {
					label: 'Color Scheme',
					key: 'theme',
					type: 'radio',
					options: [
						{ label: 'Light Mode', value: 'light' },
						{ label: 'Dark Mode', value: 'dark' },
						{ label: 'Match the system theme', value: 'system' },
					],
				},
				{
					label: 'Show On App Start',
					key: 'startUnlocked',
					type: 'checkbox',
					options: [
						{ label: 'Unlock and show CrossOver window on startup', value: 'startUnlocked' },
					],
					help: 'This will always unlock CrossOver and show the app window when the app starts. Uncheck to allow CrossOver to start locked.',
				},
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
					label: 'Notifications',
					key: 'notify',
					type: 'checkbox',
					options: [
						{ label: 'Allow CrossOver to create system notifications', value: 'notify' },
					],
					help: 'CrossOver will notify you about any issues or new updates.',
				},
				{
					label: 'Sounds',
					key: 'sounds',
					type: 'checkbox',
					options: [
						{ label: 'Allow CrossOver to play audio', value: 'sounds' },
					],
					help: 'CrossOver makes a little noise to indicate certain events.',
				},
				{
					label: 'Hardware Acceleration',
					key: 'gpu',
					type: 'checkbox',
					options: [
						{ label: 'Enable hardware acceleration', value: 'gpu' },
					],
					help: 'If you are having issues with FPS, try disabling hardware acceleration. You must restart CrossOver for this to take effect.',
				},
				{
					label: 'Run App On System Start',
					key: 'boot',
					type: 'checkbox',
					options: [
						{ label: 'Start on system boot', value: 'boot' },
					],
					help: 'CrossOver will start when your computer starts.',
				},
				{
					label: 'Reset CrossOver Settings',
					buttonLabel: 'Reset Settings',
					key: 'resetApp',
					type: 'button',
					help: 'Reset all settings to default and clear any custom keybinds',
				} ],
			} ],
		},
	},

	{
		id: 'about',
		label: 'About',
		icon: 'world',
		form: {
			groups: [ {
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
									<br/> \
									<p>Looking for a designer!<br />We want to redesign CrossOver, reach out to <a target="_blank" href="mailto:me@lacymorrow.com">me@lacymorrow.com</a> \
									for details.</p>
								`,
						type: 'message',
					},
				],
			} ],
		},
	} ],
} )

module.exports = preferences
