/* eslint unicorn/prefer-module: 0 */
// Constants
const HOMEPAGE_URL = 'https://lacymorrow.github.io/crossover'
const RELEASES_URL = 'https://github.com/lacymorrow/crossover/releases/latest'
const APP_HEIGHT = 124
const APP_WIDTH = 200
const MAX_SHADOW_WINDOWS = 20
const SETTINGS_WINDOW_DEVTOOLS = true
const SHADOW_WINDOW_OFFSET = 40

const SUPPORTED_IMAGE_FILE_TYPES = [ '.bmp', '.jpg', '.jpeg', 'jfif', 'jfi', 'jif', '.png', '.gif', '.webp' ]

const FILE_FILTERS = [
	{ name: 'Images', extensions: SUPPORTED_IMAGE_FILE_TYPES },
	{ name: 'All Files', extensions: [ '*' ] },
]

module.exports = {
	APP_HEIGHT,
	APP_WIDTH,
	FILE_FILTERS,
	HOMEPAGE_URL,
	RELEASES_URL,
	MAX_SHADOW_WINDOWS,
	SETTINGS_WINDOW_DEVTOOLS,
	SHADOW_WINDOW_OFFSET,

	SUPPORTED_IMAGE_FILE_TYPES,
}
