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
	defaults: {},
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
								key: 'crosshairColor',
								type: 'color',
								format: 'hex', // Can be hex, hsl or rgb
								help: 'Center sight color'
							},
							{
								label: 'Custom Crosshair',
								key: 'crosshair_image',
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
								key: 'reticle_size',
								type: 'slider',
								min: 1,
								max: 50
							},
							{
								label: 'Crosshair Size',
								key: 'crosshair_size',
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
							}
						]
					}
				]
			}
		},
		{
			id: 'app',
			label: 'App Settings',
			icon: 'preferences',
			form: {
				groups: [
					{
						label: 'Stuff',
						fields: [
							{
								label: 'System start',
								key: 'system',
								type: 'checkbox',
								options: [
									{ label: 'Start on system boot', value: 'system' }
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
								help: 'CrossOver will start when your computer starts.'
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
						label: 'Custom Keybinds',
						fields: [
							{
								label: 'Lock crosshair window',
								key: '',
								type: 'accelerator',
								help: 'What is your phone number?'
							},
							{
								label: 'Foo or Bar?',
								key: 'foobar',
								type: 'radio',
								options: [
									{ label: 'Foo', value: 'foo' },
									{ label: 'Bar', value: 'bar' },
									{ label: 'FooBar', value: 'foobar' }
								],
								help: 'Foo? Bar?'
							}
						]
					}
				]
			}
		}
	]
} )

module.exports = preferences
