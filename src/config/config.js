// Constants
const DEFAULT_THEME = 'dark'
const HOMEPAGE_URL = 'https://lacymorrow.github.io/crossover'
const RELEASES_URL = 'https://github.com/lacymorrow/crossover/releases/latest'
// 16/10: 125x200 16/9: 126x224
const APP_HEIGHT = 126
const APP_WIDTH = 224
// 16/10: 220x352 16/9: 224x356
const APP_HEIGHT_MEDIUM = 224
const APP_WIDTH_MEDIUM = 356
const APP_ASPECT_RATIO = 16 / 9
const MAX_SHADOW_WINDOWS = 20
const SETTINGS_WINDOW_DEVTOOLS = true
const SHADOW_WINDOW_OFFSET = 40

const SUPPORTED_IMAGE_FILE_TYPES = [ '.bmp', '.gif', '.jpg', '.jpeg', 'jfif', 'jfi', 'jif', '.png', '.svg', '.webp' ]

const FILE_FILTERS = [
	{ name: 'Images', extensions: SUPPORTED_IMAGE_FILE_TYPES },
	{ name: 'All Files', extensions: [ '*' ] },
]

module.exports = {
	APP_ASPECT_RATIO,
	APP_HEIGHT,
	APP_WIDTH,
	APP_HEIGHT_MEDIUM,
	APP_WIDTH_MEDIUM,
	DEFAULT_THEME,
	FILE_FILTERS,
	HOMEPAGE_URL,
	RELEASES_URL,
	MAX_SHADOW_WINDOWS,
	SETTINGS_WINDOW_DEVTOOLS,
	SHADOW_WINDOW_OFFSET,

	SUPPORTED_IMAGE_FILE_TYPES,
}
