// Constants

// App width/height MUST BE EVEN for followMouse to work
// 16/10: 125x200 16/9: 126x224
const APP_HEIGHT = 130
const APP_WIDTH = 208
// 16/10: 220x352 16/9: 224x356

const DEFAULT_THEME = 'light'
const ALERT_URL = 'https://raw.githubusercontent.com/lacymorrow/crossover/master/CROSSOVER_ALERT'
const HOMEPAGE_URL = 'https://lacymorrow.github.io/crossover'
const RELEASES_URL = 'https://github.com/lacymorrow/crossover/releases/latest'
const APP_ASPECT_RATIO = 16 / 10
const APP_HEIGHT_MEDIUM = 225
const APP_WIDTH_MEDIUM = 360
const APP_BACKGROUND_OPACITY = 0.6
const MAX_SHADOW_WINDOWS = 14
const SETTINGS_WINDOW_DEVTOOLS = true
const SHADOW_WINDOW_OFFSET = 40

const SUPPORTED_IMAGE_FILE_TYPES = [
	'bmp', 'gif', 'jpg', 'jpeg', 'jfif', 'jfi', 'jif', 'png', 'svg', 'webp',
]

const FILE_FILTERS = [
	{ name: 'Images', extensions: SUPPORTED_IMAGE_FILE_TYPES },
	{ name: 'All Files', extensions: [ '*' ] },
]

const config = {
	APP_ASPECT_RATIO,
	APP_BACKGROUND_OPACITY,
	APP_HEIGHT,
	APP_WIDTH,
	APP_HEIGHT_MEDIUM,
	APP_WIDTH_MEDIUM,
	DEFAULT_THEME,
	FILE_FILTERS,
	ALERT_URL,
	HOMEPAGE_URL,
	RELEASES_URL,
	MAX_SHADOW_WINDOWS,
	SETTINGS_WINDOW_DEVTOOLS,
	SHADOW_WINDOW_OFFSET,

	SUPPORTED_IMAGE_FILE_TYPES,
}

module.exports = config
